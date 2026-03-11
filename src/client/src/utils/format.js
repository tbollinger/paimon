export function formatCurrency(value) {
  if (value == null) return '$0.00';
  return `$${Number(value).toFixed(2)}`;
}

export function formatNumber(value) {
  if (value == null) return '0';
  return Number(value).toLocaleString();
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export function formatProjectName(path) {
  if (!path || path === 'all') return 'All Projects';
  const parts = path.split('/');
  return parts.slice(-2).join('/');
}

export function percentChange(current, previous) {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}
