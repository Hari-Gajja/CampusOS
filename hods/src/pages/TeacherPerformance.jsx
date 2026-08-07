import { useState, useEffect } from 'react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import { Users, Building } from 'lucide-react';

export default function TeacherPerformance() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teachers, setTeachers] = useState([]);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/users?role=teacher&limit=100');
      const list = res.data.data || [];
      const formatted = list.map((t) => ({
        id: t.id || t._id,
        name: t.name,
        email: t.email,
        department: t.department || 'Not Assigned',
      }));
      setTeachers(formatted);
    } catch {
      setError('Failed to load teachers.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="w-6 h-6 text-fuchsia-400" />
          Faculty Teachers
        </h1>
        <p className="text-slate-400 text-sm mt-1">Department faculty roster from the institution records</p>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchTeachers} />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teachers.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-500 text-sm border border-slate-800 rounded-3xl glass-panel">
            No faculty teachers registered yet. Add teachers to see them here.
          </div>
        ) : (
          teachers.map((t) => (
            <div key={t.id} className="p-6 rounded-3xl glass-card border border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-fuchsia-500/20 text-fuchsia-400 font-bold flex items-center justify-center border border-fuchsia-500/30">
                  {(t.name || '?').charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{t.name}</h3>
                  <p className="text-xs text-slate-400">{t.email}</p>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Department:</span>
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-fuchsia-400" />
                    {t.department}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}