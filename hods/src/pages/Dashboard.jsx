import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import { Building, Users, BookOpen, Radio, Award, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalTeachers: 0,
    totalStudents: 0,
    totalClasses: 0,
    avgAttendance: 0,
  });

  useEffect(() => {
    fetchDepartmentStats();
  }, []);

  const fetchDepartmentStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const [userRes, classRes] = await Promise.all([
        api.get('/users?limit=100').catch(() => null),
        api.get('/classes').catch(() => null),
      ]);

      const allUsers = userRes?.data?.data || [];
      const teachers = allUsers.filter((u) => u.role === 'teacher').length;
      const students = allUsers.filter((u) => u.role === 'student').length;
      const classesCount = classRes?.data?.classes?.length || 0;

      setStats({
        totalTeachers: teachers,
        totalStudents: students,
        totalClasses: classesCount,
        avgAttendance: 0,
      });
    } catch {
      setError('Failed to load department stats.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-fuchsia-950/80 via-slate-900 to-slate-900 border border-fuchsia-500/20 glass-panel">
        <div>
          <h1 className="text-2xl font-bold text-white">Department of Computer Science</h1>
          <p className="text-slate-400 text-sm mt-1">
            Head of Department: <span className="text-fuchsia-400 font-semibold">{user?.name || 'Dr. Department Head'}</span>
          </p>
        </div>
        <Link
          to="/class-inspection"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-600 text-white text-xs font-semibold shadow-lg shadow-fuchsia-500/25 transition-all shrink-0"
        >
          <Radio className="w-4 h-4 animate-pulse" />
          <span>Inspect Active Department Classes</span>
        </Link>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchDepartmentStats} />}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Faculty Teachers"
          value={stats.totalTeachers}
          subtitle="Department Members"
          icon={Users}
          color="fuchsia"
        />
        <StatCard
          title="Enrolled Students"
          value={stats.totalStudents}
          subtitle="Active Students"
          icon={Building}
          color="indigo"
        />
        <StatCard
          title="Active Department Courses"
          value={stats.totalClasses}
          subtitle="Scheduled Subjects"
          icon={BookOpen}
          color="emerald"
        />
        <StatCard
          title="Avg Attendance Rate"
          value={`${stats.avgAttendance}%`}
          subtitle="Overall Department"
          icon={Award}
          color="amber"
        />
      </div>

      {/* Quick Action Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-fuchsia-400" />
            Teacher Performance Monitoring
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Track teacher class session frequency, punctuality compliance rates, and student attendance averages across courses.
          </p>
          <Link
            to="/teacher-performance"
            className="inline-block px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-fuchsia-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            View Teacher Ratings &rarr;
          </Link>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-400" />
            Real-Time Class Inspection
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Inspect live door reader feeds and FCM phone blocking execution across all ongoing departmental lectures.
          </p>
          <Link
            to="/class-inspection"
            className="inline-block px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-emerald-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Open Live Inspector &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
