import React, { useState } from 'react';
import { FileText, Download, Eye, RefreshCw, CheckCircle, BookOpen, BarChart3, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UploadStatus } from './UploadStatus';
import { WatchConfig } from '../types';

interface ReportsViewProps {
  watchConfig: WatchConfig;
  onRefreshConfig: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ watchConfig, onRefreshConfig }) => {
  const [selectedClass, setSelectedClass] = useState('JSS1');
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreview = async (type: string) => {
    setLoadingPreview(true);
    setError(null);
    setPreviewContent(null);
    setPreviewType(type);
    
    let url = `/api/reports/${type}`;
    if (type === 'class') {
      url += `?className=${selectedClass}`;
    }

    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(await res.text() || 'Failed to fetch report text.');
      }
      const text = await res.text();
      setPreviewContent(text);
      
      const titles: { [key: string]: string } = {
        student: 'Student Academic Summary',
        class: `${selectedClass} Academic Report`,
        attendance: 'Attendance Performance Analysis',
        performance: 'Performance & Support Summary'
      };
      setPreviewTitle(titles[type] || 'Report Preview');
    } catch (err: any) {
      setError(err.message || 'Could not load report preview.');
      // Open modal even with error so user can see what failed
      setPreviewContent(`Error: ${err.message}`);
      setPreviewTitle('Generation Failed');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleExport = (type: string, format: 'pdf' | 'docx') => {
    let url = `/api/reports/export?type=${type}&format=${format}`;
    if (type === 'class') {
      url += `&className=${selectedClass}`;
    }
    window.location.href = url;
  };

  return (
    <div className="space-y-6">
      {/* Header with Results Upload status */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[rgba(255,255,255,0.06)] pb-5">
        <div>
          <h1 className="text-xl font-extrabold text-[#F1F3F8]">Administrative Reports</h1>
          <p className="text-xs text-[#9AA3B8] mt-1">
            Generate and export fully detailed, school-wide attendance logs and academic report cards.
          </p>
        </div>
        <UploadStatus
          type="results"
          label="Upload Results Sheet (.xlsx)"
          isUploaded={watchConfig.results.uploaded}
          filePath={watchConfig.results.filePath}
          lastSynced={watchConfig.results.lastSynced}
          onUploadSuccess={() => {
            onRefreshConfig();
            setPreviewContent(null);
          }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Student Academic Summary */}
        <div className="p-4 bg-[#141924] border border-[rgba(255,255,255,0.06)] rounded-2xl flex flex-col justify-between hover:border-[#3B82F6]/30 transition-all shadow-lg">
          <div className="flex gap-3 items-start">
            <div className="p-2.5 bg-[#3B82F6]/10 rounded-xl text-[#3B82F6]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#F1F3F8]">Student Academic Summary</h3>
              <p className="text-xs text-[#9AA3B8] mt-1">
                Complete ledger of all registered students with their current subject grades and attendance aggregates.
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-4 pt-3 border-t border-[rgba(255,255,255,0.04)] justify-end">
            <button 
              onClick={() => fetchPreview('student')}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1D2433] hover:bg-[#3B82F6]/10 border border-[rgba(255,255,255,0.04)] text-[11px] text-white rounded-lg font-bold cursor-pointer transition-all"
            >
              <Eye className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span>Preview</span>
            </button>
            <button 
              onClick={() => handleExport('student', 'pdf')}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#3B82F6]/15 hover:bg-[#3B82F6]/30 border border-[#3B82F6]/20 text-[11px] text-[#3B82F6] rounded-lg font-bold cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
            <button 
              onClick={() => handleExport('student', 'docx')}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#8B5CF6]/15 hover:bg-[#8B5CF6]/30 border border-[#8B5CF6]/20 text-[11px] text-[#8B5CF6] rounded-lg font-bold cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Word</span>
            </button>
          </div>
        </div>

        {/* Card 2: Class Academic Report */}
        <div className="p-4 bg-[#141924] border border-[rgba(255,255,255,0.06)] rounded-2xl flex flex-col justify-between hover:border-[#8B5CF6]/30 transition-all shadow-lg">
          <div className="flex gap-3 items-start">
            <div className="p-2.5 bg-[#8B5CF6]/10 rounded-xl text-[#8B5CF6]">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-sm text-[#F1F3F8]">Class Academic Report</h3>
              <p className="text-xs text-[#9AA3B8] mt-1">
                Subject-by-subject performance, standard grade charts, and GPA tracking for specific classrooms.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[10px] text-[#5C6478] font-bold uppercase">Target Class:</span>
                <select
                  value={selectedClass}
                  onChange={e => setSelectedClass(e.target.value)}
                  className="bg-[#0B0E17] border border-[rgba(255,255,255,0.07)] rounded px-2 py-1 text-[10px] text-white font-bold focus:outline-none focus:border-[#8B5CF6] cursor-pointer"
                >
                  {['JSS1', 'JSS2', 'JSS3', 'SSS1', 'SSS2', 'SSS3'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4 pt-3 border-t border-[rgba(255,255,255,0.04)] justify-end">
            <button 
              onClick={() => fetchPreview('class')}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1D2433] hover:bg-[#8B5CF6]/10 border border-[rgba(255,255,255,0.04)] text-[11px] text-white rounded-lg font-bold cursor-pointer transition-all"
            >
              <Eye className="w-3.5 h-3.5 text-[#8B5CF6]" />
              <span>Preview</span>
            </button>
            <button 
              onClick={() => handleExport('class', 'pdf')}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#3B82F6]/15 hover:bg-[#3B82F6]/30 border border-[#3B82F6]/20 text-[11px] text-[#3B82F6] rounded-lg font-bold cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
            <button 
              onClick={() => handleExport('class', 'docx')}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#8B5CF6]/15 hover:bg-[#8B5CF6]/30 border border-[#8B5CF6]/20 text-[11px] text-[#8B5CF6] rounded-lg font-bold cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Word</span>
            </button>
          </div>
        </div>

        {/* Card 3: Attendance Performance Analysis */}
        <div className="p-4 bg-[#141924] border border-[rgba(255,255,255,0.06)] rounded-2xl flex flex-col justify-between hover:border-[#10B981]/30 transition-all shadow-lg">
          <div className="flex gap-3 items-start">
            <div className="p-2.5 bg-[#10B981]/10 rounded-xl text-[#10B981]">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#F1F3F8]">Attendance Analysis</h3>
              <p className="text-xs text-[#9AA3B8] mt-1">
                Overall analysis of school attendance, highlight attention-needed groups, and list chronologically absent students.
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-4 pt-3 border-t border-[rgba(255,255,255,0.04)] justify-end">
            <button 
              onClick={() => fetchPreview('attendance')}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1D2433] hover:bg-[#10B981]/10 border border-[rgba(255,255,255,0.04)] text-[11px] text-white rounded-lg font-bold cursor-pointer transition-all"
            >
              <Eye className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Preview</span>
            </button>
            <button 
              onClick={() => handleExport('attendance', 'pdf')}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#3B82F6]/15 hover:bg-[#3B82F6]/30 border border-[#3B82F6]/20 text-[11px] text-[#3B82F6] rounded-lg font-bold cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
            <button 
              onClick={() => handleExport('attendance', 'docx')}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#8B5CF6]/15 hover:bg-[#8B5CF6]/30 border border-[#8B5CF6]/20 text-[11px] text-[#8B5CF6] rounded-lg font-bold cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Word</span>
            </button>
          </div>
        </div>

        {/* Card 4: Performance Summary */}
        <div className="p-4 bg-[#141924] border border-[rgba(255,255,255,0.06)] rounded-2xl flex flex-col justify-between hover:border-[#EAB308]/30 transition-all shadow-lg">
          <div className="flex gap-3 items-start">
            <div className="p-2.5 bg-[#EAB308]/10 rounded-xl text-[#EAB308]">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#F1F3F8]">Performance & Honor Roll</h3>
              <p className="text-xs text-[#9AA3B8] mt-1">
                Analysis of academic achievers, average school grades per term, and listing students requiring immediate tutorial help.
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-4 pt-3 border-t border-[rgba(255,255,255,0.04)] justify-end">
            <button 
              onClick={() => fetchPreview('performance')}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1D2433] hover:bg-[#EAB308]/10 border border-[rgba(255,255,255,0.04)] text-[11px] text-white rounded-lg font-bold cursor-pointer transition-all"
            >
              <Eye className="w-3.5 h-3.5 text-[#EAB308]" />
              <span>Preview</span>
            </button>
            <button 
              onClick={() => handleExport('performance', 'pdf')}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#3B82F6]/15 hover:bg-[#3B82F6]/30 border border-[#3B82F6]/20 text-[11px] text-[#3B82F6] rounded-lg font-bold cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
            <button 
              onClick={() => handleExport('performance', 'docx')}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#8B5CF6]/15 hover:bg-[#8B5CF6]/30 border border-[#8B5CF6]/20 text-[11px] text-[#8B5CF6] rounded-lg font-bold cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Word</span>
            </button>
          </div>
        </div>

      </div>

      {/* Loading indicator overlay */}
      {loadingPreview && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="p-6 bg-[#141924] border border-white/5 rounded-2xl flex flex-col items-center gap-3 text-center shadow-xl">
            <RefreshCw className="w-8 h-8 animate-spin text-[#3B82F6]" />
            <span className="text-xs font-semibold text-white">Compiling statistical tables from SQLite...</span>
          </div>
        </div>
      )}

      {/* Full-view Preview Modal */}
      <AnimatePresence>
        {previewContent && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 sm:p-6">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#141924] border border-[rgba(255,255,255,0.08)] rounded-3xl w-11/12 max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-[rgba(255,255,255,0.06)] bg-[#1D2433]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#3B82F6]/10 rounded-xl text-[#3B82F6]">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-[#F1F3F8]">{previewTitle}</h3>
                    <p className="text-[11px] text-[#9AA3B8]">Audit report contents on-screen before download</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Export Buttons */}
                  <button 
                    onClick={() => previewType && handleExport(previewType, 'pdf')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3B82F6]/15 hover:bg-[#3B82F6]/30 border border-[#3B82F6]/20 text-xs text-[#3B82F6] rounded-xl font-bold cursor-pointer transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                  <button 
                    onClick={() => previewType && handleExport(previewType, 'docx')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8B5CF6]/15 hover:bg-[#8B5CF6]/30 border border-[#8B5CF6]/20 text-xs text-[#8B5CF6] rounded-xl font-bold cursor-pointer transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Word</span>
                  </button>
                  {/* Close Button */}
                  <button 
                    onClick={() => {
                      setPreviewContent(null);
                      setPreviewType(null);
                    }}
                    className="ml-2 px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl font-bold text-xs transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-[#0B0E17]/85 font-mono text-xs sm:text-sm text-[#E2E8F0] whitespace-pre leading-relaxed select-text">
                {previewContent}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
