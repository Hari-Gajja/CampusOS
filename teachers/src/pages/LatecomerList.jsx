import { useState, useEffect } from 'react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import { Clock, Filter, AlertTriangle } from 'lucide-react';
import { formatDate } from '../utils/helpers';

export default function LatecomerList() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [latecomers, setLatecomers] = useState([]);

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
        fetchLatecomers(list[0]._id, selectedDate);
      } else {
        setLatecomers([]);
        setLoading(false);
      }
    } catch {
      setError('Failed to load classes.');
      setLoading(false);
    }
  };

  const fetchLatecomers = async (classId, dateStr) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/reports/latecomers?classId=${classId}&date=${dateStr}`);
      setLatecomers(res.data.late || []);
    } catch {
      setError('Failed to load latecomers.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (e) => {
    e.preventDefault();
    if (selectedClassId && selectedDate) {
      fetchLatecomers(selectedClassId, selectedDate);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Clock className="w-6 h-6 text-amber-400" />
          Latecomers Tracking Log
        </h1>
        <p className="text-slate-400 text-sm mt-1">Students who scanned NFC card after the designated grace threshold</p>
      </div>

      {error && <ErrorAlert message={error} />}

      {/* Filter Bar */}
      <form onSubmit={handleFilter} className="p-4 rounded-2xl glass-panel border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
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
          <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Select Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <button
            type="submit"
            className="w-full py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span>Filter Late List</span>
          </button>
        </div>
      </form>

      {/* Late Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/90 text-xs font-semibold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Student Name</th>
                <th className="px-6 py-4">Reg Number</th>
                <th className="px-6 py-4">Exact Scan Timestamp</th>
                <th className="px-6 py-4">Delay Past Grace Period</th>
                <th className="px-6 py-4">Status Tag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {latecomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 text-sm">
                    No late arrivals logged for this class on {formatDate(selectedDate)}.
                  </td>
                </tr>
              ) : (
                latecomers.map((l, i) => (
                  <tr key={l.studentId || i} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-semibold text-white">{l.name}</td>
                    <td className="px-6 py-4 font-mono text-xs text-indigo-400">{l.regNumber}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-300">
                      {l.checkInTime ? new Date(l.checkInTime).toLocaleTimeString() : '—'}
                    </td>
                    <td className="px-6 py-4 text-amber-400 font-bold text-xs">
                      +{l.delayMinutes || 10} minutes late
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold uppercase">
                        LATE MARK
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
