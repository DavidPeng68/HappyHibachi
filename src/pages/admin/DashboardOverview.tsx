import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdmin } from './AdminLayout';
import { StatusBadge } from '../../components/admin';
import * as adminApi from '../../services/adminApi';
import type { Booking } from '../../types/admin';
import '../AdminDashboard.css';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isToday(dateStr: string): boolean {
  const today = new Date();
  const d = new Date(dateStr);
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

function isThisWeek(dateStr: string): boolean {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  const d = new Date(dateStr);
  return d >= start && d < end;
}

function isWithinNextDays(dateStr: string, days: number): boolean {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const future = new Date(now);
  future.setDate(now.getDate() + days);
  const d = new Date(dateStr);
  return d >= now && d < future;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const DashboardOverview: React.FC = () => {
  const { t } = useTranslation();
  const { bookings, token, showToast, setActiveMenu } = useAdmin();

  const [sendingReminders, setSendingReminders] = useState(false);

  // -------------------------------------------------------------------
  // Stats
  // -------------------------------------------------------------------

  const stats = useMemo(() => {
    const todayCount = bookings.filter((b) => isToday(b.date)).length;
    const weekCount = bookings.filter((b) => isThisWeek(b.date)).length;
    const pending = bookings.filter((b) => b.status === 'pending').length;
    const confirmed = bookings.filter((b) => b.status === 'confirmed').length;
    const completed = bookings.filter((b) => b.status === 'completed').length;
    const totalGuests = bookings.reduce((sum, b) => sum + (b.guestCount || 0), 0);
    const revenue = bookings
      .filter((b) => b.status === 'completed')
      .reduce((sum, b) => sum + (b.orderData?.estimatedTotal || 0), 0);

    return { todayCount, weekCount, pending, confirmed, completed, totalGuests, revenue };
  }, [bookings]);

  const statCards = useMemo(
    () => [
      {
        label: t('admin.stats.todayBookings'),
        value: stats.todayCount,
        icon: '📅',
        color: 'var(--admin-primary)',
      },
      {
        label: t('admin.stats.thisWeek'),
        value: stats.weekCount,
        icon: '📆',
        color: 'var(--admin-info)',
      },
      {
        label: t('admin.stats.pending'),
        value: stats.pending,
        icon: '⏳',
        color: 'var(--admin-warning)',
      },
      {
        label: t('admin.stats.confirmed'),
        value: stats.confirmed,
        icon: '✅',
        color: 'var(--admin-success)',
      },
      {
        label: t('admin.stats.completed'),
        value: stats.completed,
        icon: '🎉',
        color: 'var(--admin-info)',
      },
      {
        label: t('admin.stats.totalGuests'),
        value: stats.totalGuests,
        icon: '👥',
        color: 'var(--admin-text-secondary)',
      },
      {
        label: t('admin.stats.revenue'),
        value: formatCurrency(stats.revenue),
        icon: '💰',
        color: 'var(--admin-success)',
        isRevenue: true,
      },
    ],
    [stats, t]
  );

  // -------------------------------------------------------------------
  // Recent & upcoming bookings
  // -------------------------------------------------------------------

  const recentBookings = useMemo(
    () =>
      [...bookings]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    [bookings]
  );

  const upcomingBookings = useMemo(
    () =>
      bookings
        .filter((b) => b.status === 'confirmed' && isWithinNextDays(b.date, 7))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [bookings]
  );

  // -------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------

  const handleSendReminders = useCallback(async () => {
    if (sendingReminders) return;
    setSendingReminders(true);
    try {
      const result = await adminApi.sendReminders(token);
      if (result.success) {
        showToast(t('admin.toast.remindersSent', { count: result.processed ?? 0 }), 'success');
      } else {
        showToast(t('admin.toast.sendFailed'), 'error');
      }
    } catch {
      showToast(t('admin.toast.sendFailed'), 'error');
    } finally {
      setSendingReminders(false);
    }
  }, [sendingReminders, token, showToast, t]);

  const handleExportCsv = useCallback(() => {
    if (bookings.length === 0) {
      showToast(t('admin.toast.noDataExport'), 'info');
      return;
    }

    const headers = ['Name', 'Email', 'Phone', 'Date', 'Time', 'Guests', 'Region', 'Status'];
    const rows = bookings.map((b) => [
      b.name,
      b.email,
      b.phone,
      b.date,
      b.time,
      String(b.guestCount),
      b.region,
      b.status,
    ]);

    const csv = [headers, ...rows].map((row) => row.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    showToast(t('admin.toast.exported', { count: bookings.length }), 'success');
  }, [bookings, showToast, t]);

  const handleViewCalendar = useCallback(() => {
    setActiveMenu('calendar');
  }, [setActiveMenu]);

  // -------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------

  const renderBookingRow = useCallback(
    (booking: Booking) => (
      <tr key={booking.id}>
        <td>{booking.name}</td>
        <td>{formatDate(booking.date)}</td>
        <td>{booking.guestCount}</td>
        <td>{booking.region}</td>
        <td>
          <StatusBadge status={booking.status} />
        </td>
      </tr>
    ),
    []
  );

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------

  return (
    <div className="dashboard-page">
      {/* Stats grid */}
      <div className="stats-grid">
        {statCards.map((stat) => (
          <div className="stat-card" key={stat.label}>
            <div className="stat-icon" style={{ background: `${stat.color}15`, color: stat.color }}>
              {stat.icon}
            </div>
            <div className="stat-info">
              <div className="stat-value" style={{ color: stat.color }}>
                {stat.isRevenue ? stat.value : stat.value}
              </div>
              <div className="stat-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">{t('admin.dashboard.quickActions')}</h3>
        </div>
        <div className="quick-actions">
          <button
            className="btn-action call"
            onClick={handleSendReminders}
            disabled={sendingReminders}
          >
            {sendingReminders ? '⏳' : '📧'} {t('admin.dashboard.sendReminders')}
          </button>
          <button className="btn-action sms" onClick={handleExportCsv}>
            📥 {t('admin.dashboard.exportCsv')}
          </button>
          <button className="btn-action email" onClick={handleViewCalendar}>
            📅 {t('admin.dashboard.viewCalendar')}
          </button>
        </div>
      </div>

      {/* Recent bookings */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">{t('admin.dashboard.recentBookings')}</h3>
        </div>
        {recentBookings.length > 0 ? (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('admin.dashboard.name')}</th>
                  <th>{t('admin.dashboard.date')}</th>
                  <th>{t('admin.dashboard.guests')}</th>
                  <th>{t('admin.dashboard.region')}</th>
                  <th>{t('admin.dashboard.status')}</th>
                </tr>
              </thead>
              <tbody>{recentBookings.map(renderBookingRow)}</tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
            {t('admin.dashboard.noBookings')}
          </div>
        )}
      </div>

      {/* Upcoming bookings (next 7 days) */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            {t('admin.dashboard.upcomingBookings')}{' '}
            <span
              style={{
                fontSize: '13px',
                fontWeight: 400,
                color: 'var(--admin-text-muted)',
              }}
            >
              ({t('admin.dashboard.next7Days')})
            </span>
          </h3>
        </div>
        {upcomingBookings.length > 0 ? (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('admin.dashboard.name')}</th>
                  <th>{t('admin.dashboard.date')}</th>
                  <th>{t('admin.dashboard.guests')}</th>
                  <th>{t('admin.dashboard.region')}</th>
                  <th>{t('admin.dashboard.status')}</th>
                </tr>
              </thead>
              <tbody>{upcomingBookings.map(renderBookingRow)}</tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
            {t('admin.dashboard.noUpcoming')}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardOverview;
