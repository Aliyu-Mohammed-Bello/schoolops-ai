import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const dbPath = path.join(DB_DIR, 'schoolops.db');
const db = new Database(dbPath);

// Enable WAL mode for performance
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    class TEXT NOT NULL,
    gender TEXT NOT NULL,
    attendance_rate REAL NOT NULL,
    parent_name TEXT NOT NULL,
    parent_phone TEXT NOT NULL,
    is_demo INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    workload INTEGER NOT NULL,
    is_demo INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL,
    is_demo INTEGER DEFAULT 0,
    FOREIGN KEY(student_id) REFERENCES students(student_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    term TEXT NOT NULL,
    session TEXT NOT NULL,
    score INTEGER NOT NULL,
    grade TEXT NOT NULL,
    is_demo INTEGER DEFAULT 0,
    FOREIGN KEY(student_id) REFERENCES students(student_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS timetable_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_name TEXT NOT NULL,
    day TEXT NOT NULL,
    period INTEGER NOT NULL,
    teacher_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    FOREIGN KEY(teacher_id) REFERENCES teachers(teacher_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS curriculum (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class TEXT NOT NULL,
    subject TEXT NOT NULL,
    is_double_period INTEGER DEFAULT 0,
    periods_per_week INTEGER DEFAULT 1,
    UNIQUE(class, subject)
  );
`);

// Setup config persistence
const configPath = path.join(DB_DIR, 'watch-config.json');
export interface WatchConfigItem {
  uploaded: boolean;
  filePath: string | null;
  lastSynced: string | null;
}

export interface WatchConfig {
  students: WatchConfigItem;
  teachers: WatchConfigItem;
  attendance: WatchConfigItem;
  results: WatchConfigItem;
}

const defaultWatcherConfig: WatchConfig = {
  students: { uploaded: false, filePath: null, lastSynced: null },
  teachers: { uploaded: false, filePath: null, lastSynced: null },
  attendance: { uploaded: false, filePath: null, lastSynced: null },
  results: { uploaded: false, filePath: null, lastSynced: null }
};

export function getWatchConfig(): WatchConfig {
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify(defaultWatcherConfig, null, 2));
    return defaultWatcherConfig;
  }
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    return defaultWatcherConfig;
  }
}

export function saveWatchConfig(config: WatchConfig) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Seeding logic
export function seedDatabase() {
  const config = getWatchConfig();
  
  // Seed Students & Attendance if students not uploaded
  const studentCount = db.prepare('SELECT COUNT(*) as count FROM students').get() as { count: number };
  if (studentCount.count === 0 && !config.students.uploaded) {
    console.log('Seeding demo student records...');
    
    const demoStudents = [
      { student_id: 'STU001', first_name: 'David', last_name: 'Adeleke', class: 'SSS3', gender: 'Male', attendance_rate: 94.0, parent_name: 'Adewale Adeleke', parent_phone: '08031234567' },
      { student_id: 'STU002', first_name: 'Chinedu', last_name: 'Okeke', class: 'SSS3', gender: 'Male', attendance_rate: 88.0, parent_name: 'Obinna Okeke', parent_phone: '08032345678' },
      { student_id: 'STU003', first_name: 'Aisha', last_name: 'Bello', class: 'SSS2', gender: 'Female', attendance_rate: 96.0, parent_name: 'Bello Mohammed', parent_phone: '08033456789' },
      { student_id: 'STU004', first_name: 'Fatima', last_name: 'Ibrahim', class: 'SSS1', gender: 'Female', attendance_rate: 92.0, parent_name: 'Ibrahim Yusuf', parent_phone: '08034567890' },
      { student_id: 'STU005', first_name: 'Oluwaseun', last_name: 'Salami', class: 'JSS3', gender: 'Male', attendance_rate: 65.0, parent_name: 'Michael Salami', parent_phone: '08035678901' },
      { student_id: 'STU006', first_name: 'Blessing', last_name: 'Nwachukwu', class: 'JSS3', gender: 'Female', attendance_rate: 98.0, parent_name: 'Peter Nwachukwu', parent_phone: '08036789012' },
      { student_id: 'STU007', first_name: 'Tunde', last_name: 'Bakare', class: 'JSS2', gender: 'Male', attendance_rate: 72.0, parent_name: 'Festus Bakare', parent_phone: '08037890123' },
      { student_id: 'STU008', first_name: 'Chioma', last_name: 'Eze', class: 'JSS1', gender: 'Female', attendance_rate: 85.0, parent_name: 'Emeka Eze', parent_phone: '08038901234' },
      { student_id: 'STU009', first_name: 'Musa', last_name: 'Garba', class: 'JSS1', gender: 'Male', attendance_rate: 90.0, parent_name: 'Garba Shehu', parent_phone: '08039012345' },
      { student_id: 'STU010', first_name: 'Emeka', last_name: 'Opara', class: 'SSS2', gender: 'Male', attendance_rate: 58.0, parent_name: 'John Opara', parent_phone: '08030123456' },
      { student_id: 'STU011', first_name: 'Yetunde', last_name: 'Oni', class: 'SSS2', gender: 'Female', attendance_rate: 95.0, parent_name: 'Kunle Oni', parent_phone: '08031123456' },
      { student_id: 'STU012', first_name: 'Kabiru', last_name: 'Aminu', class: 'SSS1', gender: 'Male', attendance_rate: 89.0, parent_name: 'Aminu Dantata', parent_phone: '08032234567' },
      { student_id: 'STU013', first_name: 'Amara', last_name: 'Obi', class: 'JSS2', gender: 'Female', attendance_rate: 91.0, parent_name: 'Chidi Obi', parent_phone: '08033345678' },
      { student_id: 'STU014', first_name: 'Ngozi', last_name: 'Okonkwo', class: 'JSS1', gender: 'Female', attendance_rate: 60.0, parent_name: 'Linus Okonkwo', parent_phone: '08034456789' },
      { student_id: 'STU015', first_name: 'Femi', last_name: 'Balogun', class: 'JSS3', gender: 'Male', attendance_rate: 93.0, parent_name: 'Segun Balogun', parent_phone: '08035567890' }
    ];

    const insertStudent = db.prepare(`
      INSERT OR IGNORE INTO students 
      (student_id, first_name, last_name, class, gender, attendance_rate, parent_name, parent_phone, is_demo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    for (const s of demoStudents) {
      insertStudent.run(s.student_id, s.first_name, s.last_name, s.class, s.gender, s.attendance_rate, s.parent_name, s.parent_phone);
    }
  }

  // Seed Teachers if teachers not uploaded
  const teacherCount = db.prepare('SELECT COUNT(*) as count FROM teachers').get() as { count: number };
  if (teacherCount.count === 0 && !config.teachers.uploaded) {
    console.log('Seeding demo teacher records...');
    
    const demoTeachers = [
      { teacher_id: 'TCH001', first_name: 'John', last_name: 'Doe', subject: 'Mathematics', workload: 18 },
      { teacher_id: 'TCH002', first_name: 'Sarah', last_name: 'Smith', subject: 'English', workload: 16 },
      { teacher_id: 'TCH003', first_name: 'Ahmed', last_name: 'Yusuf', subject: 'Physics', workload: 14 },
      { teacher_id: 'TCH004', first_name: 'Grace', last_name: 'Benson', subject: 'Chemistry', workload: 15 },
      { teacher_id: 'TCH005', first_name: 'Alice', last_name: 'Johnson', subject: 'Basic Science', workload: 12 },
      { teacher_id: 'TCH006', first_name: 'Bob', last_name: 'Williams', subject: 'Basic Technology', workload: 10 },
      { teacher_id: 'TCH007', first_name: 'Charles', last_name: 'Obi', subject: 'Social Studies', workload: 14 },
      { teacher_id: 'TCH008', first_name: 'Daniel', last_name: 'Egwu', subject: 'Biology', workload: 16 },
      { teacher_id: 'TCH009', first_name: 'Evelyn', last_name: 'Azikiwe', subject: 'Further Mathematics', workload: 12 }
    ];

    const insertTeacher = db.prepare(`
      INSERT OR IGNORE INTO teachers (teacher_id, first_name, last_name, subject, workload, is_demo)
      VALUES (?, ?, ?, ?, ?, 1)
    `);

    for (const t of demoTeachers) {
      insertTeacher.run(t.teacher_id, t.first_name, t.last_name, t.subject, t.workload);
    }
  }

  // Seed Attendance if attendance not uploaded
  const attCount = db.prepare('SELECT COUNT(*) as count FROM attendance').get() as { count: number };
  if (attCount.count === 0 && !config.attendance.uploaded) {
    console.log('Seeding demo attendance records...');
    
    const dates = ['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04', '2026-06-05'];
    const students = db.prepare('SELECT student_id, attendance_rate FROM students').all() as { student_id: string, attendance_rate: number }[];
    
    const insertAtt = db.prepare(`
      INSERT INTO attendance (student_id, date, status, is_demo)
      VALUES (?, ?, ?, 1)
    `);

    for (const s of students) {
      for (const d of dates) {
        // determine status based on individual attendance rate
        let status = 'present';
        const rand = Math.random() * 100;
        if (rand > s.attendance_rate) {
          status = Math.random() > 0.5 ? 'absent' : 'late';
        }
        insertAtt.run(s.student_id, d, status);
      }
    }
  }

  // Seed Results if results not uploaded
  const resCount = db.prepare('SELECT COUNT(*) as count FROM results').get() as { count: number };
  if (resCount.count === 0 && !config.results.uploaded) {
    console.log('Seeding demo results...');
    
    const subjects = ['Mathematics', 'English', 'Physics', 'Chemistry'];
    const students = db.prepare('SELECT student_id, class FROM students').all() as { student_id: string, class: string }[];
    
    const insertResult = db.prepare(`
      INSERT INTO results (student_id, subject, term, session, score, grade, is_demo)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);

    const getGrade = (score: number) => {
      if (score >= 80) return 'A';
      if (score >= 70) return 'B';
      if (score >= 60) return 'C';
      if (score >= 50) return 'D';
      return 'F';
    };

    for (const s of students) {
      // SSS classes do all subjects, JSS classes do Maths and English
      const subs = s.class.startsWith('SSS') ? subjects : ['Mathematics', 'English'];
      for (const sub of subs) {
        // generate a realistic score
        let baseScore = 55 + Math.floor(Math.random() * 40);
        if (s.student_id === 'STU005' || s.student_id === 'STU010') {
          // struggling students
          baseScore = 35 + Math.floor(Math.random() * 25);
        }
        insertResult.run(s.student_id, sub, 'Term 1', '2025/2026', baseScore, getGrade(baseScore));
      }
    }
  }

  // Seed Curriculum if curriculum not populated
  const currCount = db.prepare('SELECT COUNT(*) as count FROM curriculum').get() as { count: number };
  if (currCount.count === 0) {
    console.log('Seeding demo curriculum...');
    const insertCurr = db.prepare(`
      INSERT OR IGNORE INTO curriculum (class, subject, is_double_period, periods_per_week)
      VALUES (?, ?, ?, ?)
    `);

    const jssClasses = ['JSS1', 'JSS2', 'JSS3'];
    const sssClasses = ['SSS1', 'SSS2', 'SSS3'];

    // JSS subjects
    const jssSubjects = [
      { subject: 'Mathematics', is_double_period: 1, periods_per_week: 2 },
      { subject: 'English', is_double_period: 0, periods_per_week: 2 },
      { subject: 'Basic Science', is_double_period: 1, periods_per_week: 2 },
      { subject: 'Basic Technology', is_double_period: 0, periods_per_week: 1 },
      { subject: 'Social Studies', is_double_period: 0, periods_per_week: 1 },
    ];

    // SSS subjects
    const sssSubjects = [
      { subject: 'Mathematics', is_double_period: 1, periods_per_week: 2 },
      { subject: 'English', is_double_period: 0, periods_per_week: 2 },
      { subject: 'Physics', is_double_period: 1, periods_per_week: 2 },
      { subject: 'Chemistry', is_double_period: 1, periods_per_week: 2 },
      { subject: 'Biology', is_double_period: 0, periods_per_week: 2 },
      { subject: 'Further Mathematics', is_double_period: 0, periods_per_week: 1 },
    ];

    for (const cls of jssClasses) {
      for (const s of jssSubjects) {
        insertCurr.run(cls, s.subject, s.is_double_period, s.periods_per_week);
      }
    }

    for (const cls of sssClasses) {
      for (const s of sssSubjects) {
        insertCurr.run(cls, s.subject, s.is_double_period, s.periods_per_week);
      }
    }
  }
}

// Run initial seed on module load
seedDatabase();

export default db;
