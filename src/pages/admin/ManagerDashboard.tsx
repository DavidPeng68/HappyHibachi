import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdmin } from './AdminLayout';
import { StatusBadge } from '../../components/admin';
import AnimatedStatValue from '../../components/admin/AnimatedStatValue';
import { isToday, isThisWeek, isWithinNextDays, formatDate } from '../../utils/adminHelpers';
import type { Booking } from '../../types/admin';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Group bookings by date string, sorted ascending */
function groupByDate(bookings: Booking[]): Record<string, Booking[]> {
  const groups: Record<string, Booking[]> = {};
  for (const b of bookings) {
    const key = b.date;
    if (!groups[key]) groups[key] = [];
    groups[key].push(b);
  }
  // Sort each group by time
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => a.time.localeCompare(b.time));
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ManagerDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { bookings, userId, setActiveMenu } = useAdmin();

  // Filter to only bookings assigned to the current user
  const myBookings = useMemo(
    () => bookings.filter((b) => b.assignedTo === userId),
    [bookings, userId]
  );

  // --- Personal stats ---
  const myBookingsToday = useMemo(() => myBookings.filter((b) => isToday(b.date)), [myBookings]);

  const myPending = useMemo(() => myBookings.filter((b) => b.status === 'pending'), [myBookings]);

  const myCompletedWeek = useMemo(
    () => myBookings.filter((b) => b.status === 'completed' && isThisWeek(b.date)),
    [myBookings]
  );

  const myGuestsWeek = useMemo(
    () =>
      myBookings.filter((b) => isThisWeek(b.date)).reduce((sum, b) => sum + (b.guestCount || 0), 0),
    [myBookings]
  );

  // --- Today's tasks (sorted by time) ---
  const todayTasks = useMemo(
    () => [...myBookingsToday].sort((a, b) => a.time.localeCompare(b.time)),
    [myBookingsToday]
  );

  // --- Next 7 days (excluding today) ---
  const upcoming7Days = useMemo(() => {
    const future = myBookings.filter((b) => isWithinNextDays(b.date, 8) && !isToday(b.date));
    future.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    return groupByDate(future);
  }, [myBookings]);

  const upcomingDates = useMemo(() => Object.keys(upcoming7Days).sort(), [upcoming7Days]);

  // --- Handlers ---
  const handleNavigateToBookings = () => {
    setActiveMenu('bookings');
  };

  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`);
  };

  const handleSms = (phone: string) => {
    window.open(`sms:${phone}`);
  };

  const handleEmail = (email: string) => {
    window.open(`mailto:${email}`);
  };

  // --- Stats cards ---
  const stats = [
    { value: myBookingsToday.length, label: t('admin.manager.myBookingsToday') },
    { value: myPending.length, label: t('admin.manager.myPending') },
    { value: myCompletedWeek.length, label: t('admin.manager.myCompletedWeek') },
    { value: myGuestsWeek, label: t('admin.manager.myGuestsWeek') },
  ];

  return (
    <div className="manager-dashboard">
      <h2>{t('admin.manager.title')}</h2>

      {/* Personal Stats */}
      <div className="manager-stats">
        {stats.map((s, i) => (
          <div key={i} className="manager-stat-card">
            <AnimatedStatValue value={s.value} className="manager-stat-value" />
            <div className="manager-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Today's Tasks */}
      <div className="manager-tasks">
        <h3>{t('admin.manager.todaysTasks')}</h3>
        {todayTasks.length === 0 ? (
          <p className="text-muted text-sm">{t('admin.manager.noTasksToday')}</p>
        ) : (
          <div className="manager-timeline">
            {todayTasks.map((b) => (
              <div key={b.id} className="manager-timeline-item" onClick={handleNavigateToBookings}>
                <div className="manager-timeline-marker">
                  <div className={`manager-timeline-dot ${b.status}`} />
                </div>
                <div className="manager-timeline-time">{b.time}</div>
                <div className="manager-timeline-content">
                  <div className="manager-task-name">{b.name}</div>
                  <div className="manager-task-details">
                    {t('admin.cardView.guests', { count: b.guestCount })} &middot; {b.region}
                  </div>
                  <StatusBadge status={b.status} />
                  <div className="manager-task-actions">
                    <button
                      className="admin-btn admin-btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCall(b.phone);
                      }}
                    >
                      {t('admin.manager.call')}
                    </button>
                    <button
                      className="admin-btn admin-btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSms(b.phone);
                      }}
                    >
                      {t('admin.manager.sms')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Next 7 Days Timeline */}
      <div className="manager-tasks">
        <h3>{t('admin.manager.upcoming7Days')}</h3>
        {upcomingDates.length === 0 ? (
          <p className="text-muted text-sm">{t('admin.manager.noUpcoming')}</p>
        ) : (
          upcomingDates.map((date) => (
            <div key={date}>
              <div className="manager-timeline-date">{formatDate(date)}</div>
              {upcoming7Days[date].map((b) => (
                <div key={b.id} className="manager-task-item" onClick={handleNavigateToBookings}>
                  <span className="manager-task-time">{b.time}</span>
                  <div className="manager-task-info">
                    <div className="manager-task-name">{b.name}</div>
                    <div className="manager-task-details">
                      {t('admin.cardView.guests', { count: b.guestCount })} &middot; {b.region}
                    </div>
                  </div>
                  <StatusBadge status={b.status} />
                  <div className="manager-task-actions">
                    <button
                      className="admin-btn admin-btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCall(b.phone);
                      }}
                    >
                      {t('admin.manager.call')}
                    </button>
                    <button
                      className="admin-btn admin-btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSms(b.phone);
                      }}
                    >
                      {t('admin.manager.sms')}
                    </button>
                    <button
                      className="admin-btn admin-btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEmail(b.email);
                      }}
                    >
                      {t('admin.manager.email')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ManagerDashboard;
