import React, { useState, useEffect } from 'react';
import { Calendar, Search, CheckCircle, XCircle, AlertCircle, RefreshCw, BarChart2, Filter, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line } from 'recharts';
import { StudentRecord, AttendanceRecord, WatchConfig } from '../types';
import { UploadStatus } from './UploadStatus';

interface AttendanceViewProps {
  watchConfig: WatchConfig;
  onRefreshConfig: () => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({ watchConfig, onRefreshConfig }) => {
  const [filterMode, setFilterMode] = useState<'overview' | 'class' | 'student'>('overview');
  const [selectedClass, setSelectedClass] = useState('JSS1');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [classAttendance, setClassAttendance] = useState<AttendanceRecord[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<AttendanceRecord[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Analytics State
  const [analytics, setAnalytics] = useState<{
    breakdown: { present: number; absent: number; late: number };
    classRates: { class: string; rate: number }[];
    trend: { date: string; rate: number }[];
  } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Load students for autocomplete selector
  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/students');
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch('/api/attendance/analytics');
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Error loading analytics', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchAnalytics();
  }, []);

  // Fetch Class attendance
  const fetchClassAttendance = async (className: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/attendance/class/${className}`);
      if (!res.ok) throw new Error('Failed to retrieve class attendance.');
      const data = await res.json();
      setClassAttendance(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Student attendance
  const fetchStudentAttendance = async (studentId: string) => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/attendance/student/${studentId}`);
      if (!res.ok) throw new Error('Failed to retrieve student attendance history.');
      const data = await res.json();
      setStudentAttendance(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (filterMode === 'class') {
      fetchClassAttendance(selectedClass);
    }
  }, [filterMode, selectedClass]);

  useEffect(() => {
    if (filterMode === 'student' && selectedStudentId) {
      fetchStudentAttendance(selectedStudentId);
    }
  }, [filterMode, selectedStudentId]);

  const handleUploadSuccess = () => {
    fetchStudents();
    fetchAnalytics();
    onRefreshConfig();
    if (filterMode === 'class') fetchClassAttendance(selectedClass);
    if (filterMode === 'student' && selectedStudentId) fetchStudentAttendance(selectedStudentId);
  };

  // Compute stats for overview mode
  const overallRate = students.length > 0
    ? (students.reduce((acc, s) => acc + s.attendance_rate, 0) / students.length).toFixed(1)
    : '0';

  // Quick tally of class or student records
  const getTally = (records: AttendanceRecord[]) => {
    const present = records.filter(r => r.status.toLowerCase() === 'present').length;
    const absent = records.filter(r => r.status.toLowerCase() === 'absent').length;
    const late = records.filter(r => r.status.toLowerCase() === 'late').length;
    const total = records.length;
    const rate = total > 0 ? ((present + late) / total * 100).toFixed(1) : '100';
    return { present, absent, late, total, rate };
  };

  const classTally = getTally(classAttendance);
  const studentTally = getTally(studentAttendance);

  return (
    <div className="space-y-6">
      {/* Header section with upload control */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[rgba(255,255,255,0.06)] pb-5">
        <div>
          <h1 className="text-xl font-extrabold text-[#F1F3F8]">Attendance Console</h1>
          <p className="text-xs text-[#9AA3B8] mt-1">
            Track class assemblies, audit student timelines, and sync daily registration logs.
          </p>
        </div>
        <UploadStatus
          type="attendance"
          label="Upload Attendance Records (.xlsx)"
          isUploaded={watchConfig.attendance.uploaded}
          filePath={watchConfig.attendance.filePath}
          lastSynced={watchConfig.attendance.lastSynced}
          onUploadSuccess={handleUploadSuccess}
        />
      </div>

      {/* Mode selectors */}
      <div className="flex bg-[#141924] border border-[rgba(255,255,255,0.05)] p-1 rounded-xl w-fit text-xs font-semibold">
        <button
          onClick={() => setFilterMode('overview')}
          className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
            filterMode === 'overview' ? 'bg-[#3B82F6] text-white shadow' : 'text-[#9AA3B8] hover:text-white'
          }`}
        >
          Overall Overview & Charts
        </button>
        <button
          onClick={() => setFilterMode('class')}
          className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
            filterMode === 'class' ? 'bg-[#3B82F6] text-white shadow' : 'text-[#9AA3B8] hover:text-white'
          }`}
        >
          Class Analysis
        </button>
        <button
          onClick={() => setFilterMode('student')}
          className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
            filterMode === 'student' ? 'bg-[#3B82F6] text-white shadow' : 'text-[#9AA3B8] hover:text-white'
          }`}
        >
          Student Timeline
        </button>
      </div>

      {/* FILTER CONTROLS TRAY */}
      {filterMode === 'class' && (
        <div className="p-4 bg-[#141924] border border-[rgba(255,255,255,0.06)] rounded-2xl flex items-center gap-3">
          <label className="text-xs font-bold text-[#9AA3B8]">Class Cohort:</label>
          <select
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="bg-[#0B0E17] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-1.5 text-xs text-[#F1F3F8] font-bold focus:outline-none focus:border-[#3B82F6] cursor-pointer"
          >
            {['JSS1', 'JSS2', 'JSS3', 'SSS1', 'SSS2', 'SSS3'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      )}

      {filterMode === 'student' && (
        <div className="p-4 bg-[#141924] border border-[rgba(255,255,255,0.06)] rounded-2xl flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-xs font-bold text-[#9AA3B8] shrink-0">Select Student:</label>
          <select
            value={selectedStudentId}
            onChange={e => setSelectedStudentId(e.target.value)}
            className="flex-1 bg-[#0B0E17] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-1.5 text-xs text-[#F1F3F8] font-bold focus:outline-none focus:border-[#3B82F6] cursor-pointer"
          >
            <option value="">-- Choose ID · Full Name --</option>
            {students.map(s => (
              <option key={s.student_id} value={s.student_id}>
                {s.student_id} · {s.full_name} ({s.class})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* OVERALL OVERVIEW CHARTS GRID */}
      {filterMode === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Donut Breakdown */}
            <div className="bg-[#141924] border border-[rgba(255,255,255,0.06)] p-5 rounded-2xl flex flex-col justify-between h-[300px] shadow-lg">
              <div>
                <h3 className="font-extrabold text-xs text-[#9AA3B8] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                  Status Allocation
                </h3>
                <p className="text-[10px] text-[#5C6478] mt-0.5">Ratio of present vs absent vs late logs</p>
              </div>
              <div className="flex-1 min-h-[160px] relative flex items-center justify-center">
                {analyticsLoading || !analytics ? (
                  <div className="flex items-center justify-center text-xs text-[#5C6478]">
                    <RefreshCw className="w-4 h-4 animate-spin mr-1 text-[#3B82F6]" /> Loading stats...
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Present', value: analytics.breakdown.present },
                          { name: 'Late', value: analytics.breakdown.late },
                          { name: 'Absent', value: analytics.breakdown.absent }
                        ]}
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        <Cell fill="#10B981" />
                        <Cell fill="#F59E0B" />
                        <Cell fill="#EF4444" />
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#141924', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}
                        itemStyle={{ color: '#F1F3F8', fontSize: '11px', fontFamily: 'monospace' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                {analytics && (
                  <div className="absolute flex flex-col items-center">
                    <span className="text-sm font-extrabold text-[#F1F3F8]">
                      {analytics.breakdown.present + analytics.breakdown.late + analytics.breakdown.absent}
                    </span>
                    <span className="text-[9px] text-[#5C6478] uppercase font-bold">Total Logs</span>
                  </div>
                )}
              </div>
              {analytics && (
                <div className="flex justify-around text-[10px] font-mono font-bold border-t border-[rgba(255,255,255,0.03)] pt-3">
                  <span className="text-[#10B981]">Present: {analytics.breakdown.present}</span>
                  <span className="text-[#F59E0B]">Late: {analytics.breakdown.late}</span>
                  <span className="text-[#EF4444]">Absent: {analytics.breakdown.absent}</span>
                </div>
              )}
            </div>

            {/* Chart 2: Bar Class average */}
            <div className="bg-[#141924] border border-[rgba(255,255,255,0.06)] p-5 rounded-2xl flex flex-col justify-between h-[300px] shadow-lg">
              <div>
                <h3 className="font-extrabold text-xs text-[#9AA3B8] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]"></span>
                  Average Rate By Class
                </h3>
                <p className="text-[10px] text-[#5C6478] mt-0.5">Average cohort participation percentage</p>
              </div>
              <div className="flex-1 min-h-[180px] mt-4">
                {analyticsLoading || !analytics ? (
                  <div className="h-full flex items-center justify-center text-xs text-[#5C6478]">
                    <RefreshCw className="w-4 h-4 animate-spin mr-1 text-[#3B82F6]" /> Loading stats...
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.classRates} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <XAxis dataKey="class" stroke="#5C6478" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis stroke="#5C6478" fontSize={9} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#141924', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}
                        itemStyle={{ color: '#F1F3F8', fontSize: '11px' }}
                        cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                      />
                      <Bar dataKey="rate" fill="#3B82F6" radius={[4, 4, 0, 0]}>
                        {analytics.classRates.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={idx % 2 === 0 ? '#3B82F6' : '#8B5CF6'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Chart 3: Trend analysis */}
            <div className="bg-[#141924] border border-[rgba(255,255,255,0.06)] p-5 rounded-2xl flex flex-col justify-between h-[300px] shadow-lg">
              <div>
                <h3 className="font-extrabold text-xs text-[#9AA3B8] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EAB308]"></span>
                  Timeline Trend Analysis
                </h3>
                <p className="text-[10px] text-[#5C6478] mt-0.5">Consolidated daily attendance percentage</p>
              </div>
              <div className="flex-1 min-h-[180px] mt-4">
                {analyticsLoading || !analytics ? (
                  <div className="h-full flex items-center justify-center text-xs text-[#5C6478]">
                    <RefreshCw className="w-4 h-4 animate-spin mr-1 text-[#3B82F6]" /> Loading stats...
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.trend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <XAxis dataKey="date" stroke="#5C6478" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis stroke="#5C6478" fontSize={9} tickLine={false} axisLine={false} domain={[50, 100]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#141924', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}
                        itemStyle={{ color: '#F1F3F8', fontSize: '11px' }}
                      />
                      <Line type="monotone" dataKey="rate" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3, stroke: '#10B981', strokeWidth: 1.5, fill: '#0B0E17' }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Table List Row */}
          <div className="bg-[#141924] border border-[rgba(255,255,255,0.06)] p-5 rounded-2xl shadow-lg">
            <h3 className="font-bold text-xs text-[#9AA3B8] uppercase tracking-wider border-b border-[rgba(255,255,255,0.06)] pb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#3B82F6]" />
              Roster Summary (Quick View)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              {students.slice(0, 10).map(s => (
                <div key={s.student_id} className="p-3 bg-[#0B0E17]/50 border border-[rgba(255,255,255,0.03)] rounded-xl flex items-center justify-between text-xs hover:border-white/5 transition-all">
                  <div>
                    <span className="font-bold text-[#F1F3F8]">{s.student_id} · {s.full_name}</span>
                    <span className="block text-[10px] text-[#5C6478] mt-0.5">{s.class} cohort</span>
                  </div>
                  <span className={`font-mono font-bold ${s.attendance_rate < 75 ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
                    {s.attendance_rate}%
                  </span>
                </div>
              ))}
            </div>
            {students.length > 10 && (
              <p className="text-[10px] text-[#5C6478] text-center pt-3 italic">
                Showing first 10 students. Switch filter modes above to view class-level history.
              </p>
            )}
          </div>
        </div>
      )}

      {/* DETAILED LOG RECORD PANELS FOR OTHER FILTER MODES */}
      {filterMode !== 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left panel metrics */}
          <div className="bg-[#141924] border border-[rgba(255,255,255,0.06)] p-5 rounded-2xl flex flex-col justify-between min-h-[250px] shadow-lg">
            <div>
              <h3 className="font-bold text-xs text-[#9AA3B8] uppercase tracking-wider">
                {filterMode === 'class' ? `${selectedClass} Metrics` : 'Student Audit'}
              </h3>
              
              {filterMode === 'class' && (
                <div className="mt-4 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-[rgba(255,255,255,0.04)]">
                    <span className="text-[#9AA3B8] font-medium text-xs">Present / On Time</span>
                    <span className="text-sm font-bold text-[#10B981]">{classTally.present}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-[rgba(255,255,255,0.04)]">
                    <span className="text-[#9AA3B8] font-medium text-xs">Late Arrivals</span>
                    <span className="text-sm font-bold text-[#F59E0B]">{classTally.late}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-[rgba(255,255,255,0.04)]">
                    <span className="text-[#9AA3B8] font-medium text-xs">Absences</span>
                    <span className="text-sm font-bold text-[#EF4444]">{classTally.absent}</span>
                  </div>
                  <div className="pt-2 text-center">
                    <span className="block text-2xl font-extrabold text-[#10B981]">{classTally.rate}%</span>
                    <span className="text-[10px] text-[#5C6478] font-bold uppercase">Class Average</span>
                  </div>
                </div>
              )}

              {filterMode === 'student' && (
                <div className="mt-4 space-y-4">
                  {!selectedStudentId ? (
                    <p className="text-xs text-[#5C6478] text-center py-6">Please select a student from the dropdown above to audit.</p>
                  ) : (
                    <>
                      <div className="flex justify-between items-center pb-2 border-b border-[rgba(255,255,255,0.04)]">
                        <span className="text-[#9AA3B8] font-medium text-xs">Present</span>
                        <span className="text-sm font-bold text-[#10B981]">{studentTally.present}</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-[rgba(255,255,255,0.04)]">
                        <span className="text-[#9AA3B8] font-medium text-xs">Late</span>
                        <span className="text-sm font-bold text-[#F59E0B]">{studentTally.late}</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-[rgba(255,255,255,0.04)]">
                        <span className="text-[#9AA3B8] font-medium text-xs">Absent</span>
                        <span className="text-sm font-bold text-[#EF4444]">{studentTally.absent}</span>
                      </div>
                      <div className="pt-2 text-center">
                        <span className="block text-2xl font-extrabold text-[#10B981]">{studentTally.rate}%</span>
                        <span className="text-[10px] text-[#5C6478] font-bold uppercase">Individual Rate</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right panel log rows */}
          <div className="md:col-span-2 bg-[#141924] border border-[rgba(255,255,255,0.06)] p-5 rounded-2xl min-h-[300px] flex flex-col shadow-lg">
            <h3 className="font-bold text-xs text-[#9AA3B8] uppercase tracking-wider border-b border-[rgba(255,255,255,0.06)] pb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#3B82F6]" />
              {filterMode === 'class' ? `Registration History (${selectedClass})` : 'Chronological Audits'}
            </h3>

            <div className="flex-1 overflow-y-auto mt-4 max-h-[300px]">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-[#5C6478]">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#3B82F6] mb-2" />
                  <span className="text-xs">Connecting...</span>
                </div>
              ) : filterMode === 'class' ? (
                classAttendance.length === 0 ? (
                  <p className="text-xs text-[#5C6478] text-center py-12">No attendance records found for {selectedClass}. Please upload the spreadsheet.</p>
                ) : (
                  <div className="space-y-2">
                    {classAttendance.map(row => (
                      <div key={row.id} className="p-2.5 bg-[#0B0E17]/50 border border-[rgba(255,255,255,0.03)] rounded-xl flex items-center justify-between text-xs hover:border-white/5 transition-all">
                        <div>
                          <span className="font-semibold text-[#F1F3F8]">{row.student_id} · {row.student_name}</span>
                          <span className="block text-[10px] text-[#5C6478] mt-0.5">{row.date}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          row.status.toLowerCase() === 'present' ? 'bg-[#10B981]/10 text-[#10B981]' :
                          row.status.toLowerCase() === 'late' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' :
                          'bg-[#EF4444]/10 text-[#EF4444]'
                        }`}>
                          {row.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                // Student Timeline
                !selectedStudentId ? (
                  <p className="text-xs text-[#5C6478] text-center py-12">Select an ID from the left panel.</p>
                ) : studentAttendance.length === 0 ? (
                  <p className="text-xs text-[#5C6478] text-center py-12">No registered attendance records found for this student ID.</p>
                ) : (
                  <div className="space-y-2">
                    {studentAttendance.map(row => (
                      <div key={row.id} className="p-2.5 bg-[#0B0E17]/50 border border-[rgba(255,255,255,0.03)] rounded-xl flex items-center justify-between text-xs hover:border-white/5 transition-all">
                        <span className="font-bold text-[#F1F3F8] font-mono">{row.date}</span>
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          row.status.toLowerCase() === 'present' ? 'bg-[#10B981]/10 text-[#10B981]' :
                          row.status.toLowerCase() === 'late' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' :
                          'bg-[#EF4444]/10 text-[#EF4444]'
                        }`}>
                          {row.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
