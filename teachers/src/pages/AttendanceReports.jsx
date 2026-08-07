import { useState, useEffect } from 'react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import { Download, Filter, FileSpreadsheet, Search } from 'lucide-react';
import { exportToCSV } from '../utils/helpers';

export default function AttendanceReports() {
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
        fetchReport(list[0]._id, fromDate, toDate);
      } else {
        setReportData([]);
        setLoading(false);
      }
    } catch {
      setError('Failed to load classes.');
      setLoading(false);
    }
  };

  const fetchReport = async (classId, from, to) => {
    try {
      setLoading(true);
      setError(null);
      let query = `/reports/attendance?classId=${classId}`;
      if (from) query += `&from=${from}`;
      if (to) query += `&to=${to}`;

      const res = await api.get(query);
      setReportData(res.data.report || res.data.students || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load report.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilter = (e) => {
    e.preventDefault();
    if (selectedClassId) {
      fetchReport(selectedClassId, fromDate, toDate);
    }
  };

  const handleExportCSV = () => {
    const filename = `Attendance_Report_${selectedClassId || 'class'}_${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(filename, reportData);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            Attendance Reports & Analytics
          </h1>
          <p className="text-slate-400 text-sm mt-1">Aggregate student attendance percentages over customizable date windows</p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold text-xs shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition-all shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV Report</span>
        </button>
      </div>

      {error && <ErrorAlert message={error} />}

      {/* Filter Form */}
      <form onSubmit={handleApplyFilter} className="p-4 rounded-2xl glass-panel border border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Select Class</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            {classes.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} ({c.subject})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <button
            type="submit"
            className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <Filter className="w-4 h-4" />
            <span>Generate Report</span>
          </button>
        </div>
      </form>

      {/* Report Data Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/90 text-xs font-semibold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Student Name</th>
                <th className="px-6 py-4">Registration No</th>
                <th className="px-6 py-4">Total Sessions</th>
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
                  <td className="px-6 py-4 font-mono text-xs text-indigo-400">{row.regNumber}</td>
                  <td className="px-6 py-4 font-mono">{row.totalSessions}</td>
                  <td className="px-6 py-4 text-emerald-400 font-bold">{row.onTime}</td>
                  <td className="px-6 py-4 text-amber-400 font-bold">{row.late}</td>
                  <td className="px-6 py-4 text-rose-400 font-bold">{row.absent}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            row.percentage >= 85
                              ? 'bg-emerald-500'
                              : row.percentage >= 75
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, row.percentage)}%` }}
                        />
                      </div>
                      <span className="font-bold text-xs text-white">{row.percentage}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
