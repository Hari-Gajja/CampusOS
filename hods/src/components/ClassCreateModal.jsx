import { useState, useEffect } from 'react';
import { X, BookOpen, MapPin, UserCheck, Layers, Plus, Trash2, UserRound } from 'lucide-react';
import api from '../services/api';

const EMPTY_SUBJECT = { name: '', code: '', teacherId: '' };

export default function ClassCreateModal({ isOpen, onClose, onClassCreated, teachers = [], initialData }) {
  const [name, setName] = useState('');
  const [room, setRoom] = useState('Lab 3B');
  const [btechYear, setBtechYear] = useState('B.Tech 1st Year');
  const [mentorId, setMentorId] = useState('');
  const [subjects, setSubjects] = useState([{ ...EMPTY_SUBJECT }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setRoom(initialData.room || '');
      setBtechYear(initialData.btechYear || 'B.Tech 1st Year');
      setMentorId(initialData.mentorId?._id || initialData.mentorId || '');
      const existing = (initialData.subjects || []).map((s) => ({
        name: s.name || '',
        code: s.code || '',
        teacherId: s.teacherId?._id || s.teacherId || '',
      }));
      setSubjects(existing.length ? existing : [{ ...EMPTY_SUBJECT }]);
    } else {
      setName('');
      setRoom('Lab 3B');
      setBtechYear('B.Tech 1st Year');
      setMentorId('');
      setSubjects([{ ...EMPTY_SUBJECT }]);
    }
    setError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const updateSubject = (index, field, value) => {
    setSubjects((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const addSubject = () => setSubjects((prev) => [...prev, { ...EMPTY_SUBJECT }]);
  const removeSubject = (index) =>
    setSubjects((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      const cleanSubjects = subjects.filter((s) => s.name.trim() && s.teacherId);
      if (!cleanSubjects.length) {
        setError('Add at least one subject with an assigned teacher.');
        return;
      }

      const payload = {
        name,
        room,
        btechYear,
        mentorId: mentorId || undefined,
        subjects: cleanSubjects.map((s) => ({ name: s.name, code: s.code, teacherId: s.teacherId })),
      };

      if (initialData?._id) {
        await api.put(`/classes/${initialData._id}`, payload);
      } else {
        await api.post('/classes', payload);
      }

      if (onClassCreated) onClassCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save class.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl glass-panel rounded-3xl border border-slate-800 p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">
              {initialData?._id ? 'Edit B.Tech Class (Subjects & Mentor)' : 'Create B.Tech Class (Subjects & Mentor)'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Select B.Tech Academic Year
              </label>
              <select
                value={btechYear}
                onChange={(e) => setBtechYear(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-indigo-300 font-bold text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="B.Tech 1st Year">B.Tech 1st Year (Freshman)</option>
                <option value="B.Tech 2nd Year">B.Tech 2nd Year (Sophomore)</option>
                <option value="B.Tech 3rd Year">B.Tech 3rd Year (Junior)</option>
                <option value="B.Tech 4th Year">B.Tech 4th Year (Senior)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Class / Section Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. B.Tech 2nd Year - Section A"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Classroom / Hall Door
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Lab 3B"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Assign Class Mentor (optional)
              </label>
              <div className="relative">
                <UserRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={mentorId}
                  onChange={(e) => setMentorId(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="">No Mentor Assigned...</option>
                  {teachers.map((t) => (
                    <option key={t._id || t.id} value={t._id || t.id}>
                      {t.name} ({t.department || 'CS'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Subjects Inside This Class & Assigned Teachers
                </label>
              </div>
              <button
                type="button"
                onClick={addSubject}
                className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold flex items-center gap-1 hover:bg-indigo-500/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Subject</span>
              </button>
            </div>

            <div className="space-y-3">
              {subjects.map((subj, index) => (
                <div key={index} className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                      Subject #{index + 1}
                    </span>
                    {subjects.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSubject(index)}
                        className="p-1 text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
                        Subject Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Operating Systems"
                        value={subj.name}
                        onChange={(e) => updateSubject(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
                        Subject Code
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. CS-302"
                        value={subj.code}
                        onChange={(e) => updateSubject(index, 'code', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500 font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
                        Assign Teacher
                      </label>
                      <select
                        required
                        value={subj.teacherId}
                        onChange={(e) => updateSubject(index, 'teacherId', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">Select Teacher...</option>
                        {teachers.map((t) => (
                          <option key={t._id || t.id} value={t._id || t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-semibold shadow-lg shadow-indigo-500/25 disabled:opacity-50 flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              {loading ? 'Saving Class...' : initialData?._id ? 'Update Class' : 'Create B.Tech Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
