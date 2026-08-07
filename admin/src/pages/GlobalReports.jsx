import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Award } from 'lucide-react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function GlobalReports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attendanceTrendData, setAttendanceTrendData] = useState([]);
  const [departmentComparisonData, setDepartmentComparisonData] = useState([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const requests = [];
      for (let day = 6; day >= 0; day -= 1) {
        const cursor = new Date(Date.now() - day * 24 * 60 * 60 * 1000);
        const key = cursor.toISOString().slice(0, 10);
        requests.push(api.get(`/sessions?date=${key}`).catch(() => null));
      }

      const results = await Promise.all(requests);
      const deptTotals = {};

      const weekly = results.map((res, i) => {
        const cursor = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
        const sessions = res?.data?.sessions || [];
        let onTime = 0;
        let late = 0;
        sessions.forEach((s) => {
          const cls = s.classId;
          const dept = (cls && (cls.subject || cls.name)) || 'Unassigned';
          const o = (s.attendees || []).filter((a) => a.status === 'on-time').length;
          const l = (s.attendees || []).filter((a) => a.status === 'late').length;
          onTime += o;
          late += l;
          if (!deptTotals[dept]) deptTotals[dept] = { onTime: 0, late: 0 };
          deptTotals[dept].onTime += o;
          deptTotals[dept].late += l;
        });
        return { day: DAY_LABELS[cursor.getDay()], onTime, late };
      });

      setAttendanceTrendData(weekly);
      setDepartmentComparisonData(
        Object.entries(deptTotals)
          .map(([dept, v]) => {
            const total = v.onTime + v.late;
            const rate = total > 0 ? Math.round((v.onTime / total) * 100) : 0;
            return { dept, rate };
          })
          .sort((a, b) => b.rate - a.rate)
      );
    } catch {
      setError('Failed to load global analytics.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-rose-400" />
          Global Institution Analytics
        </h1>
        <p className="text-slate-400 text-sm mt-1">Cross-departmental Recharts visual intelligence from real attendance sessions</p>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchAnalytics} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Attendance Trend Bar Chart */}
        <div className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Last 7 Days Attendance
          </h3>
          {attendanceTrendData.length ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="day" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} />
                  <Bar dataKey="onTime" fill="#10b981" name="On-Time" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="late" fill="#f59e0b" name="Late" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-16">No session data for the last 7 days.</p>
          )}
        </div>

        {/* Department Comparison Chart */}
        <div className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-fuchsia-400" />
            Department On-Time Rate (%)
          </h3>
          {departmentComparisonData.length ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={departmentComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="dept" stroke="#94a3b8" />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} />
                  <Line type="monotone" dataKey="rate" stroke="#d946ef" strokeWidth={3} dot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-16">No department data yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}