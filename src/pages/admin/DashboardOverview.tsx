import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdmin } from './AdminLayout';
import { StatusBadge } from '../../components/admin';
import AnimatedStatValue from '../../components/admin/AnimatedStatValue';
import InsightCard from '../../components/admin/InsightCard';
import * as adminApi from '../../services/adminApi';
import {
  isToday,
  isThisWeek,
  isWithinNextDays,
  formatCurrency,
  formatDate,
} from '../../utils/adminHelpers';
import type { Booking } from '../../types/admin';
import '../../styles/admin/index.css';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const DashboardOverview: React.FC = () => {
  const { t } = useTranslation();
  const { bookings, token, showToast, setActiveMenu, loading } = useAdmin();

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

  // -------------------------------------------------------------------
  // Priority Alerts
  // -------------------------------------------------------------------

  const alerts = useMemo(() => {
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    const todayStr = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    const overduePending = bookings.filter(
      (b) => b.status === 'pending' && now - new Date(b.createdAt).getTime() > twentyFourHours
    ).length;

    const todayUnconfirmed = bookings.filter(
      (b) => b.date.slice(0, 10) === todayStr && b.status === 'pending'
    ).length;

    const tomorrowReminder = bookings.filter(
      (b) => b.date.slice(0, 10) === tomorrowStr && b.status === 'confirmed'
    ).length;

    return { overduePending, todayUnconfirmed, tomorrowReminder };
  }, [bookings]);

  // -------------------------------------------------------------------
  // Trend calculations (this week vs last week)
  // -------------------------------------------------------------------

  const trends = useMemo(() => {
    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay());
    thisWeekStart.setHours(0, 0, 0, 0);

    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(thisWeekStart.getDate() - 7);

    const thisWeekEnd = new Date(thisWeekStart);
    thisWeekEnd.setDate(thisWeekStart.getDate() + 7);

    const isInRange = (dateStr: string, start: Date, end: Date) => {
      const d = new Date(dateStr);
      return d >= start && d < end;
    };

    const thisWeekBookings = bookings.filter((b) => isInRange(b.date, thisWeekStart, thisWeekEnd));
    const lastWeekBookings = bookings.filter((b) =>
      isInRange(b.date, lastWeekStart, thisWeekStart)
    );

    const calcTrend = (thisCnt: number, lastCnt: number): 'up' | 'down' | 'flat' => {
      if (thisCnt > lastCnt) return 'up';
      if (thisCnt < lastCnt) return 'down';
      return 'flat';
    };

    const todayCountThis = thisWeekBookings.filter((b) => isToday(b.date)).length;
    // For "today" trend, compare today's count against the same weekday last week
    const todayDayOfWeek = now.getDay();
    const lastWeekSameDay = new Date(lastWeekStart);
    lastWeekSameDay.setDate(lastWeekStart.getDate() + todayDayOfWeek);
    const lastWeekSameDayStr = lastWeekSameDay.toISOString().slice(0, 10);
    const todayCountLast = lastWeekBookings.filter(
      (b) => b.date.slice(0, 10) === lastWeekSameDayStr
    ).length;

    return {
      todayCount: calcTrend(todayCountThis, todayCountLast),
      weekCount: calcTrend(thisWeekBookings.length, lastWeekBookings.length),
      pending: calcTrend(
        thisWeekBookings.filter((b) => b.status === 'pending').length,
        lastWeekBookings.filter((b) => b.status === 'pending').length
      ),
      confirmed: calcTrend(
        thisWeekBookings.filter((b) => b.status === 'confirmed').length,
        lastWeekBookings.filter((b) => b.status === 'confirmed').length
      ),
      completed: calcTrend(
        thisWeekBookings.filter((b) => b.status === 'completed').length,
        lastWeekBookings.filter((b) => b.status === 'completed').length
      ),
    };
  }, [bookings]);

  // -------------------------------------------------------------------
  // Insights
  // -------------------------------------------------------------------

  const insights = useMemo(() => {
    const now = new Date();

    // Week-over-week revenue change
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay());
    thisWeekStart.setHours(0, 0, 0, 0);

    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(thisWeekStart.getDate() - 7);

    const thisWeekEnd = new Date(thisWeekStart);
    thisWeekEnd.setDate(thisWeekStart.getDate() + 7);

    const inRange = (dateStr: string, start: Date, end: Date) => {
      const d = new Date(dateStr);
      return d >= start && d < end;
    };

    const thisWeekRevenue = bookings
      .filter((b) => b.status === 'completed' && inRange(b.date, thisWeekStart, thisWeekEnd))
      .reduce((sum, b) => sum + (b.orderData?.estimatedTotal || 0), 0);

    const lastWeekRevenue = bookings
      .filter((b) => b.status === 'completed' && inRange(b.date, lastWeekStart, thisWeekStart))
      .reduce((sum, b) => sum + (b.orderData?.estimatedTotal || 0), 0);

    const revenueChange =
      lastWeekRevenue > 0
        ? Math.round(((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100)
        : thisWeekRevenue > 0
          ? 100
          : 0;

    const revenueTrend: 'up' | 'down' | 'flat' =
      revenueChange > 0 ? 'up' : revenueChange < 0 ? 'down' : 'flat';

    // Tomorrow's confirmed bookings
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);
    const tomorrowConfirmed = bookings.filter(
      (b) => b.date.slice(0, 10) === tomorrowStr && b.status === 'confirmed'
    ).length;

    // Average party size this month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthBookings = bookings.filter((b) => inRange(b.date, monthStart, monthEnd));
    const avgPartySize =
      monthBookings.length > 0
        ? Math.round(
            (monthBookings.reduce((sum, b) => sum + (b.guestCount || 0), 0) /
              monthBookings.length) *
              10
          ) / 10
        : 0;

    // Busiest region
    const regionCounts: Record<string, number> = {};
    bookings.forEach((b) => {
      if (b.region) {
        regionCounts[b.region] = (regionCounts[b.region] || 0) + 1;
      }
    });
    const busiestRegion = Object.entries(regionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

    // Sparkline: booking count per day for last 7 days
    const sparklineData: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(now.getDate() - i);
      const dayStr = day.toISOString().slice(0, 10);
      sparklineData.push(bookings.filter((b) => b.date.slice(0, 10) === dayStr).length);
    }

    return {
      revenueChange,
      revenueTrend,
      tomorrowConfirmed,
      avgPartySize,
      busiestRegion,
      sparklineData,
    };
  }, [bookings]);

  const statCards = useMemo(
    () => [
      {
        label: t('admin.stats.todayBookings'),
        value: stats.todayCount,
        icon: '📅',
        color: 'var(--admin-primary)',
        trend: trends.todayCount,
        onClick: () => setActiveMenu('calendar'),
      },
      {
        label: t('admin.stats.thisWeek'),
        value: stats.weekCount,
        icon: '📆',
        color: 'var(--admin-info)',
        trend: trends.weekCount,
      },
      {
        label: t('admin.stats.pending'),
        value: stats.pending,
        icon: '⏳',
        color: 'var(--admin-warning)',
        trend: trends.pending,
        onClick: () => setActiveMenu('bookings'),
      },
      {
        label: t('admin.stats.confirmed'),
        value: stats.confirmed,
        icon: '✅',
        color: 'var(--admin-success)',
        trend: trends.confirmed,
      },
      {
        label: t('admin.stats.completed'),
        value: stats.completed,
        icon: '🎉',
        color: 'var(--admin-info)',
        trend: trends.completed,
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
    [stats, trends, t, setActiveMenu]
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

  const trendArrow = (trend: 'up' | 'down' | 'flat') => {
    if (trend === 'up') return <span className="stat-trend up">↑</span>;
    if (trend === 'down') return <span className="stat-trend down">↓</span>;
    return <span className="stat-trend flat">→</span>;
  };

  return (
    <div className="dashboard-page">
      {/* Priority Alerts */}
      {(alerts.overduePending > 0 ||
        alerts.todayUnconfirmed > 0 ||
        alerts.tomorrowReminder > 0) && (
        <div className="dashboard-alerts">
          {alerts.overduePending > 0 && (
            <div className="alert-card alert-warning">
              <span className="alert-icon">⚠️</span>
              <div className="alert-content">
                <span className="alert-title">
                  {t('admin.alerts.overduePending', { count: alerts.overduePending })}
                </span>
              </div>
              <button className="alert-action" onClick={() => setActiveMenu('bookings')}>
                {t('admin.alerts.viewBookings')}
              </button>
            </div>
          )}
          {alerts.todayUnconfirmed > 0 && (
            <div className="alert-card alert-danger">
              <span className="alert-icon">🔴</span>
              <div className="alert-content">
                <span className="alert-title">
                  {t('admin.alerts.todayUnconfirmed', { count: alerts.todayUnconfirmed })}
                </span>
              </div>
              <button className="alert-action" onClick={() => setActiveMenu('bookings')}>
                {t('admin.alerts.viewBookings')}
              </button>
            </div>
          )}
          {alerts.tomorrowReminder > 0 && (
            <div className="alert-card alert-info">
              <span className="alert-icon">ℹ️</span>
              <div className="alert-content">
                <span className="alert-title">
                  {t('admin.alerts.tomorrowReminder', { count: alerts.tomorrowReminder })}
                </span>
              </div>
              <button className="alert-action" onClick={() => setActiveMenu('bookings')}>
                {t('admin.alerts.viewBookings')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Stats grid */}
      {loading ? (
        <div className="stats-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton skeleton-stat-card" />
          ))}
        </div>
      ) : (
        <div className="stats-grid">
          {statCards.map((stat) => (
            <div
              className={`stat-card${stat.onClick ? ' clickable' : ''}`}
              key={stat.label}
              onClick={stat.onClick}
              role={stat.onClick ? 'button' : undefined}
              tabIndex={stat.onClick ? 0 : undefined}
            >
              <div
                className="stat-icon"
                style={{ background: `${stat.color}15`, color: stat.color }}
              >
                {stat.icon}
              </div>
              <div className="stat-info">
                <AnimatedStatValue value={stat.value} color={stat.color} />
                <div className="stat-label">
                  {stat.label}
                  {stat.trend && trendArrow(stat.trend)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Insights */}
      {!loading && (
        <div className="insight-cards">
          <InsightCard
            icon="📈"
            title={t('admin.insights.revenueChange')}
            value={`${insights.revenueChange > 0 ? '+' : ''}${insights.revenueChange}%`}
            subtitle={t('admin.insights.weekOverWeek')}
            trend={insights.revenueTrend}
            sparklineData={insights.sparklineData}
          />
          <InsightCard
            icon="📋"
            title={t('admin.insights.tomorrowConfirmed')}
            value={insights.tomorrowConfirmed}
            subtitle={t('admin.insights.confirmedBookings')}
          />
          <InsightCard
            icon="👥"
            title={t('admin.insights.avgPartySize')}
            value={insights.avgPartySize}
            subtitle={t('admin.insights.thisMonth')}
          />
          <InsightCard
            icon="📍"
            title={t('admin.insights.busiestRegion')}
            value={insights.busiestRegion}
            subtitle={t('admin.insights.mostBookings')}
          />
        </div>
      )}

      {/* Quick actions */}
      <div className="card dashboard-card-spaced">
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
      <div className="card dashboard-card-spaced">
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
          <div className="dashboard-empty-state">{t('admin.dashboard.noBookings')}</div>
        )}
      </div>

      {/* Upcoming bookings (next 7 days) */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            {t('admin.dashboard.upcomingBookings')}{' '}
            <span className="dashboard-subtitle">({t('admin.dashboard.next7Days')})</span>
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
          <div className="dashboard-empty-state">{t('admin.dashboard.noUpcoming')}</div>
        )}
      </div>
    </div>
  );
};

export default DashboardOverview;
