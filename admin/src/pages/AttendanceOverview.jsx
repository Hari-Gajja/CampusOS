import { useState, useEffect } from 'react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import { FileBarChart, Filter, Download } from 'lucide-react';
import { exportToCSV } from '../utils/helpers';

export default function AttendanceOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reportData, setReportData] = useState([]);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/classes');
      const list = res.data.classes || [];
      setClasses(list);

      if (list.length > 0) {
        setSelectedClassId(list[0]._id);
        fetchOverview(list[0]._id);
      } else {
        setReportData([]);
        setLoading(false);
      }
    } catch {
      setError('Failed to load classes.');
      setLoading(false);
    }
  };

  const fetchOverview = async (classId) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/reports/attendance?classId=${classId}`);
      setReportData(res.data.report || res.data.students || []);
    } catch {
      setError('Failed to load attendance overview.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    exportToCSV(`Admin_Global_Attendance_${selectedClassId}.csv`, reportData);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-rose-400" />
            Institution-Wide Attendance Overview
          </h1>
          <p className="text-slate-400 text-sm mt-1">Cross-institutional attendance metrics across all departments</p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-semibold text-xs shadow-lg shadow-rose-500/25 flex items-center gap-2 transition-all shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Export Master CSV</span>
        </button>
      </div>

      {error && <ErrorAlert message={error} />}

      {/* Filter Form */}
      <div className="p-4 rounded-2xl glass-panel border border-slate-800 flex flex-wrap items-center gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Select Class</label>
          <select
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              fetchOverview(e.target.value);
            }}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500"
          >
            {classes.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} ({c.subject})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Overview Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/90 text-xs font-semibold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Student Name</th>
                <th className="px-6 py-4">Reg Number</th>
                <th className="px-6 py-4">Sessions</th>
                <th className="px-6 py-4">On-Time</th>
                <th className="px-6 py-4">Late</th>
                <th className="px-6 py-4">Absent</th>
                <th className="px-6 py-4">Attendance Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {reportData.map((row, i) => (
                <tr key={row.studentId || i} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-4 font-semibold text-white">{row.name}</td>
                  <td className="px-6 py-4 font-mono text-xs text-rose-400">{row.regNumber}</td>
                  <td className="px-6 py-4 font-mono">{row.totalSessions}</td>
                  <td className="px-6 py-4 text-emerald-400 font-bold">{row.onTime}</td>
                  <td className="px-6 py-4 text-amber-400 font-bold">{row.late}</td>
                  <td className="px-6 py-4 text-rose-400 font-bold">{row.absent}</td>
                  <td className="px-6 py-4 font-bold text-xs text-rose-300">{row.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
