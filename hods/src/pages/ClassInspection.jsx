import { useState, useEffect } from 'react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import { Eye, Radio, Lock, CheckCircle2, Clock } from 'lucide-react';

export default function ClassInspection() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeInspections, setActiveInspections] = useState([]);

  useEffect(() => {
    fetchActiveClasses();
  }, []);

  const fetchActiveClasses = async () => {
    try {
      setLoading(true);
      setError(null);
      const today = new Date().toISOString().split('T')[0];
      const res = await api.get(`/sessions?date=${today}`);
      const sessions = res.data.sessions || [];
      setActiveInspections(sessions);
    } catch {
      setError('Failed to load live sessions.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Eye className="w-6 h-6 text-fuchsia-400" />
          Live Class Inspector Console
        </h1>
        <p className="text-slate-400 text-sm mt-1">Real-time inspection of ongoing department lectures and door sensor status</p>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchActiveClasses} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {activeInspections.map((item) => (
          <div key={item._id} className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                LIVE IN SESSION
              </span>
              <span className="text-xs font-mono text-slate-400">Room: {item.room}</span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">{item.className || item.name}</h3>
              <p className="text-xs text-slate-400 mt-1">Instructor: <span className="text-slate-200 font-medium">{item.teacherName || 'Faculty Member'}</span></p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-xs text-slate-400">On-Time</div>
                <div className="text-lg font-bold text-emerald-400">{item.attendance?.onTime || 0}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Late</div>
                <div className="text-lg font-bold text-amber-400">{item.attendance?.late || 0}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Total</div>
                <div className="text-lg font-bold text-rose-400">{item.attendance?.total || 0}</div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
              <span className="flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-fuchsia-400" />
                Phones Locked via FCM
              </span>
              <span>Started: {item.startTime ? new Date(item.startTime).toLocaleTimeString() : '—'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
