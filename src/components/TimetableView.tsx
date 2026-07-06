import React, { useState, useEffect } from 'react';
import { Calendar, Sparkles, Download, RefreshCw, CheckCircle, AlertTriangle, FileText, Trash2, Plus, Minus, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TimetableSlot {
  id: number;
  class_name: string;
  day_of_week: string;
  period_number: number;
  subject: string;
  teacher_id: string;
  teacher_name: string;
}

interface CurriculumSubject {
  id: number;
  class: string;
  subject: string;
  is_double_period: number;
  periods_per_week: number;
}

export const TimetableView: React.FC = () => {
  const [selectedClass, setSelectedClass] = useState('JSS1');
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Curriculum State
  const [curriculum, setCurriculum] = useState<CurriculumSubject[]>([]);
  const [curriculumLoading, setCurriculumLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Add Subject Form State
  const [formClass, setFormClass] = useState('JSS1');
  const [formSubject, setFormSubject] = useState('');
  const [formIsDouble, setFormIsDouble] = useState(false);
  const [formPeriods, setFormPeriods] = useState('1');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Columns specification (periods + breaks)
  // Column indices: Period 1, 2, 3, Short Break, Period 4, 5, 6, Lunch Break, Period 7, 8
  const columns = [
    { type: 'period', num: 1, time: '08:00 - 08:40', label: 'Period 1' },
    { type: 'period', num: 2, time: '08:40 - 09:20', label: 'Period 2' },
    { type: 'period', num: 3, time: '09:20 - 10:00', label: 'Period 3' },
    { type: 'break', name: 'Short Break', time: '10:00 - 10:15', label: 'Break' },
    { type: 'period', num: 4, time: '10:15 - 10:55', label: 'Period 4' },
    { type: 'period', num: 5, time: '10:55 - 11:35', label: 'Period 5' },
    { type: 'period', num: 6, time: '11:35 - 12:15', label: 'Period 6' },
    { type: 'break', name: 'Lunch Break', time: '12:15 - 12:45', label: 'Lunch' },
    { type: 'period', num: 7, time: '12:45 - 13:25', label: 'Period 7' },
    { type: 'period', num: 8, time: '13:25 - 14:05', label: 'Period 8' },
  ];

  const fetchSchedule = async (className: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/timetable?className=${className}`);
      if (!res.ok) throw new Error('Failed to retrieve timetable slots.');
      const data = await res.json();
      
      const mappedSlots: TimetableSlot[] = [];
      if (data && data.grid) {
        Object.keys(data.grid).forEach(day => {
          const daySlots = data.grid[day];
          daySlots.forEach((slot: any) => {
            if (slot) {
              mappedSlots.push({
                id: slot.period,
                class_name: className,
                day_of_week: day,
                period_number: slot.period,
                subject: slot.subject,
                teacher_id: slot.teacher_id,
                teacher_name: slot.teacher_name
              });
            }
          });
        });
      }
      setSlots(mappedSlots);
    } catch (err: any) {
      setError(err.message || 'Server error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurriculum = async (classVal: string) => {
    setCurriculumLoading(true);
    try {
      const res = await fetch(`/api/curriculum?class=${classVal}`);
      if (!res.ok) throw new Error('Failed to retrieve curriculum.');
      const data = await res.json();
      setCurriculum(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setCurriculumLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule(selectedClass);
    fetchCurriculum(selectedClass);
  }, [selectedClass]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/timetable/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ className: selectedClass })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate timetable.');

      setSuccessMsg(`Clash-free weekly schedule generated successfully for ${selectedClass}!`);
      fetchSchedule(selectedClass);
    } catch (err: any) {
      setError(err.message || 'Optimization solver failed.');
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdatePeriods = async (id: number, currentPeriods: number, increment: boolean) => {
    const newPeriods = increment ? currentPeriods + 1 : currentPeriods - 1;
    if (newPeriods < 1 || newPeriods > 10) {
      setError("Periods per week must be between 1 and 10.");
      return;
    }
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/curriculum/update-periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, periods_per_week: newPeriods })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update curriculum periods.');
      }
      setSuccessMsg('Curriculum periods updated successfully.');
      fetchCurriculum(selectedClass);
    } catch (err: any) {
      setError(err.message || 'Error updating periods.');
    }
  };

  const handleDeleteSubject = async (id: number) => {
    if (!window.confirm('Are you sure you want to remove this subject from the class curriculum? This will immediately affect future timetable generation.')) {
      return;
    }
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/curriculum/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete subject.');
      setSuccessMsg('Subject removed from curriculum successfully.');
      fetchCurriculum(selectedClass);
    } catch (err: any) {
      setError(err.message || 'Error deleting subject.');
    }
  };

  const handleDoublePeriodChange = (checked: boolean) => {
    setFormIsDouble(checked);
    setFormPeriods(checked ? '2' : '1');
  };

  const handleAddSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSubject.trim()) {
      setFormError('Subject name is required.');
      return;
    }
    setFormError(null);
    setFormSubmitting(true);
    try {
      const res = await fetch('/api/curriculum/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class: formClass,
          subject: formSubject,
          is_double_period: formIsDouble,
          periods_per_week: Number(formPeriods)
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add curriculum subject.');
      }

      setSuccessMsg(`Subject "${formSubject.trim()}" added to curriculum for ${formClass}!`);
      setShowAddModal(false);
      setFormSubject('');
      setFormIsDouble(false);
      setFormPeriods('1');
      
      if (formClass === selectedClass) {
        fetchCurriculum(selectedClass);
      }
    } catch (err: any) {
      setFormError(err.message || 'Error adding subject.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleExport = (format: 'pdf' | 'docx') => {
    window.location.href = `/api/timetable/export?className=${selectedClass}&format=${format}`;
  };

  const getSlotCell = (day: string, periodNum: number) => {
    const slot = slots.find(s => s.day_of_week === day && s.period_number === periodNum);
    if (!slot) return null;
    return slot;
  };

  return (
    <div className="space-y-6">
      {/* Header section with generation control */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[rgba(255,255,255,0.06)] pb-5">
        <div>
          <h1 className="text-xl font-extrabold text-[#F1F3F8]">Weekly Timetables</h1>
          <p className="text-xs text-[#9AA3B8] mt-1">
            Build and optimize clash-free weekly lecture timetables matching instructor workload.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-bold text-[#9AA3B8]">Class Assignment:</label>
          <select
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="bg-[#141924] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-1.5 text-xs text-[#F1F3F8] font-bold focus:outline-none focus:border-[#3B82F6] cursor-pointer"
          >
            {['JSS1', 'JSS2', 'JSS3', 'SSS1', 'SSS2', 'SSS3'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button 
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] disabled:opacity-50 text-white rounded-lg transition-all cursor-pointer shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{generating ? 'Optimizing Clashes...' : 'Generate / Optimize'}</span>
          </button>
        </div>
      </div>

      {/* Banners */}
      {successMsg && (
        <div className="p-3.5 bg-[#10B981]/10 border border-[#10B981]/20 rounded-xl text-xs font-semibold text-[#10B981] flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="p-3.5 bg-[#EF4444]/15 border border-[#EF4444]/25 rounded-xl text-xs font-semibold text-[#EF4444] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Export Tray */}
      {slots.length > 0 && (
        <div className="flex justify-end gap-2.5">
          <button
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#1D2433] hover:bg-[#3B82F6]/20 border border-[rgba(255,255,255,0.05)] text-xs text-white rounded-lg font-semibold transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={() => handleExport('docx')}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#1D2433] hover:bg-[#8B5CF6]/20 border border-[rgba(255,255,255,0.05)] text-xs text-white rounded-lg font-semibold transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#8B5CF6]" />
            <span>Export Word</span>
          </button>
        </div>
      )}

      {/* Grid view */}
      <div className="bg-[#141924] border border-[rgba(255,255,255,0.06)] rounded-2xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="py-24 text-center text-xs text-[#5C6478] font-medium flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-[#3B82F6]" />
            <span>Loading week schedule...</span>
          </div>
        ) : slots.length === 0 ? (
          <div className="py-24 text-center text-xs text-[#5C6478] font-medium flex flex-col items-center gap-3">
            <Calendar className="w-10 h-10 mb-2" />
            <p className="text-sm font-bold text-white">No active timetable for {selectedClass}</p>
            <p className="text-[#9AA3B8] max-w-sm">
              Press the "Generate / Optimize" button at the top right to build a clash-free weekly course block schedule.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse min-w-[900px]">
              <thead>
                {/* Header row for Periods and Breaks */}
                <tr className="bg-[#1D2433]/50 border-b border-[rgba(255,255,255,0.05)] text-[10px] text-[#9AA3B8] font-bold uppercase tracking-wider">
                  <th className="p-3 text-left pl-4 w-28 bg-[#141924]">Weekday</th>
                  {columns.map((col, idx) => (
                    <th key={idx} className={`p-2 border-r border-[rgba(255,255,255,0.03)] ${col.type === 'break' ? 'bg-[#0B0E17]/40 w-16' : ''}`}>
                      <div className="text-xs text-white font-extrabold">{col.label}</div>
                      <div className="text-[9px] font-mono font-medium text-[#5C6478] mt-0.5">{col.time}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.04)] text-xs text-[#F1F3F8]">
                {days.map(day => (
                  <tr key={day} className="hover:bg-[#1D2433]/10 transition-colors">
                    <td className="p-4 font-bold text-[#F1F3F8] text-left pl-4 bg-[#141924] border-r border-[rgba(255,255,255,0.04)]">
                      {day}
                    </td>
                    {(() => {
                      let skipCount = 0;
                      return columns.map((col, idx) => {
                        if (skipCount > 0) {
                          skipCount--;
                          return null;
                        }

                        if (col.type === 'break') {
                          return (
                            <td key={idx} className="p-2 bg-[#0B0E17]/40 border-r border-[rgba(255,255,255,0.03)] select-none">
                              <span className="text-[9px] italic text-[#5C6478] tracking-widest uppercase writing-mode-vertical">
                                {col.name === 'Short Break' ? 'B R E A K' : 'L U N C H'}
                              </span>
                            </td>
                          );
                        }

                        const cell = getSlotCell(day, col.num!);
                        
                        // Check if this cell is a consecutive double period with the next period column
                        let isDouble = false;
                        const nextCol = columns[idx + 1];
                        if (nextCol && nextCol.type === 'period' && cell && cell.subject !== 'Study Hall' && cell.subject !== 'FREE') {
                          const nextCell = getSlotCell(day, nextCol.num!);
                          if (nextCell && cell.subject === nextCell.subject && cell.teacher_id === nextCell.teacher_id) {
                            const p1 = col.num!;
                            const p2 = nextCol.num!;
                            const isValidPair = (p1 === 1 && p2 === 2) || (p1 === 2 && p2 === 3) ||
                                                (p1 === 4 && p2 === 5) || (p1 === 5 && p2 === 6) ||
                                                (p1 === 7 && p2 === 8);
                            if (isValidPair) {
                              isDouble = true;
                            }
                          }
                        }

                        if (isDouble) {
                          skipCount = 1;
                        }

                        return (
                          <td 
                            key={idx} 
                            colSpan={isDouble ? 2 : 1} 
                            className="p-2 border-r border-[rgba(255,255,255,0.03)] align-middle"
                          >
                            {cell ? (
                              <div className={`bg-[#1D2433]/55 border ${isDouble ? 'border-[#3B82F6]/50 bg-gradient-to-r from-[#3B82F6]/10 to-transparent' : 'border-[rgba(255,255,255,0.04)]'} p-2 rounded-xl text-center space-y-1 hover:border-[#3B82F6]/30 transition-all duration-200`}>
                                <span className="block font-extrabold text-[#3B82F6] text-[11px] truncate">
                                  {cell.subject} {isDouble && <span className="text-[9px] text-[#8B5CF6] uppercase tracking-wider font-bold ml-1 px-1.5 py-0.5 bg-[#8B5CF6]/10 rounded">Double</span>}
                                </span>
                                <span className="block text-[10px] text-[#9AA3B8] font-bold truncate">
                                  {cell.teacher_id} · {cell.teacher_name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-[#5C6478] italic">-</span>
                            )}
                          </td>
                        );
                      });
                    })()}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Curriculum Manager Section */}
      <div className="bg-[#141924] border border-[rgba(255,255,255,0.06)] rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[rgba(255,255,255,0.06)] pb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#8B5CF6]" />
            <div>
              <h3 className="font-extrabold text-sm text-[#F1F3F8]">Class Curriculum Management</h3>
              <p className="text-[11px] text-[#9AA3B8]">Subjects and active lecture rules assigned for {selectedClass}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setFormClass(selectedClass);
              setFormSubject('');
              setFormIsDouble(false);
              setFormPeriods('1');
              setFormError(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#1D2433] hover:bg-[#3B82F6]/15 border border-[rgba(255,255,255,0.06)] text-white rounded-lg transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>+ Add Subject</span>
          </button>
        </div>

        {curriculumLoading ? (
          <div className="py-8 text-center text-xs text-[#5C6478] font-medium flex flex-col items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#3B82F6]" />
            <span>Loading curriculum subjects...</span>
          </div>
        ) : curriculum.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#5C6478]">
            No curriculum subjects found for {selectedClass}. Set some up first!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-4">
            {curriculum.map((subj) => (
              <div 
                key={subj.id} 
                className="bg-[#1D2433]/30 border border-white/5 p-3 rounded-xl flex items-center justify-between hover:border-white/10 transition-all"
              >
                <div className="space-y-0.5 flex-1 pr-2">
                  <div className="font-bold text-white text-xs">{subj.subject}</div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] text-[#9AA3B8] font-bold">Periods:</span>
                      <div className="flex items-center gap-1 bg-[#0B0E17] border border-white/5 rounded px-1 py-0.5">
                        <button
                          type="button"
                          onClick={() => handleUpdatePeriods(subj.id, subj.periods_per_week, false)}
                          className="p-0.5 text-[#9AA3B8] hover:text-white hover:bg-white/5 rounded transition-all cursor-pointer"
                          title="Decrease Periods"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="text-[11px] font-bold text-[#F1F3F8] px-1 min-w-[12px] text-center">
                          {subj.periods_per_week}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdatePeriods(subj.id, subj.periods_per_week, true)}
                          className="p-0.5 text-[#9AA3B8] hover:text-white hover:bg-white/5 rounded transition-all cursor-pointer"
                          title="Increase Periods"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                    {subj.is_double_period === 1 && (
                      <div className="flex">
                        <span className="bg-[#8B5CF6]/10 text-[#8B5CF6] text-[9px] font-bold px-1.5 py-0.5 rounded">
                          Double Period
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteSubject(subj.id)}
                  className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition-all cursor-pointer"
                  title="Remove subject"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Subject Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#141924] border border-[rgba(255,255,255,0.08)] rounded-2xl w-full max-w-md overflow-hidden shadow-xl"
            >
              <div className="p-4 border-b border-[rgba(255,255,255,0.06)] bg-[#1D2433]/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#3B82F6]" />
                  <h3 className="font-extrabold text-sm text-[#F1F3F8]">Add Curriculum Subject</h3>
                </div>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="text-xs text-[#9AA3B8] hover:text-white px-2 py-1 bg-[#0B0E17] rounded-lg border border-[rgba(255,255,255,0.06)] transition-all"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleAddSubjectSubmit} className="p-4 space-y-4 text-xs">
                {formError && (
                  <div className="p-2 bg-[#EF4444]/15 border border-[#EF4444]/25 text-[#EF4444] rounded-lg font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[#9AA3B8] font-bold">Class Assignment *</label>
                  <select
                    value={formClass}
                    onChange={e => setFormClass(e.target.value)}
                    className="w-full bg-[#0B0E17] border border-[rgba(255,255,255,0.07)] rounded-lg px-2.5 py-1.5 text-[#F1F3F8] focus:outline-none focus:border-[#3B82F6] cursor-pointer"
                  >
                    {['JSS1', 'JSS2', 'JSS3', 'SSS1', 'SSS2', 'SSS3'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[#9AA3B8] font-bold">Subject Name *</label>
                  <input
                    type="text"
                    required
                    value={formSubject}
                    onChange={e => setFormSubject(e.target.value)}
                    placeholder="e.g., Physics, Social Studies"
                    className="w-full bg-[#0B0E17] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-1.5 text-[#F1F3F8] focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-[#1D2433]/30 border border-white/5 rounded-xl">
                  <div className="space-y-0.5">
                    <div className="font-bold text-white">Double Period</div>
                    <div className="text-[10px] text-[#9AA3B8]">Requires two consecutive class hours</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formIsDouble}
                    onChange={e => handleDoublePeriodChange(e.target.checked)}
                    className="w-4 h-4 rounded text-[#3B82F6] bg-[#0B0E17] border-white/10 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[#9AA3B8] font-bold">Periods Per Week *</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={formPeriods}
                    onChange={e => setFormPeriods(e.target.value)}
                    className="w-full bg-[#0B0E17] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-1.5 text-[#F1F3F8] focus:outline-none focus:border-[#3B82F6]"
                  />
                  <p className="text-[10px] text-[#5C6478]">Recommended: 2 periods for double blocks, 1 or 2 for others.</p>
                </div>

                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="w-full py-2 bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] hover:brightness-110 disabled:opacity-50 text-white font-bold rounded-lg transition-all cursor-pointer text-center"
                >
                  {formSubmitting ? 'Adding...' : 'Add Subject to Curriculum'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
