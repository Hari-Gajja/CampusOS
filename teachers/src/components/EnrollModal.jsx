import { useState, useEffect } from 'react';
import { X, Search, Check, UserPlus } from 'lucide-react';
import api from '../services/api';

export default function EnrollModal({ isOpen, onClose, schoolClass, onEnrolled }) {
  const [students, setStudents] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchStudents();
    }
  }, [isOpen]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users?role=student&limit=100');
      const all = res.data.data || [];
      setStudents(all);
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !schoolClass) return null;

  const toggleStudent = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedIds.length) return;
    try {
      setSubmitting(true);
      await api.post(`/classes/${schoolClass._id}/enroll`, { studentIds: selectedIds });
      if (onEnrolled) onEnrolled();
      onClose();
    } catch {
      // Do not fabricate data; keep modal open on failure.
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = students.filter(
    (s) =>
      (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.registrationNumber || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md glass-panel rounded-3xl border border-slate-800 p-6 space-y-5 shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-lg font-bold text-white">Enroll Students</h3>
            <p className="text-xs text-slate-400">Add to <span className="text-emerald-400 font-semibold">{schoolClass.name}</span></p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student name or reg number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Student List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">No students found.</p>
          ) : (
            filtered.map((s) => {
              const sid = s._id || s.id;
              const isSelected = selectedIds.includes(sid);
              return (
                <div
                  key={sid}
                  onClick={() => toggleStudent(sid)}
                  className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold text-white">{s.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{s.registrationNumber || s.email}</div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-lg flex items-center justify-center border ${
                      isSelected
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-slate-700 bg-slate-800'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Actions */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">{selectedIds.length} selected</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedIds.length || submitting}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-lg shadow-emerald-500/25 flex items-center gap-1.5 disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              <span>{submitting ? 'Enrolling...' : 'Enroll Selected'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
