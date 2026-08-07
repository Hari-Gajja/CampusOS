import { useState, useEffect } from 'react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import EnrollModal from '../components/EnrollModal';
import StudentAddModal from '../components/StudentAddModal';
import { UserPlus, Clock, Users, Search, GraduationCap, Edit2, Trash2, BookOpen, UserRound } from 'lucide-react';
import { DAYS_OF_WEEK } from '../utils/constants';

export default function ClassesManagement() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [activeView, setActiveView] = useState('classes'); // 'classes' | 'students'
  const [studentSearch, setStudentSearch] = useState('');

  // Modals
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [selectedClassForEnroll, setSelectedClassForEnroll] = useState(null);

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [classRes, studentRes] = await Promise.allSettled([
        api.get('/classes'),
        api.get('/users?role=student&limit=100'),
      ]);

      if (classRes.status === 'fulfilled') {
        setClasses(classRes.value.data.classes || []);
      }
      if (studentRes.status === 'fulfilled') {
        setStudents(studentRes.value.data.data || []);
      }
    } catch (err) {
      setError('Failed to load classes or student roster.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm('Remove this student account from the system?')) return;
    try {
      await api.delete(`/users/${id}`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete student account.');
    }
  };

  const mentorClasses = classes.filter((c) => c.isMentor);
  const isAnyMentor = mentorClasses.length > 0;

  const filteredStudents = students.filter((s) => {
    const q = studentSearch.toLowerCase();
    return (
      (s.name || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.registrationNumber || '').toLowerCase().includes(q) ||
      (s.btechYear || '').toLowerCase().includes(q) ||
      (s.nfcCardUid || '').toLowerCase().includes(q)
    );
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">My Classes & Student Roster</h1>
          <p className="text-slate-400 text-sm mt-1">Take attendance for your assigned subjects. As a class mentor you can add students to your class only.</p>
        </div>

        {isAnyMentor && (
          <button
            onClick={() => {
              setSelectedStudentForEdit(null);
              setIsStudentModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center gap-2 transition-all shrink-0"
          >
            <UserPlus className="w-4 h-4 text-emerald-400" />
            <span>Add Student Account</span>
          </button>
        )}
      </div>

      {!isAnyMentor && (
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-start gap-2">
          <UserRound className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <span>
            You are not assigned as a mentor to any class yet. Only class mentors can register and add students to
            their assigned class. Your HOD assigns mentors.
          </span>
        </div>
      )}

      {error && <ErrorAlert message={error} onRetry={fetchData} />}

      {/* Tabs Selector */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveView('classes')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeView === 'classes'
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>My Assigned Classes ({classes.length})</span>
        </button>

        <button
          onClick={() => setActiveView('students')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeView === 'students'
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Student Accounts ({students.length})</span>
        </button>
      </div>

      {/* View 1: Classes Grid */}
      {activeView === 'classes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.length === 0 && (
            <div className="p-8 rounded-3xl glass-card border border-slate-800 text-center text-slate-500 text-sm col-span-full">
              No classes assigned yet. Your HOD assigns classes, subjects and mentorships.
            </div>
          )}
          {classes.map((cls) => (
            <div key={cls._id} className="p-6 rounded-3xl glass-card border border-slate-800 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  {cls.isMentor ? (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1">
                      <UserRound className="w-3.5 h-3.5" />
                      You are the Mentor
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono font-semibold">
                      {cls.subject || 'SUBJECT'}
                    </span>
                  )}
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    Grace: {cls.lateThresholdMinutes || 5}m
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white">{cls.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">Classroom: <span className="text-slate-200 font-medium">{cls.room}</span></p>
                  <p className="text-xs text-slate-500 mt-1">
                    Mentor: <span className="text-slate-300 font-medium">{cls.mentorId?.userId?.name || cls.mentorId?.name || 'Not assigned'}</span>
                  </p>
                </div>

                {(cls.subjects || []).length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Subjects I Teach Here</div>
                    <div className="flex flex-wrap gap-1.5">
                      {(cls.subjects || []).map((s, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-300">
                          {s.code || s.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5 pt-2">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Weekly Slots</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(cls.schedule || []).map((s, idx) => {
                      const dayLabel = DAYS_OF_WEEK.find((d) => d.id === s.dayOfWeek)?.label.slice(0, 3) || 'Day';
                      return (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300">
                          {dayLabel} {s.startTime}-{s.endTime}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                {cls.isMentor ? (
                  <button
                    onClick={() => {
                      setSelectedClassForEnroll(cls);
                      setIsEnrollModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add Students To This Class</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-500 italic">Mentor-only action (student enrollment)</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View 2: Student Accounts Roster Table */}
      {activeView === 'students' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl glass-panel border border-slate-800 max-w-md flex items-center gap-3">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search student name, email, reg number, year, or card UID..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/90 text-xs font-semibold uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Student Name & Email</th>
                    <th className="px-6 py-4">Registration No.</th>
                    <th className="px-6 py-4">B.Tech Year</th>
                    <th className="px-6 py-4">NFC Card UID</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-slate-500 text-xs">
                        No student accounts found.
                        {isAnyMentor ? ' Click "Add Student Account" above to register students into your mentor class.' : ' Only class mentors can register students.'}
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((st) => (
                      <tr key={st.id || st._id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-white">{st.name}</div>
                          <div className="text-xs text-slate-400">{st.email}</div>
                        </td>

                        <td className="px-6 py-4 font-mono text-xs font-bold text-emerald-400">
                          {st.registrationNumber || 'N/A'}
                        </td>

                        <td className="px-6 py-4 font-medium text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <GraduationCap className="w-4 h-4 text-emerald-400" />
                            <span>{st.btechYear || 'B.Tech 1st Year'}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4 font-mono text-xs">
                          {st.nfcCardUid ? (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold">
                              {st.nfcCardUid}
                            </span>
                          ) : (
                            <span className="text-slate-500">Unassigned</span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isAnyMentor && (
                              <button
                                onClick={() => {
                                  setSelectedStudentForEdit(st);
                                  setIsStudentModalOpen(true);
                                }}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                                title="Edit Student Details"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}

                            {isAnyMentor && (
                              <button
                                onClick={() => handleDeleteStudent(st.id || st._id)}
                                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg"
                                title="Remove Student Account"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <EnrollModal
        isOpen={isEnrollModalOpen}
        onClose={() => {
          setIsEnrollModalOpen(false);
          setSelectedClassForEnroll(null);
        }}
        schoolClass={selectedClassForEnroll}
        onEnrolled={fetchData}
      />

      <StudentAddModal
        isOpen={isStudentModalOpen}
        onClose={() => {
          setIsStudentModalOpen(false);
          setSelectedStudentForEdit(null);
        }}
        onStudentCreated={fetchData}
        initialStudent={selectedStudentForEdit}
      />
    </div>
  );
}
