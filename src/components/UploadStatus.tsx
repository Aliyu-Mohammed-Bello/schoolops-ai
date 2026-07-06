import React, { useState } from 'react';
import { Upload, CheckCircle2, RefreshCw, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

interface UploadStatusProps {
  type: 'students' | 'teachers' | 'attendance' | 'results';
  label: string;
  isUploaded: boolean;
  filePath: string | null;
  lastSynced: string | null;
  onUploadSuccess: (imported: number, errors: string[]) => void;
}

export const UploadStatus: React.FC<UploadStatusProps> = ({
  type,
  label,
  isUploaded,
  filePath,
  lastSynced,
  onUploadSuccess
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    const formData = new FormData();
    formData.append('file', file);
    
    setUploading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/data/${type}/upload`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload spreadsheet.');
      }
      
      onUploadSuccess(data.rowsImported, data.errors || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Server unreachable or sync failed.');
    } finally {
      setUploading(false);
    }
  };

  // Extract simple filename from path
  const getFileName = () => {
    if (!filePath) return `${type}.xlsx`;
    const parts = filePath.split(/[/\\]/);
    return parts[parts.length - 1];
  };

  if (isUploaded) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs text-[#9AA3B8] font-medium py-1 px-3 bg-[#141924] rounded-lg border border-[rgba(255,255,255,0.04)] w-fit transition-all hover:border-[#3B82F6]/30">
        <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] animate-pulse" />
        <span>Synced from <strong className="text-[#F1F3F8]">{getFileName()}</strong> · edits save automatically</span>
        {lastSynced && (
          <span className="text-[#5C6478] font-normal">
            (Last: {new Date(lastSynced).toLocaleTimeString()})
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 w-fit">
      <label className="relative flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-[#3B82F6]/10 to-[#8B5CF6]/10 border border-[#3B82F6]/30 hover:border-[#8B5CF6]/60 text-white rounded-lg cursor-pointer transition-all hover:shadow-sm">
        <Upload className="w-3.5 h-3.5 text-[#3B82F6]" />
        <span>{uploading ? 'Analyzing File...' : label}</span>
        <input
          type="file"
          accept=".xlsx,.csv"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </label>
      {error && (
        <span className="flex items-center gap-1 text-[10px] text-[#EF4444] font-medium max-w-xs">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          {error}
        </span>
      )}
    </div>
  );
};
