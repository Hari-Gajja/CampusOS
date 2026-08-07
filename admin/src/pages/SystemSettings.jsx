import { useState } from 'react';
import { Settings, Save, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function SystemSettings() {
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [config, setConfig] = useState({
    defaultLateThreshold: 5,
    maxDevicesPerRoom: 2,
    heartbeatIntervalSec: 300,
    maintenanceMode: false,
  });

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setTimeout(() => {
      setSaving(false);
      setSuccessMsg('System configuration saved successfully.');
    }, 600);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-rose-400" />
          App-Wide System Configuration
        </h1>
        <p className="text-slate-400 text-sm mt-1">Configure global door grace periods, hardware limits & maintenance controls</p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="glass-panel p-8 rounded-3xl border border-slate-800 space-y-6">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Default Late Grace Threshold (Minutes)
              </label>
              <input
                type="number"
                value={config.defaultLateThreshold}
                onChange={(e) => setConfig({ ...config, defaultLateThreshold: parseInt(e.target.value, 10) })}
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Max NFC Door Readers per Classroom
              </label>
              <input
                type="number"
                value={config.maxDevicesPerRoom}
                onChange={(e) => setConfig({ ...config, maxDevicesPerRoom: parseInt(e.target.value, 10) })}
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Maintenance Mode Toggle */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Maintenance Mode Toggle
              </h4>
              <p className="text-xs text-slate-400 mt-1">Temporarily block non-admin portal logins during system upgrades</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.maintenanceMode}
                onChange={(e) => setConfig({ ...config, maintenanceMode: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
            </label>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white text-sm font-semibold shadow-lg shadow-rose-500/25 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Settings...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
