import { useState } from 'react';
import { X, Upload, FileText, Check, AlertCircle } from 'lucide-react';
import { parseCSVText } from '../utils/helpers';
import api from '../services/api';

export default function BulkImportModal({ isOpen, onClose, onImportDone }) {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const rows = parseCSVText(text);
        setParsedData(rows);
      } catch (err) {
        setError('Failed to parse CSV file structure.');
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (!parsedData.length) return;
    try {
      setImporting(true);
      setError('');

      // Create each parsed user in loop or bulk call
      for (const row of parsedData) {
        await api.post('/auth/register', {
          name: row.name || 'Student',
          email: row.email,
          password: row.password || 'CampusOS2026!',
          role: row.role || 'student',
          registrationNumber: row.registrationNumber,
          department: row.department,
        }).catch(() => null);
      }

      if (onImportDone) onImportDone();
      onClose();
    } catch {
      setError('An error occurred during bulk import execution.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-xl glass-panel rounded-3xl border border-slate-800 p-6 space-y-5 shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-rose-400" />
            <h3 className="text-lg font-bold text-white">CSV Bulk Import Users</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-400 uppercase">
            Upload CSV File (Headers: name, email, password, role, registrationNumber)
          </label>
          <div className="p-6 rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/50 text-center space-y-2 cursor-pointer hover:border-rose-500/40 transition-colors relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <FileText className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-xs text-slate-300 font-medium">
              {file ? file.name : 'Click or drop CSV file here to preview'}
            </p>
          </div>
        </div>

        {/* Parsed Preview Table */}
        {parsedData.length > 0 && (
          <div className="flex-1 overflow-y-auto border border-slate-800 rounded-2xl bg-slate-900/80 p-3 space-y-2">
            <div className="text-xs font-semibold text-rose-400 uppercase">
              Parsed Preview ({parsedData.length} records ready)
            </div>
            <div className="divide-y divide-slate-800 text-xs text-slate-300">
              {parsedData.slice(0, 5).map((r, i) => (
                <div key={i} className="py-2 flex items-center justify-between">
                  <span className="font-semibold text-white">{r.name} ({r.role})</span>
                  <span className="font-mono text-slate-400">{r.email}</span>
                </div>
              ))}
              {parsedData.length > 5 && (
                <div className="pt-2 text-[11px] text-slate-500 text-center">
                  + {parsedData.length - 5} more users in file...
                </div>
              )}
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!parsedData.length || importing}
            className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow-lg shadow-rose-500/25 disabled:opacity-50"
          >
            {importing ? 'Importing Users...' : 'Confirm Bulk Import'}
          </button>
        </div>
      </div>
    </div>
  );
}
