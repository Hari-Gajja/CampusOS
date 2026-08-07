import { useState, useEffect } from 'react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import { Lock, Unlock, ShieldAlert, Smartphone, Clock, RefreshCw, CheckCircle2, PhoneCall, Ban, Monitor, Laptop } from 'lucide-react';
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
    supportedOs: ['Windows OS', 'Android OS', 'iOS / iPadOS', 'macOS', 'Linux'],
    allowedApps: [
      'com.google.android.dialer',
      'com.android.phone',
      'com.samsung.android.dialer',
      'com.apple.mobilephone',
      'phone.exe',
      'dialer.exe',
    ],
    blockedApps: '*',
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
          supportedOs: res.data.supportedOs || ['Windows OS', 'Android OS', 'iOS / iPadOS', 'macOS', 'Linux'],
          allowedApps: res.data.allowedApps || [
            'com.google.android.dialer',
            'com.android.phone',
            'com.samsung.android.dialer',
            'com.apple.mobilephone',
            'phone.exe',
            'dialer.exe',
          ],
          blockedApps: res.data.blockedApps || '*',
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
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Cross-Platform OS App Blocking Status</h1>
          <p className="text-slate-400 text-sm mt-1">Multi-OS Distraction Shield — Blocks all apps across Windows, Android, iOS & macOS except Phone Calls</p>
        </div>

        <button
          onClick={checkBlockingStatus}
          disabled={checking}
          className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          <span>Sync Device Status</span>
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
              <Lock className="w-8 h-8 animate-bounce text-rose-400" />
            ) : (
              <Unlock className="w-8 h-8 text-emerald-400" />
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
                {status.isBlocked ? 'CROSS-PLATFORM APP LOCK ACTIVE' : 'Devices Active / Unlocked'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-2">
              {status.isBlocked
                ? `All Windows desktop & Android mobile applications locked for ${status.className || 'Lecture'} until ${formatTime(status.blockedUntil)}.`
                : 'No active class locking policies currently enforced.'}
            </h2>
          </div>
        </div>

        {status.isBlocked && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
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
                  <span>Classroom Hall:</span>
                </div>
                <span className="font-semibold text-white">{status.room || 'Lecture Hall'}</span>
              </div>
            </div>

            {/* App Lock & Whitelist Rules for Windows & Android */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Windows OS App Lock */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
                  <Monitor className="w-4 h-4 text-indigo-400" />
                  <span>Windows OS Lock</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  💻 <strong>All `.exe` Desktop Apps Blocked</strong>: Chrome, Edge, Firefox, Discord, Steam, Spotify, Games, and IDEs.
                </p>
              </div>

              {/* Android & Mobile App Lock */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                  <Ban className="w-4 h-4 text-rose-400" />
                  <span>Android / iOS Mobile Lock</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  📱 <strong>All Mobile Apps Blocked</strong>: Social Media (Instagram, WhatsApp, TikTok), YouTube, Games, and Browsers.
                </p>
              </div>

              {/* Whitelisted App (Phone Calls Only) */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                  <PhoneCall className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span>Universal Whitelist</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  📞 <strong>Phone Calls App (`Phone Dialer`)</strong>: Whitelisted on all OS platforms for making and receiving emergency phone calls.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Supported Operating Systems Overview */}
      <div className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Laptop className="w-5 h-5 text-indigo-400" />
          Supported Cross-Platform Operating Systems
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {['Windows OS', 'Android OS', 'iOS / iPadOS', 'macOS', 'Linux'].map((os, i) => (
            <div key={i} className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-1">
              <span className="text-xs font-bold text-indigo-300 block">{os}</span>
              <span className="text-[10px] text-emerald-400 font-semibold block">✓ Protected</span>
            </div>
          ))}
        </div>

        <ul className="space-y-3 text-xs text-slate-400 leading-relaxed pt-2 border-t border-slate-800/80">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              When an NFC card tap records student attendance, CampusOS dispatches a high-priority cross-platform FCM policy payload (`mode: CROSS_PLATFORM_STRICT_LOCK`).
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              On <strong>Windows OS</strong>, background executable monitoring blocks non-whitelisted `.exe` desktop processes. On <strong>Android/iOS</strong>, Device Admin enforces package lockdown.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Once the lecture session ends, an automatic unblock push instantly restores full application access across all student operating systems.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
