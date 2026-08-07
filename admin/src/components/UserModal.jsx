import { useState, useEffect } from 'react';
import { X, User, Mail, Lock, Building, ShieldCheck, CreditCard, Radio, Eye, EyeOff, ShieldAlert, CheckCircle, RefreshCw } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';

export default function UserModal({ isOpen, onClose, onSave, initialUser }) {
  const { socket } = useSocket();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [nfcCardUid, setNfcCardUid] = useState('');
  const [nfcAlert, setNfcAlert] = useState(null);
  const [cardOwnerWarning, setCardOwnerWarning] = useState(null);

  useEffect(() => {
    if (initialUser) {
      setName(initialUser.name || '');
      setEmail(initialUser.email || '');
      setPassword('');
      setDepartment(initialUser.department || 'Computer Science & Engineering');
      setNfcCardUid(initialUser.nfcCardUid || '');
    } else {
      setName('');
      setEmail('');
      setPassword('');
      setDepartment('Computer Science & Engineering');
      setNfcCardUid('');
    }
    setNfcAlert(null);
    setCardOwnerWarning(null);
  }, [initialUser, isOpen]);

  useEffect(() => {
    if (!socket || !isOpen) return;

    const handleNfcScan = (data) => {
      if (data?.nfcUid) {
        const formatted = String(data.nfcUid).replace(/[\s:]/g, '').toUpperCase();
        
        // ALWAYS update the NFC UID input field to the newly tapped card
        setNfcCardUid(formatted);

        const currentUserId = initialUser ? (initialUser.id || initialUser._id) : null;
        const isSelf = currentUserId && data.owner?.id === currentUserId;

        if (data.isAlreadyAssigned && !isSelf) {
          const ownerName = data.owner?.name || 'Unknown Person';
          const ownerRole = (data.owner?.role || 'user').toUpperCase();
          const ownerDept = data.owner?.department || data.owner?.registrationNumber || '';

          setCardOwnerWarning({
            uid: formatted,
            ownerText: `${ownerName} (${ownerRole}${ownerDept ? ' - ' + ownerDept : ''})`,
          });
          setNfcAlert(null);
        } else {
          setCardOwnerWarning(null);
          setNfcAlert(`New NFC Card Scanned! Auto-updated Card UID: ${formatted}`);
        }
      }
    };

    socket.on('nfc_scanned', handleNfcScan);
    socket.on('attendance_update', handleNfcScan);

    return () => {
      socket.off('nfc_scanned', handleNfcScan);
      socket.off('attendance_update', handleNfcScan);
    };
  }, [socket, isOpen, initialUser]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      name,
      email,
      password: password || undefined,
      role: 'hod',
      department,
      nfcCardUid: nfcCardUid || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-lg glass-panel rounded-3xl border border-slate-800 p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-rose-400" />
            <h3 className="text-lg font-bold text-white">
              {initialUser ? 'Edit HOD Account (Lost Card Re-assignment)' : 'Add Head of Department (HOD)'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Duplicate NFC Owner Warning Banner */}
        {cardOwnerWarning && (
          <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-semibold space-y-1.5 shadow-lg animate-pulse">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <ShieldAlert className="w-5 h-5" />
              <span>Card Already Assigned!</span>
            </div>
            <p>
              Scanned NFC Card UID <span className="font-mono text-white font-bold px-1.5 py-0.5 rounded bg-rose-950 border border-rose-800">{cardOwnerWarning.uid}</span> is already owned by:
            </p>
            <p className="text-white font-bold bg-rose-950/80 p-2.5 rounded-xl border border-rose-900/80">
              👤 {cardOwnerWarning.ownerText}
            </p>
            <p className="text-[11px] text-rose-300 pt-0.5">
              ⚠️ You cannot assign this card to another person. Tap a new unassigned card or type a new UID below.
            </p>
          </div>
        )}

        {/* Success NFC Scan Alert */}
        {nfcAlert && (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{nfcAlert}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              HOD Full Name
            </label>
            <input
              type="text"
              required
              placeholder="Dr. Computer Science HOD"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              HOD Official Email Address
            </label>
            <input
              type="email"
              required
              placeholder="hod.cs@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              HOD Account Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required={!initialUser}
                placeholder={initialUser ? 'Leave blank to keep unchanged' : 'Minimum 8 characters'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-4 pr-11 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-rose-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Department Name
            </label>
            <input
              type="text"
              required
              placeholder="Computer Science & Engineering"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Fully Editable NFC Card UID Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Assign HOD NFC Card UID (Auto-updates on card tap)
              </label>
              <span className="text-[10px] text-rose-400 font-medium flex items-center gap-1">
                <Radio className="w-3 h-3 animate-pulse" /> Tap new card to replace
              </span>
            </div>
            <div className="relative">
              <CreditCard className="w-4 h-4 text-rose-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tap card on ESP8266 reader or edit UID e.g. DAC60431"
                value={nfcCardUid}
                onChange={(e) => {
                  setNfcCardUid(e.target.value.toUpperCase());
                  setCardOwnerWarning(null);
                }}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-rose-300 font-mono font-bold text-sm focus:outline-none focus:border-rose-500 uppercase"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <RefreshCw className="w-3 h-3 text-slate-500" />
              <span>Tap any card on the ESP8266 reader to immediately update this field.</span>
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!!cardOwnerWarning}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white text-xs font-semibold shadow-lg shadow-rose-500/25 disabled:opacity-50"
            >
              {initialUser ? 'Update & Save HOD' : 'Create HOD Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
