import db, { getWatchConfig, saveWatchConfig } from './db';
import path from 'path';
import fs from 'fs';
import * as xlsx from 'xlsx';

// Helper to round percentages to 2 significant figures
export function roundToTwoSigFigs(val: number): number {
  if (!val || isNaN(val)) return 0;
  if (val >= 100) return 100;
  const precision = val < 10 ? 2 : 2; // e.g. 8.2 or 75
  // For standard admin metrics: e.g. 75%, 9.4%, 93%, 100%
  if (val < 10) {
    return parseFloat(val.toPrecision(2));
  }
  return Math.round(val);
}

// Ensure students/teachers helper gets full name paired with ID
export interface StudentRecord {
  id: number;
  student_id: string;
  first_name: string;
  last_name: string;
  full_name: string; // generated
  class: string;
  gender: string;
  attendance_rate: number;
  parent_name: string;
  parent_phone: string;
}

export interface TeacherRecord {
  id: number;
  teacher_id: string;
  first_name: string;
  last_name: string;
  full_name: string; // generated
  subject: string;
  workload: number;
}

// -------------------------------------------------------------
// STUDENTS TOOLS
// -------------------------------------------------------------
export function getStudents(): StudentRecord[] {
  const rows = db.prepare('SELECT * FROM students ORDER BY student_id ASC').all() as any[];
  return rows.map(r => ({
    ...r,
    full_name: `${r.first_name} ${r.last_name}`,
    attendance_rate: roundToTwoSigFigs(r.attendance_rate)
  }));
}

export function getStudentById(studentId: string): StudentRecord | null {
  const r = db.prepare('SELECT * FROM students WHERE student_id = ?').get(studentId) as any;
  if (!r) return null;
  return {
    ...r,
    full_name: `${r.first_name} ${r.last_name}`,
    attendance_rate: roundToTwoSigFigs(r.attendance_rate)
  };
}

export function addStudent(data: {
  first_name: string;
  last_name: string;
  class: string;
  gender: string;
  parent_name: string;
  parent_phone: string;
}): StudentRecord {
  // Auto-generate student_id
  const lastRow = db.prepare('SELECT student_id FROM students WHERE student_id LIKE "STU%" ORDER BY id DESC LIMIT 1').get() as { student_id: string } | undefined;
  let nextNum = 1;
  if (lastRow && lastRow.student_id) {
    const numPart = parseInt(lastRow.student_id.replace('STU', ''), 10);
    if (!isNaN(numPart)) nextNum = numPart + 1;
  }
  const student_id = `STU${String(nextNum).padStart(3, '0')}`;
  const attendance_rate = 100.0; // Default new student attendance

  const stmt = db.prepare(`
    INSERT INTO students (student_id, first_name, last_name, class, gender, attendance_rate, parent_name, parent_phone, is_demo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
  `);
  stmt.run(student_id, data.first_name, data.last_name, data.class, data.gender, attendance_rate, data.parent_name, data.parent_phone);

  const newStudent = getStudentById(student_id)!;

  // Append to students.xlsx if it has been uploaded
  const config = getWatchConfig();
  if (config.students.uploaded && config.students.filePath) {
    appendToFile(config.students.filePath, {
      student_id,
      first_name: data.first_name,
      last_name: data.last_name,
      class: data.class,
      gender: data.gender,
      parent_name: data.parent_name,
      parent_phone: data.parent_phone
    });
  }

  return newStudent;
}

// -------------------------------------------------------------
// TEACHERS TOOLS
// -------------------------------------------------------------
export function getTeachers(): TeacherRecord[] {
  const rows = db.prepare('SELECT * FROM teachers ORDER BY teacher_id ASC').all() as any[];
  return rows.map(r => ({
    ...r,
    full_name: `${r.first_name} ${r.last_name}`
  }));
}

export function getTeacherBySubject(subject: string): TeacherRecord[] {
  const rows = db.prepare('SELECT * FROM teachers WHERE subject = ?').all(subject) as any[];
  return rows.map(r => ({
    ...r,
    full_name: `${r.first_name} ${r.last_name}`
  }));
}

export function addTeacher(data: {
  first_name: string;
  last_name: string;
  subject: string;
  workload: number;
}): TeacherRecord {
  // Auto-generate teacher_id
  const lastRow = db.prepare('SELECT teacher_id FROM teachers WHERE teacher_id LIKE "TCH%" ORDER BY id DESC LIMIT 1').get() as { teacher_id: string } | undefined;
  let nextNum = 1;
  if (lastRow && lastRow.teacher_id) {
    const numPart = parseInt(lastRow.teacher_id.replace('TCH', ''), 10);
    if (!isNaN(numPart)) nextNum = numPart + 1;
  }
  const teacher_id = `TCH${String(nextNum).padStart(3, '0')}`;

  const stmt = db.prepare(`
    INSERT INTO teachers (teacher_id, first_name, last_name, subject, workload, is_demo)
    VALUES (?, ?, ?, ?, ?, 0)
  `);
  stmt.run(teacher_id, data.first_name, data.last_name, data.subject, data.workload);

  const newTeacher = db.prepare('SELECT * FROM teachers WHERE teacher_id = ?').get(teacher_id) as any;
  const result: TeacherRecord = {
    ...newTeacher,
    full_name: `${newTeacher.first_name} ${newTeacher.last_name}`
  };

  // Append to teachers.xlsx if uploaded
  const config = getWatchConfig();
  if (config.teachers.uploaded && config.teachers.filePath) {
    appendToFile(config.teachers.filePath, {
      teacher_id,
      first_name: data.first_name,
      last_name: data.last_name,
      subject: data.subject,
      workload: data.workload
    });
  }

  return result;
}

// -------------------------------------------------------------
// ATTENDANCE TOOLS
// -------------------------------------------------------------
export interface AttendanceRecord {
  id: number;
  student_id: string;
  student_name: string;
  class: string;
  date: string;
  status: string;
}

export function getAttendanceByClass(className: string): AttendanceRecord[] {
  const rows = db.prepare(`
    SELECT a.*, s.first_name, s.last_name, s.class 
    FROM attendance a
    JOIN students s ON a.student_id = s.student_id
    WHERE s.class = ?
    ORDER BY a.date DESC, s.last_name ASC
  `).all(className) as any[];

  return rows.map(r => ({
    id: r.id,
    student_id: r.student_id,
    student_name: `${r.first_name} ${r.last_name}`,
    class: r.class,
    date: r.date,
    status: r.status
  }));
}

export function getAttendanceByStudent(studentId: string): AttendanceRecord[] {
  const rows = db.prepare(`
    SELECT a.*, s.first_name, s.last_name, s.class 
    FROM attendance a
    JOIN students s ON a.student_id = s.student_id
    WHERE a.student_id = ?
    ORDER BY a.date DESC
  `).all(studentId) as any[];

  return rows.map(r => ({
    id: r.id,
    student_id: r.student_id,
    student_name: `${r.first_name} ${r.last_name}`,
    class: r.class,
    date: r.date,
    status: r.status
  }));
}

export interface LowAttendanceStudent {
  id: string;
  name: string;
  class: string;
  attendanceRate: number;
  issue: string;
}

export function getLowAttendance(threshold: number = 75): LowAttendanceStudent[] {
  const students = getStudents();
  const filtered = students.filter(s => s.attendance_rate < threshold);
  
  return filtered.map(s => {
    // Generate custom issue message
    const history = getAttendanceByStudent(s.student_id);
    const absentCount = history.filter(h => h.status === 'absent').length;
    const lateCount = history.filter(h => h.status === 'late').length;
    
    // Check for consecutive absences
    let consecutiveAbsences = 0;
    let currentConsecutive = 0;
    const sortedHistory = [...history].sort((a, b) => b.date.localeCompare(a.date));
    for (const h of sortedHistory) {
      if (h.status === 'absent') {
        currentConsecutive++;
        if (currentConsecutive > consecutiveAbsences) {
          consecutiveAbsences = currentConsecutive;
        }
      } else {
        currentConsecutive = 0;
      }
    }

    let issue = `${s.attendance_rate}% attendance, ${absentCount} absences and ${lateCount} late marks recorded.`;
    if (consecutiveAbsences >= 2) {
      issue = `${s.attendance_rate}% attendance, with ${consecutiveAbsences} consecutive absences recently.`;
    } else if (s.attendance_rate < 60) {
      issue = `${s.attendance_rate}% attendance: CRITICAL drop, requiring parent intervention.`;
    }

    return {
      id: s.student_id,
      name: s.full_name,
      class: s.class,
      attendanceRate: s.attendance_rate,
      issue
    };
  });
}

// -------------------------------------------------------------
// RESULTS TOOLS
// -------------------------------------------------------------
export interface ResultRecord {
  id: number;
  student_id: string;
  student_name: string;
  class: string;
  subject: string;
  term: string;
  session: string;
  score: number;
  grade: string;
}

export function getResultsByStudent(studentId: string): ResultRecord[] {
  const rows = db.prepare(`
    SELECT r.*, s.first_name, s.last_name, s.class
    FROM results r
    JOIN students s ON r.student_id = s.student_id
    WHERE r.student_id = ?
    ORDER BY r.term DESC, r.subject ASC
  `).all(studentId) as any[];

  return rows.map(r => ({
    id: r.id,
    student_id: r.student_id,
    student_name: `${r.first_name} ${r.last_name}`,
    class: r.class,
    subject: r.subject,
    term: r.term,
    session: r.session,
    score: r.score,
    grade: r.grade
  }));
}

export function getResultsByClass(className: string): ResultRecord[] {
  const rows = db.prepare(`
    SELECT r.*, s.first_name, s.last_name, s.class
    FROM results r
    JOIN students s ON r.student_id = s.student_id
    WHERE s.class = ?
    ORDER BY s.last_name ASC, r.subject ASC
  `).all(className) as any[];

  return rows.map(r => ({
    id: r.id,
    student_id: r.student_id,
    student_name: `${r.first_name} ${r.last_name}`,
    class: r.class,
    subject: r.subject,
    term: r.term,
    session: r.session,
    score: r.score,
    grade: r.grade
  }));
}

// -------------------------------------------------------------
// REPORT GENERATION (TEXT VERSIONS FOR GEMINI)
// -------------------------------------------------------------
export function generateStudentReport(): string {
  const students = getStudents();
  const classes = ['JSS1', 'JSS2', 'JSS3', 'SSS1', 'SSS2', 'SSS3'];
  
  let report = 'STUDENT DISCIPLINARY AND ACADEMIC REPORT\n';
  report += 'Generated: ' + new Date().toLocaleDateString() + '\n\n';
  
  for (const cls of classes) {
    const clsStudents = students.filter(s => s.class === cls);
    if (clsStudents.length === 0) continue;
    
    report += `CLASS: ${cls}\n`;
    report += '='.repeat(40) + '\n';
    
    for (const s of clsStudents) {
      const results = getResultsByStudent(s.student_id);
      const avgScore = results.length > 0 
        ? roundToTwoSigFigs(results.reduce((acc, r) => acc + r.score, 0) / results.length)
        : 'N/A';
      
      report += `ID: ${s.student_id} | Name: ${s.full_name}\n`;
      report += `Attendance Rate: ${s.attendance_rate}%\n`;
      report += `Academic Score Average: ${avgScore}${avgScore !== 'N/A' ? '%' : ''}\n`;
      if (results.length > 0) {
        report += `Scores: ` + results.map(r => `${r.subject} (${r.score} - ${r.grade})`).join(', ') + `\n`;
      } else {
        report += `Scores: No recorded academic performance metrics.\n`;
      }
      report += '-'.repeat(40) + '\n';
    }
    report += '\n';
  }
  return report;
}

export function generateClassReport(className: string): string {
  const students = getStudents().filter(s => s.class === className);
  if (students.length === 0) {
    return `CLASS REPORT: ${className}\nNo records found for class ${className}.`;
  }
  
  const classAvgAttendance = roundToTwoSigFigs(students.reduce((acc, s) => acc + s.attendance_rate, 0) / students.length);
  
  const results = getResultsByClass(className);
  const classAvgScore = results.length > 0 
    ? roundToTwoSigFigs(results.reduce((acc, r) => acc + r.score, 0) / results.length)
    : 0;

  let report = `CLASS LEVEL PERFORMANCE SUMMARY: ${className}\n`;
  report += 'Generated: ' + new Date().toLocaleDateString() + '\n\n';
  
  report += `SUMMARY METRICS\n`;
  report += `Total Students: ${students.length}\n`;
  report += `Average Attendance Rate: ${classAvgAttendance}%\n`;
  report += `Average Subject Score: ${classAvgScore}%\n\n`;
  
  report += `STUDENT PERFORMANCE BREAKDOWN\n`;
  report += '='.repeat(40) + '\n';
  
  for (const s of students) {
    const sResults = results.filter(r => r.student_id === s.student_id);
    const sAvg = sResults.length > 0 
      ? roundToTwoSigFigs(sResults.reduce((acc, r) => acc + r.score, 0) / sResults.length)
      : 'N/A';
    
    report += `Student: ${s.student_id} · ${s.full_name}\n`;
    report += `Attendance: ${s.attendance_rate}%\n`;
    report += `Grade Average: ${sAvg}${sAvg !== 'N/A' ? '%' : ''}\n`;
    if (sResults.length > 0) {
      report += `Subject List: ` + sResults.map(r => `${r.subject}: ${r.score} (${r.grade})`).join(', ') + `\n`;
    }
    report += '-'.repeat(40) + '\n';
  }
  
  report += `\nKEY RECOMMENDATIONS\n`;
  report += `Identify students falling below 75% attendance for direct parent counseling.\n`;
  report += `Offer focused tutoring sessions for subjects where class score average falls below 60%.\n`;
  
  return report;
}

export function generateAttendanceReport(): string {
  const students = getStudents();
  if (students.length === 0) {
    return "ATTENDANCE REPORT\nNo records available to generate report.";
  }
  
  const overallAvg = roundToTwoSigFigs(students.reduce((acc, s) => acc + s.attendance_rate, 0) / students.length);
  const lowAttendanceList = getLowAttendance(75);
  
  let report = 'ATTENDANCE SUMMARY REPORT\n';
  report += 'Generated: ' + new Date().toLocaleDateString() + '\n\n';
  
  report += 'SUMMARY METRICS\n';
  report += `Total Enrolled: ${students.length} Students\n`;
  report += `School-wide Average Attendance: ${overallAvg}%\n`;
  report += `Students Under Attention Threshold (75%): ${lowAttendanceList.length}\n\n`;
  
  report += 'STUDENTS REQUIRING ATTENTION\n';
  report += '='.repeat(40) + '\n';
  
  if (lowAttendanceList.length > 0) {
    for (const s of lowAttendanceList) {
      report += `Student: ${s.id} · ${s.name} (${s.class})\n`;
      report += `Flagged Issue: ${s.issue}\n`;
      report += '-'.repeat(40) + '\n';
    }
  } else {
    report += 'All active students are meeting the standard 75% attendance threshold.\n';
  }
  
  report += '\nRECOMMENDATIONS AND ACTION ITEMS\n';
  report += 'Establish automated parent alert triggers for students reaching three absences in a term.\n';
  report += 'Engage class teachers in reviewing class attendance trends on a bi-weekly basis.\n';
  report += 'Provide attendance incentives to motivate struggling cohorts.\n';
  
  return report;
}

export function generatePerformanceSummary(): string {
  const results = db.prepare('SELECT score FROM results').all() as { score: number }[];
  const students = getStudents();
  
  if (students.length === 0 || results.length === 0) {
    return 'ACADEMIC PERFORMANCE SUMMARY\nNo gradebook entries available to generate analysis.';
  }
  
  const overallAvg = roundToTwoSigFigs(results.reduce((acc, r) => acc + r.score, 0) / results.length);
  
  // Find top performers
  const studentScores: { [id: string]: { name: string, cls: string, total: number, count: number } } = {};
  const allResults = db.prepare(`
    SELECT r.score, r.student_id, s.first_name, s.last_name, s.class
    FROM results r
    JOIN students s ON r.student_id = s.student_id
  `).all() as any[];
  
  for (const r of allResults) {
    if (!studentScores[r.student_id]) {
      studentScores[r.student_id] = {
        name: `${r.first_name} ${r.last_name}`,
        cls: r.class,
        total: 0,
        count: 0
      };
    }
    studentScores[r.student_id].total += r.score;
    studentScores[r.student_id].count++;
  }
  
  const ranked = Object.keys(studentScores).map(id => ({
    id,
    name: studentScores[id].name,
    cls: studentScores[id].cls,
    avg: roundToTwoSigFigs(studentScores[id].total / studentScores[id].count)
  })).sort((a, b) => b.avg - a.avg);
  
  const topStudents = ranked.slice(0, 3);
  const strugglingStudents = ranked.filter(s => s.avg < 60);
  
  let report = 'ACADEMIC PERFORMANCE REPORT\n';
  report += 'Generated: ' + new Date().toLocaleDateString() + '\n\n';
  
  report += 'SUMMARY METRICS\n';
  report += `School Average Score: ${overallAvg}%\n`;
  report += `Top Performing Avg Score: ${topStudents[0]?.avg || 'N/A'}%\n`;
  report += `Students Needing Academic Review (Avg < 60%): ${strugglingStudents.length}\n\n`;
  
  report += 'TOP ACADEMIC ACHIEVERS\n';
  report += '='.repeat(40) + '\n';
  for (let i = 0; i < topStudents.length; i++) {
    const s = topStudents[i];
    report += `${i + 1}. ID: ${s.id} | Name: ${s.name} (${s.cls}) - Average: ${s.avg}%\n`;
  }
  
  report += '\nSTUDENTS IDENTIFIED FOR ACADEMIC SUPPORT\n';
  report += '='.repeat(40) + '\n';
  if (strugglingStudents.length > 0) {
    for (const s of strugglingStudents) {
      report += `Student: ${s.id} · ${s.name} (${s.cls}) - Average: ${s.avg}%\n`;
    }
  } else {
    report += 'No students currently fall below the 60% performance review threshold.\n';
  }
  
  report += '\nRECOMMENDATIONS AND INTERVENTIONS\n';
  report += 'Create student-led peer tutorial networks partnering high achievers with struggling peers.\n';
  report += 'Implement after-school remedial sessions targeting core subjects.\n';
  report += 'Initiate teacher coordination reviews for subjects with below average scores.\n';
  
  return report;
}

// -------------------------------------------------------------
// TIMETABLE GENERATOR
// -------------------------------------------------------------
export interface TimetableSlot {
  day: string;
  period: number;
  teacher_id: string;
  teacher_name: string;
  subject: string;
}

export function generateTimetable(className: string): { grid: { [day: string]: (TimetableSlot | null)[] }, times: string[] } {
  // Clear old timetable slots for this class
  db.prepare('DELETE FROM timetable_slots WHERE class_name = ?').run(className);

  // Fetch curriculum for this class
  const curriculum = db.prepare('SELECT * FROM curriculum WHERE class = ?').all(className) as { id: number, class: string, subject: string, is_double_period: number, periods_per_week: number }[];
  if (curriculum.length === 0) {
    throw new Error(`Please set up the curriculum for class ${className} first before generating its timetable.`);
  }

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const periods = [1, 2, 3, 4, 5, 6, 7, 8];
  
  // Get all teachers from database
  const teachers = getTeachers();
  if (teachers.length === 0) {
    throw new Error('No teachers registered in roster to build schedule.');
  }

  // Pre-fetch booked slots for other classes to avoid clashes:
  const bookedSet = new Set<string>();
  const dbBooked = db.prepare('SELECT day, period, teacher_id FROM timetable_slots WHERE class_name != ?').all(className) as { day: string, period: number, teacher_id: string }[];
  for (const b of dbBooked) {
    bookedSet.add(`${b.day}-${b.period}-${b.teacher_id}`);
  }

  // Local grid representation for scheduling
  const classGrid: { [day: string]: { [period: number]: { subject: string, teacher_id: string, teacher_name: string } | null } } = {};
  for (const day of days) {
    classGrid[day] = {};
    for (const p of periods) {
      classGrid[day][p] = null;
    }
  }

  // Helper to check if a teacher is available for a given day and period
  const isTeacherAvailable = (teacherId: string, day: string, period: number) => {
    if (bookedSet.has(`${day}-${period}-${teacherId}`)) return false;
    for (const p of periods) {
      const slot = classGrid[day][p];
      if (slot && slot.teacher_id === teacherId && p === period) return false;
    }
    return true;
  };

  // Helper to find a teacher for a subject
  const getTeachersForSubject = (subjectName: string) => {
    const matches = teachers.filter(t => t.subject.toLowerCase() === subjectName.toLowerCase());
    if (matches.length > 0) return matches;
    return teachers;
  };

  // Split curriculum periods into doubles and singles
  const doublePeriodsToPlace: { subject: string }[] = [];
  const singlePeriodsToPlace: { subject: string }[] = [];

  for (const c of curriculum) {
    if (c.is_double_period === 1) {
      const numDoubles = Math.floor(c.periods_per_week / 2);
      const numSingles = c.periods_per_week % 2;
      for (let i = 0; i < numDoubles; i++) {
        doublePeriodsToPlace.push({ subject: c.subject });
      }
      for (let i = 0; i < numSingles; i++) {
        singlePeriodsToPlace.push({ subject: c.subject });
      }
    } else {
      for (let i = 0; i < c.periods_per_week; i++) {
        singlePeriodsToPlace.push({ subject: c.subject });
      }
    }
  }

  // Consecutive pairs of periods that do not cross breaks:
  const consecutivePairs = [
    [1, 2], [2, 3],
    [4, 5], [5, 6],
    [7, 8]
  ];

  // Helper to shuffle search spaces
  const shuffleArray = <T>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  // 1. PLACE DOUBLE PERIODS
  for (const item of doublePeriodsToPlace) {
    const candidateDays = shuffleArray(days);
    const candidatePairs = shuffleArray(consecutivePairs);
    let assigned = false;

    const subjectTeachers = shuffleArray(getTeachersForSubject(item.subject));

    outerDouble:
    for (const d of candidateDays) {
      for (const pair of candidatePairs) {
        const [p1, p2] = pair;
        if (classGrid[d][p1] === null && classGrid[d][p2] === null) {
          for (const teacher of subjectTeachers) {
            if (isTeacherAvailable(teacher.teacher_id, d, p1) && isTeacherAvailable(teacher.teacher_id, d, p2)) {
              const teacherName = `${teacher.first_name} ${teacher.last_name}`;
              classGrid[d][p1] = { subject: item.subject, teacher_id: teacher.teacher_id, teacher_name: teacherName };
              classGrid[d][p2] = { subject: item.subject, teacher_id: teacher.teacher_id, teacher_name: teacherName };
              
              bookedSet.add(`${d}-${p1}-${teacher.teacher_id}`);
              bookedSet.add(`${d}-${p2}-${teacher.teacher_id}`);
              assigned = true;
              break outerDouble;
            }
          }
        }
      }
    }

    if (!assigned) {
      outerDoubleRelax:
      for (const d of candidateDays) {
        for (const pair of candidatePairs) {
          const [p1, p2] = pair;
          if (classGrid[d][p1] === null && classGrid[d][p2] === null) {
            for (const teacher of subjectTeachers) {
              const teacherName = `${teacher.first_name} ${teacher.last_name}`;
              classGrid[d][p1] = { subject: item.subject, teacher_id: teacher.teacher_id, teacher_name: teacherName };
              classGrid[d][p2] = { subject: item.subject, teacher_id: teacher.teacher_id, teacher_name: teacherName };
              assigned = true;
              break outerDoubleRelax;
            }
          }
        }
      }
    }
  }

  // 2. PLACE SINGLE PERIODS
  for (const item of singlePeriodsToPlace) {
    const candidateDays = shuffleArray(days);
    const candidatePeriods = shuffleArray(periods);
    let assigned = false;

    const subjectTeachers = shuffleArray(getTeachersForSubject(item.subject));

    outerSingle:
    for (const d of candidateDays) {
      for (const p of candidatePeriods) {
        if (classGrid[d][p] === null) {
          for (const teacher of subjectTeachers) {
            if (isTeacherAvailable(teacher.teacher_id, d, p)) {
              const teacherName = `${teacher.first_name} ${teacher.last_name}`;
              classGrid[d][p] = { subject: item.subject, teacher_id: teacher.teacher_id, teacher_name: teacherName };
              bookedSet.add(`${d}-${p}-${teacher.teacher_id}`);
              assigned = true;
              break outerSingle;
            }
          }
        }
      }
    }

    if (!assigned) {
      outerSingleRelax:
      for (const d of candidateDays) {
        for (const p of candidatePeriods) {
          if (classGrid[d][p] === null) {
            for (const teacher of subjectTeachers) {
              const teacherName = `${teacher.first_name} ${teacher.last_name}`;
              classGrid[d][p] = { subject: item.subject, teacher_id: teacher.teacher_id, teacher_name: teacherName };
              assigned = true;
              break outerSingleRelax;
            }
          }
        }
      }
    }
  }

  // Write finalized grid to SQLite
  const insertSlot = db.prepare(`
    INSERT INTO timetable_slots (class_name, day, period, teacher_id, subject)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const d of days) {
    for (const p of periods) {
      const slot = classGrid[d][p];
      if (slot) {
        insertSlot.run(className, d, p, slot.teacher_id, slot.subject);
      } else {
        insertSlot.run(className, d, p, 'FREE', 'Study Hall');
      }
    }
  }

  return fetchTimetable(className);
}

export function fetchTimetable(className: string): { grid: { [day: string]: (TimetableSlot | null)[] }, times: string[] } {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const times = [
    '8:00 - 8:40',
    '8:40 - 9:20',
    '9:20 - 10:00',
    '10:00 - 10:30 (LONG BREAK)',
    '10:30 - 11:10',
    '11:10 - 11:50',
    '11:50 - 12:30',
    '12:30 - 12:40 (SHORT BREAK)',
    '12:40 - 1:20',
    '1:20 - 2:00'
  ];

  // Fetch slots from DB
  const slots = db.prepare(`
    SELECT ts.*, t.first_name, t.last_name
    FROM timetable_slots ts
    LEFT JOIN teachers t ON ts.teacher_id = t.teacher_id
    WHERE ts.class_name = ?
  `).all(className) as any[];

  const grid: { [day: string]: (TimetableSlot | null)[] } = {};

  for (const day of days) {
    grid[day] = [];
    const daySlots = slots.filter(s => s.day === day);

    // Map 8 periods and inject breaks at the correct rows:
    // Period 1, 2, 3 -> Breaks -> Period 4, 5, 6 -> Breaks -> Period 7, 8
    let periodIndex = 1;
    for (let slotIndex = 0; slotIndex < 10; slotIndex++) {
      if (slotIndex === 3) {
        // Long Break
        grid[day].push(null);
      } else if (slotIndex === 7) {
        // Short Break
        grid[day].push(null);
      } else {
        const matchingSlot = daySlots.find(s => s.period === periodIndex);
        if (matchingSlot) {
          grid[day].push({
            day: matchingSlot.day,
            period: matchingSlot.period,
            teacher_id: matchingSlot.teacher_id,
            teacher_name: matchingSlot.teacher_id === 'FREE' ? 'N/A' : `${matchingSlot.first_name} ${matchingSlot.last_name}`,
            subject: matchingSlot.subject
          });
        } else {
          grid[day].push({
            day,
            period: periodIndex,
            teacher_id: 'FREE',
            teacher_name: 'N/A',
            subject: 'Study Hall'
          });
        }
        periodIndex++;
      }
    }
  }

  return { grid, times };
}

// Helper to write/append rows to excel files
function appendToFile(filePath: string, data: any) {
  try {
    if (!fs.existsSync(filePath)) return;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const sheetData = xlsx.utils.sheet_to_json(worksheet);
    sheetData.push(data);
    const newWorksheet = xlsx.utils.json_to_sheet(sheetData);
    workbook.Sheets[sheetName] = newWorksheet;
    xlsx.writeFile(workbook, filePath);
  } catch (err) {
    console.error('Error appending to Excel file:', err);
  }
}
