import React, { useState, useEffect } from 'react';
import { Search, Plus, UserPlus, Info, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TeacherRecord, WatchConfig } from '../types';
import { UploadStatus } from './UploadStatus';

interface TeachersViewProps {
  watchConfig: WatchConfig;
  onRefreshConfig: () => void;
}

export const TeachersView: React.FC<TeachersViewProps> = ({ watchConfig, onRefreshConfig }) => {
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [subject, setSubject] = useState('');
  const [workload, setWorkload] = useState(15);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Success summary banner
  const [uploadFeedback, setUploadFeedback] = useState<{ count: number, errors: string[] } | null>(null);

  const fetchTeachers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/teachers');
      if (!res.ok) throw new Error('Failed to load teacher records.');
      const data = await res.json();
      setTeachers(data);
    } catch (err: any) {
      setError(err.message || 'Server error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !subject.trim()) {
      setModalError('All fields marked with * are required.');
      return;
    }

    setSaving(true);
    setModalError(null);

    try {
      const res = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          subject,
          workload: Number(workload)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add teacher');

      // Refresh table & Close modal
      fetchTeachers();
      onRefreshConfig();
      setShowAddModal(false);

      // Clear inputs
      setFirstName('');
      setLastName('');
      setSubject('');
      setWorkload(15);
    } catch (err: any) {
      setModalError(err.message || 'Server error occurred.');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadSuccess = (imported: number, errors: string[]) => {
    setUploadFeedback({ count: imported, errors });
    fetchTeachers();
    onRefreshConfig();
  };

  const filtered = teachers.filter(t => {
    const term = search.toLowerCase();
    return (
      t.teacher_id.toLowerCase().includes(term) ||
      t.full_name.toLowerCase().includes(term) ||
      t.subject.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header section with upload control */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[rgba(255,255,255,0.06)] pb-5">
        <div>
          <h1 className="text-xl font-extrabold text-[#F1F3F8]">Teacher Roster</h1>
          <p className="text-xs text-[#9AA3B8] mt-1">
            Manage teacher accounts, curriculum subjects, and period workload distribution.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <UploadStatus
            type="teachers"
            label="Upload Teacher List (.xlsx)"
            isUploaded={watchConfig.teachers.uploaded}
            filePath={watchConfig.teachers.filePath}
            lastSynced={watchConfig.teachers.lastSynced}
            onUploadSuccess={handleUploadSuccess}
          />
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] hover:brightness-110 text-white rounded-lg transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Teacher</span>
          </button>
        </div>
      </div>

      {/* Upload Feedback Banner */}
      {uploadFeedback && (
        <div className="p-4 bg-[#141924] border border-[#10B981]/20 rounded-xl flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold text-[#10B981]">
              <Check className="w-4 h-4" />
              Excel File Imported Successfully
            </span>
            <button 
              onClick={() => setUploadFeedback(null)}
              className="text-[10px] text-[#5C6478] hover:text-white underline"
            >
              Dismiss
            </button>
          </div>
          <p className="text-xs text-[#9AA3B8]">
            Successfully synced <strong className="text-[#F1F3F8]">{uploadFeedback.count}</strong> records to SQLite. Demo data cleared.
          </p>
          {uploadFeedback.errors.length > 0 && (
            <div className="mt-2 text-[10px] bg-[#EF4444]/10 border border-[#EF4444]/20 p-2 rounded max-h-24 overflow-y-auto">
              <span className="font-bold text-[#EF4444]">Row Warnings ({uploadFeedback.errors.length}):</span>
              <ul className="list-disc pl-4 mt-1 text-[#9AA3B8] space-y-0.5">
                {uploadFeedback.errors.map((e, idx) => <li key={idx}>{e}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#5C6478] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by teacher name, ID, or subject..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#141924] border border-[rgba(255,255,255,0.06)] rounded-xl pl-10 pr-4 py-2 text-sm text-[#F1F3F8] placeholder-[#5C6478] focus:outline-none focus:border-[#3B82F6]"
          />
        </div>
        <button 
          onClick={fetchTeachers} 
          className="p-2 bg-[#141924] hover:bg-[#1D2433] rounded-xl border border-[rgba(255,255,255,0.06)] transition-all flex items-center justify-center text-[#9AA3B8] hover:text-white"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Teacher Table */}
      <div className="bg-[#141924] border border-[rgba(255,255,255,0.06)] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-[#5C6478] font-medium flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-[#3B82F6]" />
            <span>Loading rosters from SQLite...</span>
          </div>
        ) : error ? (
          <div className="py-12 text-center text-xs text-[#EF4444] font-medium">
            Error: {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#5C6478] font-medium">
            No teachers found matching "{search}".
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#1D2433]/40 border-b border-[rgba(255,255,255,0.04)] text-[#9AA3B8] font-semibold">
                  <th className="p-3 pl-4">ID</th>
                  <th className="p-3">Full Name</th>
                  <th className="p-3">Subject Specialization</th>
                  <th className="p-3 pr-4">Weekly Workload (Periods)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.04)] text-[#F1F3F8]">
                {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-[#1D2433]/20 transition-colors">
                    <td className="p-3 pl-4 font-mono font-semibold text-[#8B5CF6]">{t.teacher_id}</td>
                    <td className="p-3 font-semibold">{t.full_name}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-[#8B5CF6]/10 rounded font-semibold text-[#8B5CF6]">
                        {t.subject}
                      </span>
                    </td>
                    <td className="p-3 pr-4 font-mono font-bold text-[#F1F3F8]">{t.workload} periods</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Teacher Registration Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#141924] border border-[rgba(255,255,255,0.08)] rounded-2xl w-full max-w-md overflow-hidden shadow-xl"
            >
              <div className="p-4 border-b border-[rgba(255,255,255,0.06)] bg-[#1D2433]/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-[#8B5CF6]" />
                  <h3 className="font-extrabold text-sm text-[#F1F3F8]">Register New Instructor</h3>
                </div>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="text-xs text-[#9AA3B8] hover:text-white px-2 py-1 bg-[#0B0E17] rounded-lg border border-[rgba(255,255,255,0.06)] transition-all"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleAddTeacher} className="p-4 space-y-3 text-xs">
                {modalError && (
                  <div className="p-2 bg-[#EF4444]/15 border border-[#EF4444]/25 text-[#EF4444] rounded-lg font-medium flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[#9AA3B8] font-bold">First Name *</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      placeholder="e.g., Jane"
                      className="w-full bg-[#0B0E17] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-1.5 text-[#F1F3F8] focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[#9AA3B8] font-bold">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      placeholder="e.g., Doe"
                      className="w-full bg-[#0B0E17] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-1.5 text-[#F1F3F8] focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[#9AA3B8] font-bold">Subject Specialization *</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="e.g., Mathematics, Chemistry, English"
                    className="w-full bg-[#0B0E17] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-1.5 text-[#F1F3F8] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[#9AA3B8] font-bold">Weekly Period Allocation (Workload)</label>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={workload}
                    onChange={e => setWorkload(Number(e.target.value))}
                    className="w-full bg-[#0B0E17] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-1.5 text-[#F1F3F8] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-2 bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] hover:brightness-110 disabled:opacity-50 text-white rounded-lg font-bold transition-all"
                  >
                    {saving ? 'Registering Instructor...' : 'Register Instructor'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
