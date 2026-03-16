import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { BlockedDate, Booking } from '../../types/admin';
import * as adminApi from '../../services/adminApi';
import { ConfirmDialog } from '../../components/admin';
import { useAdmin } from './AdminLayout';

// ---------------------------------------------------------------------------
// Status config (mirrors AdminDashboard pattern)
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: '#f59e0b' },
  confirmed: { label: 'Confirmed', color: '#22c55e' },
  completed: { label: 'Completed', color: '#3b82f6' },
  cancelled: { label: 'Cancelled', color: '#ef4444' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CalendarManagement: React.FC = () => {
  const { t } = useTranslation();
  const { token, showToast, bookings, setActiveMenu } = useAdmin();

  // Local state
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [confirmUnblock, setConfirmUnblock] = useState<string | null>(null);

  // Fetch calendar data on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminApi.fetchCalendar().then((res) => {
      if (!cancelled && res.success) {
        setBlockedDates(res.blockedDates);
      }
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Calendar computation helpers
  const getDaysInMonth = useCallback((): (number | null)[] => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= totalDays; d++) days.push(d);
    return days;
  }, [calendarMonth]);

  const formatCalendarDate = useCallback(
    (day: number): string => {
      const year = calendarMonth.getFullYear();
      const month = String(calendarMonth.getMonth() + 1).padStart(2, '0');
      const d = String(day).padStart(2, '0');
      return `${year}-${month}-${d}`;
    },
    [calendarMonth]
  );

  const isDateBlocked = useCallback(
    (day: number): boolean => blockedDates.some((b) => b.date === formatCalendarDate(day)),
    [blockedDates, formatCalendarDate]
  );

  const getDateBookings = useCallback(
    (day: number): Booking[] =>
      bookings.filter((b) => b.date === formatCalendarDate(day) && b.status !== 'cancelled'),
    [bookings, formatCalendarDate]
  );

  const isPastDate = useCallback(
    (day: number): boolean => {
      const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date < today;
    },
    [calendarMonth]
  );

  // Selected date helpers
  const selectedDay = selectedCalendarDate ? parseInt(selectedCalendarDate.split('-')[2]) : null;

  const selectedDateIsBlocked = selectedDay !== null ? isDateBlocked(selectedDay) : false;
  const selectedDateBookings = selectedDay !== null ? getDateBookings(selectedDay) : [];

  // Block / unblock actions
  const handleBlockDate = useCallback(
    async (date: string, reason: string) => {
      setUpdating(true);
      const res = await adminApi.addBlockedDate(token, date, reason);
      if (res.success) {
        setBlockedDates(res.blockedDates);
        setBlockReason('');
        showToast(t('admin.toast.dateClosed'), 'success');
      } else {
        showToast((res as { error?: string }).error ?? t('admin.toast.operationFailed'), 'error');
      }
      setUpdating(false);
    },
    [token, showToast, t]
  );

  const handleUnblockDate = useCallback(
    async (date: string) => {
      setUpdating(true);
      const res = await adminApi.removeBlockedDate(token, date);
      if (res.success) {
        setBlockedDates(res.blockedDates);
        showToast(t('admin.toast.dateOpened'), 'success');
      } else {
        showToast((res as { error?: string }).error ?? t('admin.toast.operationFailed'), 'error');
      }
      setUpdating(false);
      setConfirmUnblock(null);
    },
    [token, showToast, t]
  );

  // Month navigation
  const goToPrevMonth = useCallback(() => {
    setCalendarMonth((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setCalendarMonth((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  }, []);

  // Sorted blocked dates for the list
  const sortedBlockedDates = useMemo(
    () => [...blockedDates].sort((a, b) => a.date.localeCompare(b.date)),
    [blockedDates]
  );

  if (loading) {
    return (
      <div className="empty-state">
        <p>{t('admin.calendar.loading')}</p>
      </div>
    );
  }

  return (
    <div className="calendar-page">
      <div className="calendar-grid">
        {/* Calendar widget */}
        <div className="card">
          <div className="card-header">
            <button
              className="btn-icon"
              onClick={goToPrevMonth}
              aria-label={t('admin.calendar.prevMonth')}
              type="button"
            >
              &#9664;
            </button>
            <h2>
              {calendarMonth.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
              })}
            </h2>
            <button
              className="btn-icon"
              onClick={goToNextMonth}
              aria-label={t('admin.calendar.nextMonth')}
              type="button"
            >
              &#9654;
            </button>
          </div>

          <div className="calendar-widget">
            <div className="calendar-weekdays">
              {[
                t('admin.calendar.sun'),
                t('admin.calendar.mon'),
                t('admin.calendar.tue'),
                t('admin.calendar.wed'),
                t('admin.calendar.thu'),
                t('admin.calendar.fri'),
                t('admin.calendar.sat'),
              ].map((d) => (
                <div key={d} className="weekday">
                  {d}
                </div>
              ))}
            </div>

            <div className="calendar-days">
              {getDaysInMonth().map((day, i) => {
                if (day === null) return <div key={`e-${i}`} className="day empty" />;
                const dateStr = formatCalendarDate(day);
                const blocked = isDateBlocked(day);
                const dayBookings = getDateBookings(day);
                const past = isPastDate(day);
                const selected = selectedCalendarDate === dateStr;

                const bookingCount = dayBookings.length;
                const heatLevel =
                  bookingCount === 0 ? 0 : bookingCount === 1 ? 1 : bookingCount <= 3 ? 2 : 3;
                const totalGuests = dayBookings.reduce((sum, bk) => sum + (bk.guestCount || 0), 0);

                return (
                  <button
                    key={day}
                    className={`day ${past ? 'past' : ''} ${blocked ? 'blocked' : ''} ${selected ? 'selected' : ''}`}
                    onClick={() => !past && setSelectedCalendarDate(selected ? null : dateStr)}
                    disabled={past}
                    type="button"
                    aria-label={`${day}${blocked ? ` - ${t('admin.calendar.blocked')}` : ''}${bookingCount > 0 ? ` - ${bookingCount} ${t('admin.calendar.bookingsLabel')}` : ''}`}
                    {...(heatLevel > 0 ? { 'data-heat': String(heatLevel) } : {})}
                  >
                    <span className="day-num">{day}</span>
                    {bookingCount > 0 && <span className="day-count">{bookingCount}</span>}
                    {bookingCount > 0 && (
                      <span className="day-guests">
                        {t('admin.calendar.guestsTotal', { count: totalGuests })}
                      </span>
                    )}
                    {blocked && <span className="day-blocked">&#128683;</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="calendar-legend">
            <div className="legend-item">
              <span className="legend-dot available" /> {t('admin.calendar.available')}
            </div>
            <div className="legend-item">
              <span className="legend-dot blocked" /> {t('admin.calendar.blocked')}
            </div>
            <div className="legend-item">
              <span className="legend-dot booked" /> {t('admin.calendar.hasBookings')}
            </div>
            <div className="legend-item">
              <span className="legend-dot heat-low" /> {t('admin.calendar.heatLow')}
            </div>
            <div className="legend-item">
              <span className="legend-dot heat-med" /> {t('admin.calendar.heatMed')}
            </div>
            <div className="legend-item">
              <span className="legend-dot heat-high" /> {t('admin.calendar.heatHigh')}
            </div>
          </div>
        </div>

        {/* Date detail panel */}
        <div className="card">
          {selectedCalendarDate ? (
            <>
              <div className="card-header">
                <h2>{formatDate(selectedCalendarDate)}</h2>
              </div>

              {selectedDateIsBlocked ? (
                <div className="date-action">
                  <p className="status-text blocked">&#128683; {t('admin.calendar.dateBlocked')}</p>
                  <button
                    className="btn-success"
                    onClick={() => setConfirmUnblock(selectedCalendarDate)}
                    disabled={updating}
                    type="button"
                  >
                    {updating ? t('admin.calendar.processing') : t('admin.calendar.openDate')}
                  </button>
                </div>
              ) : (
                <div className="date-action">
                  <p className="status-text open">&#10003; {t('admin.calendar.dateAvailable')}</p>
                  <input
                    type="text"
                    placeholder={t('admin.calendar.blockReasonPlaceholder')}
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    className="input"
                  />
                  <button
                    className="btn-danger"
                    onClick={() => handleBlockDate(selectedCalendarDate, blockReason)}
                    disabled={updating}
                    type="button"
                  >
                    {updating ? t('admin.calendar.processing') : t('admin.calendar.blockDate')}
                  </button>
                </div>
              )}

              {selectedDateBookings.length > 0 && (
                <div className="date-bookings">
                  <h4>{t('admin.calendar.bookingsForDate')}</h4>
                  {selectedDateBookings.map((b) => (
                    <div
                      key={b.id}
                      className="mini-booking"
                      onClick={() => setActiveMenu('bookings')}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') setActiveMenu('bookings');
                      }}
                    >
                      <span>{b.name}</span>
                      <span>
                        {b.guestCount} {t('admin.booking.guests')}
                      </span>
                      <span style={{ color: STATUS_CONFIG[b.status]?.color }}>
                        {STATUS_CONFIG[b.status]?.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <p>{t('admin.calendar.selectDateHint')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Blocked dates list */}
      <div className="card">
        <div className="card-header">
          <h2>
            &#128683; {t('admin.calendar.blockedDates')} ({blockedDates.length})
          </h2>
        </div>
        {sortedBlockedDates.length === 0 ? (
          <div className="empty-state">
            <p>{t('admin.calendar.noBlockedDates')}</p>
          </div>
        ) : (
          <div className="blocked-list">
            {sortedBlockedDates.map((blocked) => (
              <div key={blocked.date} className="blocked-item">
                <div className="blocked-info">
                  <span className="blocked-date">{formatDate(blocked.date)}</span>
                  {blocked.reason && <span className="blocked-reason">{blocked.reason}</span>}
                </div>
                <button
                  className="btn-sm-success"
                  onClick={() => setConfirmUnblock(blocked.date)}
                  type="button"
                >
                  {t('admin.calendar.open')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm unblock dialog */}
      <ConfirmDialog
        open={confirmUnblock !== null}
        title={t('admin.calendar.confirmUnblockTitle')}
        message={t('admin.calendar.confirmUnblockMessage')}
        confirmLabel={t('admin.calendar.openDate')}
        variant="warning"
        loading={updating}
        onConfirm={() => confirmUnblock && handleUnblockDate(confirmUnblock)}
        onCancel={() => setConfirmUnblock(null)}
      />
    </div>
  );
};

export default CalendarManagement;
