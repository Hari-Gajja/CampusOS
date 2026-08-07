import { useState, useEffect } from 'react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import { Lock, Unlock, ShieldAlert, Smartphone, Clock, RefreshCw, CheckCircle2 } from 'lucide-react';
import { formatTime } from '../utils/helpers';

export default function BlockingStatus() {
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState({
    isBlocked: false,
    blockedUntil: null,
    className: null,
    room: null,
  });

  useEffect(() => {
    checkBlockingStatus();
  }, []);

  const checkBlockingStatus = async () => {
    try {
      setChecking(true);
      setError(null);
      const res = await api.post('/blocking/status', { isBlocked: false });
      if (res?.data) {
        setStatus({
          isBlocked: res.data.state === 'block',
          blockedUntil: res.data.blockedUntil,
          className: res.data.className || null,
          room: res.data.room || null,
        });
      }
    } catch (err) {
      setError('Could not connect to blocking status service.');
    } finally {
      setLoading(false);
      setChecking(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Device Blocking Status</h1>
          <p className="text-slate-400 text-sm mt-1">Smart classroom automatic distraction barrier state</p>
        </div>

        <button
          onClick={checkBlockingStatus}
          disabled={checking}
          className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          <span>Sync Status</span>
        </button>
      </div>

      {error && <ErrorAlert message={error} onRetry={checkBlockingStatus} />}

      {/* Main Status Hero Card */}
      <div
        className={`p-8 rounded-3xl border ${
          status.isBlocked
            ? 'bg-gradient-to-br from-rose-950/60 via-slate-900 to-slate-950 border-rose-500/30 pulse-lock'
            : 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border-emerald-500/30'
        } space-y-6`}
      >
        <div className="flex items-center gap-5">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
              status.isBlocked
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {status.isBlocked ? (
              <Lock className="w-8 h-8 animate-bounce" />
            ) : (
              <Unlock className="w-8 h-8" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  status.isBlocked
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {status.isBlocked ? 'Device Locked' : 'Device Active / Unlocked'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-2">
              {status.isBlocked
                ? `Your phone is locked for ${status.className} until ${formatTime(status.blockedUntil)}.`
                : 'No active class locking policies currently enforced.'}
            </h2>
          </div>
        </div>

        {status.isBlocked && (
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-400" />
                <span>Locked Until:</span>
              </div>
              <span className="font-mono font-bold text-rose-300 text-sm">
                {formatTime(status.blockedUntil)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-slate-400" />
                <span>Classroom:</span>
              </div>
              <span className="font-semibold text-white">{status.room}</span>
            </div>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-indigo-400" />
          How Phone Blocking Works
        </h3>
        <ul className="space-y-3 text-xs text-slate-400 leading-relaxed">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              When you scan your NFC student card at the door reader, the system validates your on-time arrival and sends an encrypted lock command via Firebase Cloud Messaging (FCM).
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Non-essential apps and notifications are temporarily silenced for the duration of the lecture to maximize engagement.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Once the instructor ends the session or the scheduled time expires, an automatic unblock push restores full phone functionality.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
