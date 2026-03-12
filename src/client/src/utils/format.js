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
  return dateStr.split('T')[0];
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
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
