import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';
import * as xlsx from 'xlsx';
import db, { getWatchConfig, saveWatchConfig } from './db';

// Ensure unique indices exist for native SQLite upsert on conflict
db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_results_student_subject_term_session ON results(student_id, subject, term, session);
`);

// Shared in-memory flag to pause watcher triggers during manual appends
export const isWriting: { [key: string]: boolean } = {
  students: false,
  teachers: false,
  attendance: false,
  results: false
};

const watchers: { [key: string]: any | null } = {
  students: null,
  teachers: null,
  attendance: null,
  results: null
};

const debouncers: { [key: string]: NodeJS.Timeout | null } = {
  students: null,
  teachers: null,
  attendance: null,
  results: null
};

export function parseAndSyncFile(type: 'students' | 'teachers' | 'attendance' | 'results', filePath: string) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`Sync skipped: File not found at ${filePath}`);
      return;
    }

    console.log(`[Sync Engine] Parsing and syncing ${type} from ${filePath}...`);
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawRows = xlsx.utils.sheet_to_json(worksheet) as any[];

    let importedCount = 0;
    const errors: string[] = [];

    db.transaction(() => {
      if (type === 'students') {
        const insertStmt = db.prepare(`
          INSERT INTO students (student_id, first_name, last_name, class, gender, attendance_rate, parent_name, parent_phone, is_demo)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
          ON CONFLICT(student_id) DO UPDATE SET
            first_name=excluded.first_name,
            last_name=excluded.last_name,
            class=excluded.class,
            gender=excluded.gender,
            parent_name=excluded.parent_name,
            parent_phone=excluded.parent_phone,
            is_demo=0
        `);

        for (const row of rawRows) {
          try {
            const { student_id, first_name, last_name, class: className, gender, parent_name, parent_phone } = row;
            if (!student_id || !first_name || !last_name || !className || !gender) {
              errors.push(`Row missing required fields: ${JSON.stringify(row)}`);
              continue;
            }
            // If attendance_rate is in row, use it; otherwise default to 100.0 or compute it
            const attRate = row.attendance_rate !== undefined ? Number(row.attendance_rate) : 100.0;
            insertStmt.run(
              String(student_id),
              String(first_name),
              String(last_name),
              String(className),
              String(gender),
              attRate,
              parent_name ? String(parent_name) : 'N/A',
              parent_phone ? String(parent_phone) : 'N/A'
            );
            importedCount++;
          } catch (err: any) {
            errors.push(`Row sync error: ${err.message}`);
          }
        }
      } else if (type === 'teachers') {
        const insertStmt = db.prepare(`
          INSERT INTO teachers (teacher_id, first_name, last_name, subject, workload, is_demo)
          VALUES (?, ?, ?, ?, ?, 0)
          ON CONFLICT(teacher_id) DO UPDATE SET
            first_name=excluded.first_name,
            last_name=excluded.last_name,
            subject=excluded.subject,
            workload=excluded.workload,
            is_demo=0
        `);

        for (const row of rawRows) {
          try {
            const { teacher_id, first_name, last_name, subject } = row;
            if (!teacher_id || !first_name || !last_name || !subject) {
              errors.push(`Row missing required fields: ${JSON.stringify(row)}`);
              continue;
            }
            const workload = row.workload !== undefined ? Number(row.workload) : 15;
            insertStmt.run(String(teacher_id), String(first_name), String(last_name), String(subject), workload);
            importedCount++;
          } catch (err: any) {
            errors.push(`Row sync error: ${err.message}`);
          }
        }
      } else if (type === 'attendance') {
        const insertStmt = db.prepare(`
          INSERT INTO attendance (student_id, date, status, is_demo)
          VALUES (?, ?, ?, 0)
          ON CONFLICT(student_id, date) DO UPDATE SET
            status=excluded.status,
            is_demo=0
        `);

        for (const row of rawRows) {
          try {
            const { student_id, date, status } = row;
            // Validate required fields - skip and log malformed rows instead of crashing
            if (!student_id || !date || !status) {
              errors.push(`Skipped malformed attendance row: ${JSON.stringify(row)}`);
              continue;
            }
            insertStmt.run(String(student_id), String(date), String(status));
            importedCount++;
          } catch (err: any) {
            errors.push(`Attendance row error: ${err.message}`);
          }
        }
      } else if (type === 'results') {
        const insertStmt = db.prepare(`
          INSERT INTO results (student_id, subject, term, session, score, grade, is_demo)
          VALUES (?, ?, ?, ?, ?, ?, 0)
          ON CONFLICT(student_id, subject, term, session) DO UPDATE SET
            score=excluded.score,
            grade=excluded.grade,
            is_demo=0
        `);

        for (const row of rawRows) {
          try {
            const { student_id, subject, term, session, score, grade } = row;
            if (!student_id || !subject || !term || !session || score === undefined || !grade) {
              errors.push(`Skipped malformed results row: ${JSON.stringify(row)}`);
              continue;
            }
            insertStmt.run(
              String(student_id),
              String(subject),
              String(term),
              String(session),
              Number(score),
              String(grade)
            );
            importedCount++;
          } catch (err: any) {
            errors.push(`Results row error: ${err.message}`);
          }
        }
      }
    })();

    // Update config
    const config = getWatchConfig();
    config[type].uploaded = true;
    config[type].filePath = filePath;
    config[type].lastSynced = new Date().toISOString();
    saveWatchConfig(config);

    console.log(`[Sync Engine] Completed ${type} sync. Rows: ${importedCount}, Errors: ${errors.length}`);
    return { rowsImported: importedCount, errors };
  } catch (err: any) {
    console.error(`[Sync Engine] Error syncing ${type}:`, err);
    return { rowsImported: 0, errors: [err.message] };
  }
}

export function startWatchingFile(type: 'students' | 'teachers' | 'attendance' | 'results', filePath: string) {
  // If there's an existing watcher, close it
  if (watchers[type]) {
    watchers[type]!.close();
  }

  console.log(`[Sync Engine] Starting background watch on: ${filePath}`);
  const watcher = chokidar.watch(filePath, { persistent: true });

  watcher.on('change', () => {
    // Check pause flag
    if (isWriting[type]) {
      console.log(`[Sync Engine] Ignored change on ${type} file (writing in progress)`);
      return;
    }

    // Debounce triggers by 1.5s
    if (debouncers[type]) {
      clearTimeout(debouncers[type]!);
    }

    debouncers[type] = setTimeout(() => {
      console.log(`[Sync Engine] Debounce expired, starting auto re-sync for ${type}...`);
      parseAndSyncFile(type, filePath);
    }, 1500);
  });

  watchers[type] = watcher;
}

// Read configuration on startup and resume watchers
export function initWatchers() {
  const config = getWatchConfig();
  const keys: ('students' | 'teachers' | 'attendance' | 'results')[] = ['students', 'teachers', 'attendance', 'results'];
  
  for (const k of keys) {
    if (config[k].uploaded && config[k].filePath && fs.existsSync(config[k].filePath)) {
      startWatchingFile(k, config[k].filePath);
    }
  }
}
