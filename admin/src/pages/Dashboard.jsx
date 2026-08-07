import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import { Users, GraduationCap, BookOpen, Cpu, ShieldCheck, Activity, Radio, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [healthStatus, setHealthStatus] = useState({ status: 'ok', uptime: 0 });
  const [systemStats, setSystemStats] = useState({
    studentsCount: 0,
    teachersCount: 0,
    classesCount: 0,
    devicesCount: 0,
  });

  useEffect(() => {
    fetchAdminDashboard();
  }, []);

  const fetchAdminDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const [healthRes, userRes, classRes, deviceRes] = await Promise.all([
        api.get('/health').catch(() => null),
        api.get('/users?limit=100').catch(() => null),
        api.get('/classes').catch(() => null),
        api.get('/devices').catch(() => null),
      ]);

      if (healthRes?.data) setHealthStatus(healthRes.data);

      const users = userRes?.data?.data || [];
      const students = users.filter((u) => u.role === 'student').length;
      const teachers = users.filter((u) => u.role === 'teacher').length;
      const classes = classRes?.data?.classes?.length || 0;
      const devices = deviceRes?.data?.devices?.length || 0;

      setSystemStats({
        studentsCount: students,
        teachersCount: teachers,
        classesCount: classes,
        devicesCount: devices,
      });
    } catch {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-rose-950/80 via-slate-900 to-slate-900 border border-rose-500/20 glass-panel">
        <div>
          <h1 className="text-2xl font-bold text-white">System Executive Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            Logged in as <span className="text-rose-400 font-semibold">{user?.name || 'Administrator'}</span> (Principal Access)
          </p>
        </div>

        {/* Server Health Status Pill */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold shrink-0">
          <Activity className="w-4 h-4 animate-pulse" />
          <span>Backend Status: {healthStatus.status.toUpperCase()} (Uptime: {Math.round(healthStatus.uptime / 60)}m)</span>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchAdminDashboard} />}

      {/* System Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Students"
          value={systemStats.studentsCount}
          subtitle="Enrolled Roster"
          icon={GraduationCap}
          color="indigo"
        />
        <StatCard
          title="Faculty Teachers"
          value={systemStats.teachersCount}
          subtitle="Active Instructors"
          icon={Users}
          color="emerald"
        />
        <StatCard
          title="Total Classes"
          value={systemStats.classesCount}
          subtitle="Across Departments"
          icon={BookOpen}
          color="rose"
        />
        <StatCard
          title="Hardware NFC Readers"
          value={systemStats.devicesCount}
          subtitle="Door Readers Active"
          icon={Cpu}
          color="amber"
        />
      </div>

      {/* Action Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-rose-400" />
              User & Roster Management
            </h3>
            <Link to="/users" className="text-xs font-semibold text-rose-400 hover:text-rose-300">
              Open User Console &rarr;
            </Link>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Create, edit, or remove Students, Teachers, HODs, and Administrators. Perform CSV bulk student registration and bind physical NFC Card UIDs.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              to="/users"
              className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow-lg shadow-rose-500/25"
            >
              Add / Manage Users
            </Link>
            <Link
              to="/global-reports"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            >
              Global Institution Analytics
            </Link>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-amber-400" />
            NFC Door Readers
          </h3>
          <p className="text-xs text-slate-400">
            Monitor device heartbeats, issue API key credentials for ESP8266 hardware, and manage room bindings.
          </p>
          <Link
            to="/devices"
            className="inline-block px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-amber-400 hover:text-white hover:bg-slate-800"
          >
            Manage NFC Hardware &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
