import { useState, useEffect } from 'react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import { BookOpen, Users, UserRound } from 'lucide-react';

export default function ClassManagement() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);

  useEffect(() => {
    fetchClassesAndTeachers();
  }, []);

  const fetchClassesAndTeachers = async () => {
    try {
      setLoading(true);
      setError(null);
      const [clsRes, userRes] = await Promise.all([
        api.get('/classes').catch(() => null),
        api.get('/users?role=teacher').catch(() => null),
      ]);

      if (clsRes?.data?.classes) setClasses(clsRes.data.classes);
      else setClasses([]);

      if (userRes?.data?.data) setTeachers(userRes.data.data);
    } catch {
      setError('Failed to load classes.');
    } finally {
      setLoading(false);
    }
  };

  const handleReassignMentor = async (classId, mentorId) => {
    try {
      await api.put(`/classes/${classId}`, { mentorId: mentorId || null });
      fetchClassesAndTeachers();
    } catch {
      setError('Failed to reassign mentor.');
    }
  };

  const handleReassignTeacher = async (classId, teacherId) => {
    try {
      const cls = classes.find((c) => c._id === classId);
      const currentSubjects = (cls?.subjects || []).map((s) => ({
        name: s.name,
        code: s.code,
        teacherId: s.teacherId?._id || s.teacherId,
      }));
      await api.put(`/classes/${classId}`, { teacherId });
      // Keep subjects intact; only primary fallback teacher changes.
      if (currentSubjects.length) {
        await api.put(`/classes/${classId}`, { subjects: currentSubjects });
      }
      fetchClassesAndTeachers();
    } catch {
      setError('Failed to reassign faculty.');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-rose-400" />
          Institution Class Management — Subjects, Teachers & Mentors
        </h1>
        <p className="text-slate-400 text-sm mt-1">System-wide class inspection, mentor assignment and faculty reassignments</p>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchClassesAndTeachers} />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((cls) => (
          <div key={cls._id} className="p-6 rounded-3xl glass-card border border-slate-800 space-y-4">
            <div>
              <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono font-semibold">
                {cls.subject || (cls.subjects?.length ? cls.subjects[0].code : 'CS-COURSE')}
              </span>
              <h3 className="text-lg font-bold text-white mt-2">{cls.name}</h3>
              <p className="text-xs text-slate-400 mt-1">Classroom: <span className="text-slate-200 font-medium">{cls.room}</span></p>
            </div>

            {/* Subjects & teachers */}
            <div className="pt-2 border-t border-slate-800 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-500" />
                <span className="block text-xs font-semibold text-slate-400 uppercase">Subjects & Teachers</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(cls.subjects || []).length ? (
                  (cls.subjects || []).map((s, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300">
                      {s.code || s.name} — {s.teacherId?.userId?.name || s.teacherId?.name || 'Teacher'}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-slate-500 italic">No subjects assigned yet</span>
                )}
              </div>
            </div>

            {/* Mentor assignment */}
            <div className="pt-3 border-t border-slate-800 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <UserRound className="w-4 h-4 text-rose-400" />
                <label className="block text-xs font-semibold text-slate-400 uppercase">Class Mentor</label>
              </div>
              <select
                value={cls.mentorId?._id || cls.mentorId || ''}
                onChange={(e) => handleReassignMentor(cls._id, e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500"
              >
<option value="">No Mentor Assigned</option>
                  {teachers.map((t) => (
                    <option key={t._id || t.id} value={t._id || t.id}>
                      {t.name} ({t.email})
                    </option>
                  ))}
              </select>
            </div>

            {/* Primary teacher reassignment */}
            <div className="pt-2 border-t border-slate-800 space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400 uppercase">Primary / Fallback Faculty Member</label>
              <select
                value={cls.teacherId?._id || cls.teacherId || ''}
                onChange={(e) => handleReassignTeacher(cls._id, e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500"
              >
<option value="">Select Faculty...</option>
                  {teachers.map((t) => (
                    <option key={t._id || t.id} value={t._id || t.id}>
                      {t.name} ({t.email})
                    </option>
                  ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}