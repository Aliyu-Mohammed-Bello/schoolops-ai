export interface StudentRecord {
  id: number;
  student_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
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
  full_name: string;
  subject: string;
  workload: number;
}

export interface AttendanceRecord {
  id: number;
  student_id: string;
  student_name: string;
  class: string;
  date: string;
  status: string;
}

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

export interface LowAttendanceStudent {
  id: string;
  name: string;
  class: string;
  attendanceRate: number;
  issue: string;
}

export interface ToolActivityLog {
  timestamp: string;
  toolName: string;
  args: any;
  resultSummary: string;
}

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

export type ActiveTab = 'dashboard' | 'students' | 'teachers' | 'attendance' | 'timetables' | 'reports' | 'ai-assistant';
