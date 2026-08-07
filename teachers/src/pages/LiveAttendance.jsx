import { useState, useEffect } from 'react';
import api from '../services/api';
import { useSocket } from '../hooks/useSocket';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import { Radio, Play, Square, Lock, Unlock, CheckCircle2, Clock, XCircle, Users, RefreshCw, GraduationCap, CreditCard, Mail } from 'lucide-react';
import { getStatusBadgeColor } from '../utils/helpers';

export default function LiveAttendance() {
  const { socket } = useSocket();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [currentSession, setCurrentSession] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/classes');
      const clsList = res.data.classes || [];
      setClasses(clsList);

      if (clsList.length > 0) {
        setSelectedClassId(clsList[0]._id);
        fetchSessionDetails(clsList[0]._id);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load classes.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionDetails = async (classId) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await api.get(`/sessions?date=${today}`);
      const sessions = res.data.sessions || [];
      const active = sessions.find((s) => String(s.classId?._id || s.classId) === String(classId) && s.isActive);

      if (active) {
        setCurrentSession(active);
        const attRes = await api.get(`/sessions/${active._id}/attendees`);
        const list = (attRes.data.session?.attendees || attRes.data.attendees || []).map((att) => {
          const st = att.studentId || {};
          const usr = st.userId || {};
          return {
            studentId: st._id || att._id,
            name: usr.name || att.name || 'Student',
            email: usr.email || att.email || '',
            regNumber: st.registrationNumber || att.regNumber || 'REG',
            btechYear: st.btechYear || att.btechYear || 'B.Tech 1st Year',
            nfcUid: st.nfcCardUid || att.nfcUid || '',
            status: att.status || 'on-time',
            checkInTime: att.checkInTime || new Date().toISOString(),
            blocked: true,
          };
        });
        setAttendees(list);
      } else {
        setCurrentSession(null);
        setAttendees([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load session details.');
    }
  };

  // Socket listener: updates table stream directly on NFC tap
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (data) => {
      const stId = data.studentId || data.student?.id || Date.now().toString();
      const stName = data.studentName || data.student?.name || 'Student';
      const stEmail = data.email || data.student?.email || '';
      const stReg = data.regNumber || data.student?.regNumber || 'REG';
      const stYear = data.btechYear || data.student?.btechYear || 'B.Tech 1st Year';
      const stUid = data.nfcUid || '';

      setAttendees((prev) => {
        const exists = prev.find((a) => a.studentId === stId);
        if (exists) {
          return prev.map((a) =>
            a.studentId === stId
              ? {
                  ...a,
                  name: stName,
                  email: stEmail,
                  regNumber: stReg,
                  btechYear: stYear,
                  nfcUid: stUid,
                  status: data.status,
                  checkInTime: new Date().toISOString(),
                  blocked: true,
                }
              : a
          );
        }
        return [
          {
            studentId: stId,
            name: stName,
            email: stEmail,
            regNumber: stReg,
            btechYear: stYear,
            nfcUid: stUid,
            status: data.status,
            checkInTime: new Date().toISOString(),
            blocked: true,
          },
          ...prev,
        ];
      });
    };

    socket.on('attendance_update', handleUpdate);

    return () => {
      socket.off('attendance_update', handleUpdate);
    };
  }, [socket]);

  const handleStartSession = async () => {
    try {
      setStarting(true);
      setError(null);
      const res = await api.post('/sessions/start', { classId: selectedClassId });
      setCurrentSession(res.data.session);
      fetchSessionDetails(selectedClassId);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start session.');
    } finally {
      setStarting(false);
    }
  };

  const handleEndSession = async () => {
    if (!currentSession) return;
    try {
      setEnding(true);
      await api.post('/sessions/end', { sessionId: currentSession._id });
      setCurrentSession(null);
      setAttendees([]);
    } catch (err) {
      setCurrentSession(null);
    } finally {
      setEnding(false);
    }
  };

  const handleClassChange = (e) => {
    const cid = e.target.value;
    setSelectedClassId(cid);
    fetchSessionDetails(cid);
  };

  if (loading) return <LoadingSpinner />;

  const onTimeCount = attendees.filter((a) => a.status === 'on-time').length;
  const lateCount = attendees.filter((a) => a.status === 'late').length;
  const absentCount = attendees.filter((a) => a.status === 'absent').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Radio className="w-6 h-6 text-emerald-400 animate-pulse" />
            Live Classroom Attendance Feed
          </h1>
          <p className="text-slate-400 text-sm mt-1">Real-time door sensor check-in monitoring & automated FCM phone blocking</p>
        </div>

        {/* Class Selection Dropdown */}
        <div className="flex items-center gap-3">
          <select
            value={selectedClassId}
            onChange={handleClassChange}
            className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
          >
            {classes.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} ({c.room})
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <ErrorAlert message={error} />}

      {/* Session Controls Card */}
      <div className="p-6 rounded-3xl glass-panel border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              currentSession?.isActive
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
                : 'bg-slate-800 text-slate-500'
            }`}
          >
            <Radio className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  currentSession?.isActive
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {currentSession?.isActive ? 'SESSION RUNNING' : 'NO ACTIVE SESSION'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {currentSession?.isActive
                ? `Started at ${new Date(currentSession.startTime).toLocaleTimeString()} — Phone locks enforced.`
                : 'Click Start to open room check-in window and lock student devices.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!currentSession?.isActive ? (
            <button
              onClick={handleStartSession}
              disabled={starting}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              <span>{starting ? 'Starting...' : 'Start Session & Lock Phones'}</span>
            </button>
          ) : (
            <button
              onClick={handleEndSession}
              disabled={ending}
              className="px-5 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Square className="w-4 h-4 text-rose-400" />
              <span>{ending ? 'Ending...' : 'End Session & Unblock'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-4 rounded-2xl glass-card border border-emerald-500/20 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase">On-Time Check-ins</div>
            <div className="text-2xl font-bold text-emerald-400">{onTimeCount}</div>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-400/50" />
        </div>

        <div className="p-4 rounded-2xl glass-card border border-amber-500/20 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase">Late Check-ins</div>
            <div className="text-2xl font-bold text-amber-400">{lateCount}</div>
          </div>
          <Clock className="w-8 h-8 text-amber-400/50" />
        </div>

        <div className="p-4 rounded-2xl glass-card border border-rose-500/20 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase">Absentees</div>
            <div className="text-2xl font-bold text-rose-400">{absentCount}</div>
          </div>
          <XCircle className="w-8 h-8 text-rose-400/50" />
        </div>
      </div>

      {/* Real-time Attendees Table with Student Details, NFC Card UID, and Reg Number */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            Live NFC Door Scan Stream & Detailed Student Roster
          </h3>
          <span className="text-xs text-slate-400">Total Check-ins: {attendees.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/90 text-xs font-semibold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Student Name & Email</th>
                <th className="px-6 py-4">NFC Card UID</th>
                <th className="px-6 py-4">Registration Number</th>
                <th className="px-6 py-4">B.Tech Year</th>
                <th className="px-6 py-4">Attendance Status</th>
                <th className="px-6 py-4 text-right">Check-In Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {attendees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 text-sm">
                    No active NFC door check-ins recorded yet for this session.
                  </td>
                </tr>
              ) : (
                attendees.map((att, i) => (
                  <tr key={att.studentId || i} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{att.name}</div>
                      <div className="text-xs text-slate-400">{att.email || '—'}</div>
                    </td>

                    <td className="px-6 py-4 font-mono text-xs">
                      {att.nfcUid ? (
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-emerald-300 font-bold">
                          {att.nfcUid}
                        </span>
                      ) : (
                        <span className="text-slate-500">Badge Scan</span>
                      )}
                    </td>

                    <td className="px-6 py-4 font-mono text-xs font-bold text-emerald-400">
                      {att.regNumber}
                    </td>

                    <td className="px-6 py-4 font-medium text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-emerald-400" />
                        <span>{att.btechYear || 'B.Tech 1st Year'}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${getStatusBadgeColor(
                          att.status
                        )}`}
                      >
                        {att.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 font-mono text-xs text-slate-300 text-right">
                      {att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString() : 'Not Checked In'}
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
