import { format, parseISO, isValid } from 'date-fns';

export function formatDate(dateString, pattern = 'MMM dd, yyyy') {
  if (!dateString) return 'N/A';
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return isValid(date) ? format(date, pattern) : 'Invalid Date';
  } catch {
    return 'N/A';
  }
}

export function formatTime(timeString) {
  if (!timeString) return 'N/A';
  try {
    const date = typeof timeString === 'string' ? parseISO(timeString) : timeString;
    return isValid(date) ? format(date, 'hh:mm a') : timeString;
  } catch {
    return timeString;
  }
}

export function getStatusBadgeColor(status) {
  switch (status?.toLowerCase()) {
    case 'on-time':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'late':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'absent':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    default:
      return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  }
}
