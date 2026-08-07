import { useState, useEffect } from 'react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import TeacherAddModal from '../components/TeacherAddModal';
import ClassCreateModal from '../components/ClassCreateModal';
import { Building, BookOpen, UserPlus, Plus, Search, Edit2, UserRound, Trash2, CreditCard } from 'lucide-react';

export default function DepartmentOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('ALL');

  // Modals
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [teacherToEdit, setTeacherToEdit] = useState(null);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [classToEdit, setClassToEdit] = useState(null);

  useEffect(() => {
    fetchDepartmentData();
  }, []);

  const fetchDepartmentData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [clsRes, userRes] = await Promise.all([
        api.get('/classes').catch(() => null),
        api.get('/users?role=teacher&limit=100').catch(() => null),
      ]);

      if (clsRes?.data?.classes) setClasses(clsRes.data.classes);
      else setClasses([]);

      if (userRes?.data?.data) setTeachers(userRes.data.data);
    } catch {
      setError('Failed to load department data.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeacher = async (teacher) => {
    if (!window.confirm(`Delete teacher account for ${teacher.name}?`)) return;
    try {
      await api.delete(`/users/${teacher.id || teacher._id}`);
      fetchDepartmentData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete teacher.');
    }
  };

  if (loading) return <LoadingSpinner />;

  const filtered = classes.filter((c) => {
    const matchesSearch =
      (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.subject || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.room || '').toLowerCase().includes(search.toLowerCase());
    const matchesYear = yearFilter === 'ALL' || c.btechYear === yearFilter;
    return matchesSearch && matchesYear;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building className="w-6 h-6 text-fuchsia-400" />
            HOD Governance — B.Tech Classes & Faculty Teachers
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage B.Tech 1st, 2nd, 3rd & 4th Year classes and assign faculty teachers</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setTeacherToEdit(null);
              setIsTeacherModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center gap-2 transition-all"
          >
            <UserPlus className="w-4 h-4 text-fuchsia-400" />
            <span>Add Faculty Teacher</span>
          </button>

          <button
            onClick={() => {
              setClassToEdit(null);
              setIsClassModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 text-white font-semibold text-xs shadow-lg shadow-fuchsia-500/25 flex items-center gap-2 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create B.Tech Class</span>
          </button>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchDepartmentData} />}

      {/* Faculty Teachers Section */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <UserRound className="w-5 h-5 text-fuchsia-400" />
              Faculty Teachers ({teachers.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Department teachers — edit details or reassign NFC badges</p>
          </div>
          <div className="p-2.5 rounded-xl glass-panel border border-slate-800 flex items-center gap-2 max-w-xs w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search teachers..."
              value={teacherSearch}
              onChange={(e) => setTeacherSearch(e.target.value)}
              className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/90 text-xs font-semibold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Teacher</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">NFC Card UID</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {teachers
                .filter(
                  (t) =>
                    (t.name || '').toLowerCase().includes(teacherSearch.toLowerCase()) ||
                    (t.email || '').toLowerCase().includes(teacherSearch.toLowerCase())
                )
                .map((t) => (
                  <tr key={t.id || t._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{t.name}</div>
                      <div className="text-xs text-slate-400">{t.email}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-300">{t.department || 'Not Assigned'}</td>
                    <td className="px-6 py-4 font-mono text-xs">
                      {t.nfcCardUid ? (
                        <span className="px-2.5 py-1 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-300 font-bold">
                          {t.nfcCardUid}
                        </span>
                      ) : (
                        <span className="text-slate-500">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setTeacherToEdit(t);
                            setIsTeacherModalOpen(true);
                          }}
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                          title="Edit Teacher"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTeacher(t)}
                          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg"
                          title="Delete Teacher"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              {!teachers.length && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 text-sm">
                    No faculty teachers added yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Year Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        {['ALL', 'B.Tech 1st Year', 'B.Tech 2nd Year', 'B.Tech 3rd Year', 'B.Tech 4th Year'].map((y) => (
          <button
            key={y}
            onClick={() => setYearFilter(y)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              yearFilter === y
                ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {y === 'ALL' ? 'All B.Tech Years' : y}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-2xl glass-panel border border-slate-800 flex items-center gap-3 max-w-md">
        <Search className="w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search course, subject code, or room..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
        />
      </div>

      {/* Classes Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/90 text-xs font-semibold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">B.Tech Year</th>
                <th className="px-6 py-4">Class & Classroom</th>
                <th className="px-6 py-4">Class Mentor</th>
                <th className="px-6 py-4">Subjects & Assigned Teachers</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((c) => (
                <tr key={c._id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-4 font-semibold">
                    <span className="px-2.5 py-1 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-300 text-xs font-bold">
                      {c.btechYear || 'B.Tech 1st Year'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-white">{c.name}</div>
                    <div className="text-xs font-mono text-slate-400">{c.room}</div>
                  </td>
                  <td className="px-6 py-4">
                    {c.mentorId ? (
                      <div className="flex items-center gap-1.5">
                        <UserRound className="w-4 h-4 text-fuchsia-400" />
                        <span className="font-semibold text-slate-200">
                          {c.mentorId?.userId?.name || c.mentorId?.name || 'Mentor'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-500 text-xs">Not Assigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      {(c.subjects || []).length ? (
                        (c.subjects || []).map((s, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-200 font-mono">
                              {s.code || s.name}
                            </span>
                            <span className="text-slate-400">
                              <span className="text-slate-200 font-medium">
                                {s.teacherId?.userId?.name || s.teacherId?.name || 'Teacher'}
                              </span>
                            </span>
                          </div>
                        ))
                      ) : (
                        <span className="text-slate-500 italic text-xs">
                          {c.subject && (
                            <>
                              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono">{c.subject}</span>
                              {' - '} {c.teacherId?.userId?.name || c.teacherId?.name || 'Teacher'}
                            </>
                          )}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => {
                        setClassToEdit(c);
                        setIsClassModalOpen(true);
                      }}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                      title="Edit Class, Subjects & Mentor"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <TeacherAddModal
        isOpen={isTeacherModalOpen}
        onClose={() => {
          setIsTeacherModalOpen(false);
          setTeacherToEdit(null);
        }}
        onTeacherCreated={fetchDepartmentData}
        initialTeacher={teacherToEdit}
      />

      <ClassCreateModal
        isOpen={isClassModalOpen}
        onClose={() => {
          setIsClassModalOpen(false);
          setClassToEdit(null);
        }}
        onClassCreated={fetchDepartmentData}
        teachers={teachers}
        initialData={classToEdit}
      />
    </div>
  );
}
