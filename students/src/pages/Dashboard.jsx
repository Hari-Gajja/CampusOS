import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import { Calendar, CheckCircle2, Clock, Lock, ShieldAlert, Award } from 'lucide-react';
import { getStatusBadgeColor } from '../utils/helpers';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    attendanceRate: 0,
    onTimeCount: 0,
    lateCount: 0,
    todayClasses: [],
    blockingStatus: { isBlocked: false, until: null },
  });

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch student profile + attendance + enrolled class schedule
      const [profileRes, classRes, blockingRes] = await Promise.all([
        api.get(`/users/${user?.id}`).catch(() => null),
        api.get('/classes').catch(() => null),
        api.post('/blocking/status', { isBlocked: false }).catch(() => null),
      ]);

      const studentId = profileRes?.data?.user?.id || user?.id;
      const attendanceRes = await api.get(`/students/${studentId}/attendance`).catch(() => null);

      const history = attendanceRes?.data?.history || [];
      const totalSessions = history.length;
      const onTime = history.filter((h) => h.status === 'on-time').length;
      const late = history.filter((h) => h.status === 'late').length;
      const rate = totalSessions ? Math.round(((onTime + late * 0.7) / totalSessions) * 100) : 0;

      // Today's classes from the real recurring schedule
      const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const today = new Date().getDay();
      const enrolled = (classRes?.data?.classes || []);
      const todayClasses = enrolled.flatMap((cls) => {
        const slot = (cls.schedule || []).find((s) => s.dayOfWeek === today);
        if (!slot) return [];
        return [
          {
            id: cls._id,
            name: cls.name,
            subject: cls.subject || (cls.subjects?.length ? cls.subjects[0].code : ''),
            room: cls.room,
            startTime: slot.startTime,
            endTime: slot.endTime,
            status: 'Scheduled',
          },
        ];
      });

      setDashboardData({
        attendanceRate: isNaN(rate) ? 0 : rate,
        onTimeCount: onTime,
        lateCount: late,
        todayClasses,
        blockingStatus: {
          isBlocked: blockingRes?.data?.state === 'block',
          until: blockingRes?.data?.blockedUntil,
        },
      });
    } catch (err) {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [user]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-slate-900 border border-indigo-500/20 glass-panel">
        <div>
          <h1 className="text-2xl font-bold text-white">Welcome back, {user?.name}!</h1>
          <p className="text-slate-400 text-sm mt-1">
            Student Reg. No: <span className="text-indigo-400 font-mono font-medium">{user?.registrationNumber || '—'}</span>
          </p>
        </div>
        <Link
          to="/blocking-status"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-colors shrink-0"
        >
          <Lock className="w-4 h-4" />
          <span>View Lock Device Status</span>
        </Link>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchDashboard} />}

      {/* Device Lock Warning (if active) */}
      {dashboardData.blockingStatus.isBlocked && (
        <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between pulse-lock">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-500/20 text-rose-400 rounded-xl">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-300">Device Locked For Active Class</h3>
              <p className="text-xs text-slate-300">Your phone notifications and distraction apps are restricted until class ends.</p>
            </div>
          </div>
          <Link
            to="/blocking-status"
            className="px-3 py-1.5 rounded-lg bg-rose-500/30 hover:bg-rose-500/40 text-rose-200 text-xs font-semibold"
          >
            Details
          </Link>
        </div>
      )}

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Attendance Rate"
          value={`${dashboardData.attendanceRate}%`}
          subtitle="This Month"
          icon={Award}
          color="emerald"
        />
        <StatCard
          title="Today's Classes"
          value={dashboardData.todayClasses.length}
          subtitle="Scheduled Today"
          icon={Calendar}
          color="indigo"
        />
        <StatCard
          title="On-Time Checkins"
          value={dashboardData.onTimeCount}
          subtitle="Total recorded"
          icon={CheckCircle2}
          color="indigo"
        />
        <StatCard
          title="Late Marks"
          value={dashboardData.lateCount}
          subtitle="This semester"
          icon={Clock}
          color="amber"
        />
      </div>

      {/* Today's Schedule Table/List */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Today's Class Schedule</h2>
            <p className="text-xs text-slate-400">NFC door reader check-in required upon entry</p>
          </div>
          <Link to="/schedule" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
            Full Schedule &rarr;
          </Link>
        </div>

        <div className="divide-y divide-slate-800">
          {dashboardData.todayClasses.map((cls) => (
            <div key={cls.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-indigo-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">{cls.name}</h4>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    <span className="font-mono text-indigo-400">{cls.subject}</span>
                    <span>&bull;</span>
                    <span>Room: {cls.room}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xs font-medium text-slate-200">
                    {cls.startTime} - {cls.endTime}
                  </div>
                  <span
                    className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      cls.status === 'Active'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : cls.status === 'Upcoming'
                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    }`}
                  >
                    {cls.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
