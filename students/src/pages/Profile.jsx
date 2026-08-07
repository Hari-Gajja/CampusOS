import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import { User, Mail, CreditCard, Hash, Save, CheckCircle2, Radio } from 'lucide-react';

export default function Profile() {
  const { user, updateUserProfile } = useAuth();
  const { socket } = useSocket();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [nfcScanAlert, setNfcScanAlert] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    registrationNumber: user?.registrationNumber || '',
    nfcCardUid: user?.nfcCardUid || '',
  });

  useEffect(() => {
    fetchProfile();
  }, [user]);

  // Live Socket.IO listener for physical NFC card taps
  useEffect(() => {
    if (!socket) return;

    const handleNfcScan = (data) => {
      if (data?.nfcUid) {
        const formatted = String(data.nfcUid).replace(/[\s:]/g, '').toUpperCase();
        setFormData((prev) => ({ ...prev, nfcCardUid: formatted }));
        setNfcScanAlert(true);
        setTimeout(() => setNfcScanAlert(false), 4000);
      }
    };

    socket.on('nfc_scanned', handleNfcScan);
    socket.on('attendance_update', handleNfcScan);

    return () => {
      socket.off('nfc_scanned', handleNfcScan);
      socket.off('attendance_update', handleNfcScan);
    };
  }, [socket]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/users/${user?.id}`).catch(() => null);
      if (res?.data?.user) {
        const u = res.data.user;
        setFormData({
          name: u.name || '',
          email: u.email || '',
          registrationNumber: u.registrationNumber || '',
          nfcCardUid: u.nfcCardUid || '',
        });
      }
    } catch (err) {
      // Keep state
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccessMsg('');

      const res = await api.put(`/users/${user?.id}`, {
        name: formData.name,
      });

      if (res.data.user) {
        updateUserProfile({ name: formData.name });
      }
      setSuccessMsg('Profile updated successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Student Profile</h1>
        <p className="text-slate-400 text-sm mt-1">Manage personal info and view physical NFC card assignment</p>
      </div>

      {error && <ErrorAlert message={error} />}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {nfcScanAlert && (
        <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-sm flex items-center gap-3 animate-bounce">
          <Radio className="w-5 h-5 text-indigo-400 shrink-0" />
          <div>
            <h4 className="font-bold">Physical NFC Card Tapped!</h4>
            <p className="text-xs text-slate-300">Live Scanned Card UID: <span className="font-mono font-bold text-indigo-300">{formData.nfcCardUid}</span></p>
          </div>
        </div>
      )}

      {/* Main Profile Form */}
      <div className="glass-panel p-8 rounded-3xl border border-slate-800 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-900/50 border border-slate-800 text-slate-400 text-sm cursor-not-allowed"
                />
              </div>
            </div>

            {/* Registration Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Registration Number
              </label>
              <div className="relative">
                <Hash className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formData.registrationNumber}
                  disabled
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-900/50 border border-slate-800 text-slate-300 font-mono text-sm cursor-not-allowed"
                />
              </div>
            </div>

            {/* NFC Card UID */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Assigned NFC Card UID
                </label>
                <span className="text-[10px] text-indigo-400 font-medium flex items-center gap-1">
                  <Radio className="w-3 h-3 animate-pulse" /> Live Scanner Active
                </span>
              </div>
              <div className="relative">
                <CreditCard className="w-5 h-5 text-indigo-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formData.nfcCardUid}
                  readOnly
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-mono font-bold text-sm"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Tap your card on the ESP8266 door reader to test live scanning</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
