/**
 * Shared utility functions for admin dashboard pages.
 * Extracted from DashboardOverview, BookingManagement, etc. to avoid duplication.
 */

export function isToday(dateStr: string): boolean {
  const today = new Date();
  const d = new Date(dateStr);
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

export function isThisWeek(dateStr: string): boolean {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  const d = new Date(dateStr);
  return d >= start && d < end;
}

export function isWithinNextDays(dateStr: string, days: number): boolean {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const future = new Date(now);
  future.setDate(now.getDate() + days);
  const d = new Date(dateStr);
  return d >= now && d < future;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  pending: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  confirmed: { color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  completed: { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  cancelled: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
};

export function getStatusColor(status: string): { color: string; bg: string } {
  return STATUS_COLORS[status] || { color: '#6b7280', bg: 'rgba(107,114,128,0.15)' };
}
