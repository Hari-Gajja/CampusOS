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

export function exportToCSV(filename, rows) {
  if (!rows || !rows.length) return;
  const separator = ',';
  const keys = Object.keys(rows[0]);
  const csvContent =
    keys.join(separator) +
    '\n' +
    rows
      .map((row) =>
        keys
          .map((k) => {
            let cell = row[k] === null || row[k] === undefined ? '' : row[k];
            cell = cell.toString().replace(/"/g, '""');
            if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`;
            return cell;
          })
          .join(separator)
      )
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
