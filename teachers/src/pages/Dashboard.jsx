import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import api from '../services/api';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import { Radio, BookOpen, Clock, CheckCircle2, Calendar, ArrowRight, Play, Square } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate } from '../utils/helpers';

export default function Dashboard() {
  const { user } = useAuth();
  const { joinRooms } = useSocket();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboard, setDashboard] = useState({
    summary: {
      totalClasses: 0,
      activeSessions: 0,
      checkIns: 0,
      onTime: 0,
      late: 0,
    },
    todaySessions: [],
    upcoming: [],
  });

  useEffect(() => {
    fetchDashboard();
  }, [user]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/dashboard/teacher');
      if (res.data) {
        setDashboard({
          summary: res.data.summary || { totalClasses: 0, activeSessions: 0, checkIns: 0, onTime: 0, late: 0 },
          todaySessions: res.data.todaySessions || [],
          upcoming: res.data.upcoming || [],
        });

        // Join socket rooms for active classes
        const classIds = (res.data.upcoming || []).map((u) => u.classId);
        if (classIds.length) joinRooms(classIds);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/20 glass-panel">
        <div>
          <h1 className="text-2xl font-bold text-white">Welcome, {user?.name || 'Professor'}</h1>
          <p className="text-slate-400 text-sm mt-1">
            Department of <span className="text-emerald-400 font-semibold">{user?.department || 'Computer Science'}</span>
          </p>
        </div>
        <Link
          to="/live-attendance"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-lg shadow-emerald-500/25 transition-all shrink-0"
        >
          <Radio className="w-4 h-4 animate-pulse" />
          <span>Launch Live Attendance Console</span>
        </Link>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchDashboard} />}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Active Sessions"
          value={dashboard.summary.activeSessions}
          subtitle="Currently running"
          icon={Radio}
          color="emerald"
        />
        <StatCard
          title="Total Assigned Classes"
          value={dashboard.summary.totalClasses}
          subtitle="Active Courses"
          icon={BookOpen}
          color="indigo"
        />
        <StatCard
          title="Today's Check-ins"
          value={dashboard.summary.checkIns}
          subtitle={`${dashboard.summary.onTime} On-Time`}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Latecomers Count"
          value={dashboard.summary.late}
          subtitle="Exceeded grace period"
          icon={Clock}
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Session Today */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
              Today's Live Sessions
            </h2>
            <Link to="/live-attendance" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300">
              Manage Sessions &rarr;
            </Link>
          </div>

          {dashboard.todaySessions.length === 0 ? (
            <div className="p-8 text-center border border-slate-800 rounded-2xl bg-slate-900/40">
              <p className="text-sm text-slate-400">No active class session running right now.</p>
              <Link
                to="/live-attendance"
                className="inline-block mt-3 px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-200 hover:bg-slate-700 font-semibold"
              >
                Start Manual Session
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {dashboard.todaySessions.map((sess) => (
                <div key={sess.id} className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                        ACTIVE LIVE
                      </span>
                      <h4 className="text-base font-bold text-white">{sess.className}</h4>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Room: {sess.room}</p>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-400">{sess.attendance?.total || 0} Students</div>
                      <div className="text-[11px] text-slate-400">
                        {sess.attendance?.onTime || 0} On-time / {sess.attendance?.late || 0} Late
                      </div>
                    </div>
                    <Link
                      to="/live-attendance"
                      className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Classes List */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            Upcoming (Next 7 Days)
          </h2>

          <div className="space-y-3">
            {dashboard.upcoming.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No upcoming schedule slots found.</p>
            ) : (
              dashboard.upcoming.map((u, i) => (
                <div key={i} className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-white">{u.name}</div>
                    <div className="text-[11px] text-slate-400">{u.subject} &bull; Room {u.room}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-indigo-400 font-mono font-semibold">{formatDate(u.date)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
