import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';

import db, { getWatchConfig, saveWatchConfig } from './src/db';
import * as tools from './src/backendTools';
import { askAgent, activityFeed } from './src/geminiAgent';
import { parseAndSyncFile, startWatchingFile, initWatchers, isWriting } from './src/syncEngine';
import { generatePDF, generateDocx } from './src/documentExporter';

// Initialize the watch configuration and activate background watchers for already uploaded sheets
initWatchers();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Setup Multer storage for the four upload types in the /data directory
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // We determine the file name based on the route
    let name = 'upload.xlsx';
    if (req.path.includes('students')) name = 'students.xlsx';
    else if (req.path.includes('teachers')) name = 'teachers.xlsx';
    else if (req.path.includes('attendance')) name = 'attendance.xlsx';
    else if (req.path.includes('results')) name = 'results.xlsx';
    cb(null, name);
  }
});
const upload = multer({ storage });

// ═══════════════════════════════
// API ROUTES
// ═══════════════════════════════

// GET /dashboard
app.get('/api/dashboard', (req, res) => {
  try {
    const students = tools.getStudents();
    const teachers = tools.getTeachers();
    
    const studentCount = students.length;
    const teacherCount = teachers.length;
    
    const attendanceRate = studentCount > 0 
      ? tools.roundToTwoSigFigs(students.reduce((acc, s) => acc + s.attendance_rate, 0) / studentCount)
      : 100.0;
      
    const lowAttendanceStudents = tools.getLowAttendance(75);

    res.json({
      studentCount,
      teacherCount,
      attendanceRate,
      lowAttendanceStudents
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /agent/activity
app.get('/api/agent/activity', (req, res) => {
  res.json(activityFeed);
});

// POST /agent/ask
app.post('/api/agent/ask', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }
  try {
    const response = await askAgent(message);
    res.json({ response });
  } catch (err: any) {
    console.error("Agent ask error:", err);
    res.status(500).json({ error: err.message || "An error occurred with the AI agent." });
  }
});

// GET & POST /students
app.get('/api/students', (req, res) => {
  try {
    res.json(tools.getStudents());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/students', (req, res) => {
  try {
    const { first_name, last_name, class: className, gender, parent_name, parent_phone } = req.body;
    if (!first_name || !last_name || !className || !gender) {
      return res.status(400).json({ error: "Missing required fields." });
    }
    
    // Pause watcher during write to avoid race condition
    isWriting.students = true;
    const newStudent = tools.addStudent({ first_name, last_name, class: className, gender, parent_name: parent_name || 'N/A', parent_phone: parent_phone || 'N/A' });
    setTimeout(() => { isWriting.students = false; }, 2000);
    
    res.json(newStudent);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET & POST /teachers
app.get('/api/teachers', (req, res) => {
  try {
    res.json(tools.getTeachers());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/teachers', (req, res) => {
  try {
    const { first_name, last_name, subject, workload } = req.body;
    if (!first_name || !last_name || !subject || !workload) {
      return res.status(400).json({ error: "Missing required fields." });
    }
    
    isWriting.teachers = true;
    const newTeacher = tools.addTeacher({ first_name, last_name, subject, workload: Number(workload) });
    setTimeout(() => { isWriting.teachers = false; }, 2000);
    
    res.json(newTeacher);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Attendance routes
app.get('/api/attendance/class/:className', (req, res) => {
  try {
    res.json(tools.getAttendanceByClass(req.params.className));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/attendance/student/:studentId', (req, res) => {
  try {
    res.json(tools.getAttendanceByStudent(req.params.studentId));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/attendance/analytics
app.get('/api/attendance/analytics', (req, res) => {
  try {
    // 1. Present / Absent / Late breakdown
    const breakdown = db.prepare(`
      SELECT LOWER(status) as status, COUNT(*) as count 
      FROM attendance 
      GROUP BY LOWER(status)
    `).all() as { status: string; count: number }[];

    const statusCounts = { present: 0, absent: 0, late: 0 };
    breakdown.forEach(b => {
      if (b.status === 'present') statusCounts.present = b.count;
      else if (b.status === 'absent') statusCounts.absent = b.count;
      else if (b.status === 'late') statusCounts.late = b.count;
    });

    // If no records in attendance table, fallback to students' average rate to simulate some breakdown
    if (statusCounts.present === 0 && statusCounts.absent === 0 && statusCounts.late === 0) {
      statusCounts.present = 85;
      statusCounts.absent = 10;
      statusCounts.late = 5;
    }

    // 2. Attendance rate by class cohort
    const studentsList = db.prepare('SELECT class, attendance_rate FROM students').all() as { class: string; attendance_rate: number }[];
    const classGroups: { [key: string]: number[] } = {
      'JSS1': [], 'JSS2': [], 'JSS3': [],
      'SSS1': [], 'SSS2': [], 'SSS3': []
    };
    studentsList.forEach(s => {
      if (classGroups[s.class]) {
        classGroups[s.class].push(s.attendance_rate);
      }
    });
    const classRates = Object.keys(classGroups).map(className => {
      const rates = classGroups[className];
      const avg = rates.length > 0 ? Number((rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(1)) : 85.0;
      return { class: className, rate: avg };
    });

    // 3. Trend over time (by date)
    const dailyRecords = db.prepare(`
      SELECT date, status, COUNT(*) as count 
      FROM attendance 
      GROUP BY date, status
      ORDER BY date ASC
    `).all() as { date: string; status: string; count: number }[];

    const dateMap: { [key: string]: { present: number; total: number } } = {};
    dailyRecords.forEach(r => {
      if (!dateMap[r.date]) {
        dateMap[r.date] = { present: 0, total: 0 };
      }
      const isPresent = r.status.toLowerCase() === 'present' || r.status.toLowerCase() === 'late';
      if (isPresent) {
        dateMap[r.date].present += r.count;
      }
      dateMap[r.date].total += r.count;
    });

    let trend = Object.keys(dateMap).map(date => {
      const d = dateMap[date];
      const rate = d.total > 0 ? Number((d.present / d.total * 100).toFixed(1)) : 100;
      return { date, rate };
    }).sort((a,b) => a.date.localeCompare(b.date));

    // Fallback seed trend data if no logs uploaded yet
    if (trend.length === 0) {
      trend = [
        { date: 'Mon', rate: 88.5 },
        { date: 'Tue', rate: 91.2 },
        { date: 'Wed', rate: 87.0 },
        { date: 'Thu', rate: 93.4 },
        { date: 'Fri', rate: 89.1 }
      ];
    }

    res.json({
      breakdown: statusCounts,
      classRates,
      trend
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Results routes
app.get('/api/results/student/:studentId', (req, res) => {
  try {
    res.json(tools.getResultsByStudent(req.params.studentId));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/results/class/:className', (req, res) => {
  try {
    res.json(tools.getResultsByClass(req.params.className));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Timetable generation and fetch
app.post('/api/timetable/generate', (req, res) => {
  const { className } = req.body;
  if (!className) return res.status(400).json({ error: "className is required." });
  try {
    const schedule = tools.generateTimetable(className);
    res.json(schedule);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/timetable', (req, res) => {
  const className = req.query.className as string;
  if (!className) return res.status(400).json({ error: "className is required." });
  try {
    res.json(tools.fetchTimetable(className));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/curriculum and /curriculum
app.get(['/api/curriculum', '/curriculum'], (req, res) => {
  const className = req.query.class as string;
  try {
    let query = 'SELECT * FROM curriculum';
    let params: any[] = [];
    if (className) {
      query += ' WHERE class = ?';
      params.push(className);
    }
    query += ' ORDER BY class, subject';
    const list = db.prepare(query).all(...params);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/curriculum/add and /curriculum/add
app.post(['/api/curriculum/add', '/curriculum/add'], (req, res) => {
  const { class: classVal, subject, is_double_period, periods_per_week } = req.body;
  if (!classVal || !subject) {
    return res.status(400).json({ error: "Class and subject name are required." });
  }
  
  const finalIsDouble = is_double_period ? 1 : 0;
  const finalPeriods = periods_per_week ? Number(periods_per_week) : (finalIsDouble ? 2 : 1);

  try {
    const existing = db.prepare('SELECT id FROM curriculum WHERE class = ? AND LOWER(subject) = LOWER(?)').get(classVal, subject.trim());
    if (existing) {
      return res.status(400).json({ error: `Subject "${subject.trim()}" already exists in the curriculum for ${classVal}.` });
    }

    const info = db.prepare(`
      INSERT INTO curriculum (class, subject, is_double_period, periods_per_week)
      VALUES (?, ?, ?, ?)
    `).run(classVal, subject.trim(), finalIsDouble, finalPeriods);

    const inserted = db.prepare('SELECT * FROM curriculum WHERE id = ?').get(info.lastInsertRowid);
    res.json(inserted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/curriculum/:id and /curriculum/:id
app.delete(['/api/curriculum/:id', '/curriculum/:id'], (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM curriculum WHERE id = ?').run(id);
    res.json({ success: true, message: "Curriculum subject deleted successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reports text fetches
app.get('/api/reports/student', (req, res) => {
  try {
    res.send(tools.generateStudentReport());
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});

app.get('/api/reports/class', (req, res) => {
  const className = req.query.className as string;
  if (!className) return res.status(400).send("className query parameter is required.");
  try {
    res.send(tools.generateClassReport(className));
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});

app.get('/api/reports/attendance', (req, res) => {
  try {
    res.send(tools.generateAttendanceReport());
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});

app.get('/api/reports/performance', (req, res) => {
  try {
    res.send(tools.generatePerformanceSummary());
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});

// ═══════════════════════════════
// DOWNLOAD AND EXPORT UTILITY
// ═══════════════════════════════
app.get('/api/timetable/export', (req, res) => {
  const className = req.query.className as string;
  const format = req.query.format as string;
  if (!className || !format) {
    return res.status(400).send("className and format (pdf|docx) are required.");
  }
  try {
    if (format === 'pdf') {
      generatePDF('timetable', className, res);
    } else {
      generateDocx('timetable', className, res);
    }
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});

app.get('/api/reports/export', (req, res) => {
  const type = req.query.type as string; // student, class, attendance, performance
  const format = req.query.format as string; // pdf, docx
  const className = req.query.className as string;
  if (!type || !format) {
    return res.status(400).send("type and format (pdf|docx) are required.");
  }
  try {
    if (format === 'pdf') {
      generatePDF(type, className, res);
    } else {
      generateDocx(type, className, res);
    }
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});

// ═══════════════════════════════
// DATA UPLOAD ENDPOINTS
// ═══════════════════════════════
app.get('/api/data/status', (req, res) => {
  res.json(getWatchConfig());
});

// Upload student list
app.post('/api/data/students/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });
    
    // 1. Delete DEMO students rows only
    db.prepare('DELETE FROM students WHERE is_demo = 1').run();
    
    // 2. Clear out demo attendance and results linked to demo students
    db.prepare('DELETE FROM attendance WHERE is_demo = 1').run();
    db.prepare('DELETE FROM results WHERE is_demo = 1').run();

    // 3. Sync spreadsheet rows to database
    const filePath = req.file.path;
    const syncResult = parseAndSyncFile('students', filePath);

    // 4. Attach background chokidar watcher to this file path
    startWatchingFile('students', filePath);

    res.json(syncResult);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Upload teacher list
app.post('/api/data/teachers/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });

    db.prepare('DELETE FROM teachers WHERE is_demo = 1').run();

    const filePath = req.file.path;
    const syncResult = parseAndSyncFile('teachers', filePath);

    startWatchingFile('teachers', filePath);

    res.json(syncResult);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Upload attendance records
app.post('/api/data/attendance/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });

    db.prepare('DELETE FROM attendance WHERE is_demo = 1').run();

    const filePath = req.file.path;
    const syncResult = parseAndSyncFile('attendance', filePath);

    startWatchingFile('attendance', filePath);

    res.json(syncResult);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Upload results
app.post('/api/data/results/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });

    db.prepare('DELETE FROM results WHERE is_demo = 1').run();

    const filePath = req.file.path;
    const syncResult = parseAndSyncFile('results', filePath);

    startWatchingFile('results', filePath);

    res.json(syncResult);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════
// FRONTEND STATIC / DEV SERVER MIDDLEWARE
// ═══════════════════════════════
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SchoolOps AI] Server running on port ${PORT}`);
  });
}

startServer();
