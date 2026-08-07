import { ShieldAlert, Inbox } from 'lucide-react';

export default function AuditLogs() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-rose-400" />
          Security Audit Event Logs
        </h1>
        <p className="text-slate-400 text-sm mt-1">Immutable security event history for compliance and auditing</p>
      </div>

      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden p-12 flex flex-col items-center justify-center gap-3">
        <Inbox className="w-10 h-10 text-slate-600" />
        <p className="text-sm font-semibold text-slate-400">No audit events recorded yet</p>
        <p className="text-xs text-slate-600 text-center max-w-sm">
          Audit entries will appear here as soon as the backend records security and management events.
        </p>
      </div>
    </div>
  );
}