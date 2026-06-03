import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../ui';
import './Calendar.css';

interface CalendarProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  region?: string;
}

interface BookedDate {
  date: string;
  count: number;
}

interface BlockedDate {
  date: string;
  reason?: string;
  region?: string;
}

const Calendar: React.FC<CalendarProps> = ({ selectedDate, onDateSelect, region }) => {
  const { t, i18n } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [bookedDates, setBookedDates] = useState<BookedDate[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Fetch calendar data
  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      setCalendarError(null);
      setHasError(false);
      const response = await fetch(`/api/calendar${region ? `?region=${region}` : ''}`);
      if (!response.ok) throw new Error('API error');
      const result = await response.json();
      if (result.success) {
        setBookedDates(result.bookedDates || []);
        setBlockedDates(result.blockedDates || []);
      }
    } catch {
      if (window.location.hostname === 'localhost') {
        // Local dev without API — use empty data
        setBookedDates([]);
        setBlockedDates([]);
      } else {
        setHasError(true);
        setCalendarError(t('calendar.loadError'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, currentMonth, t]);

  // Get month name
  const getMonthName = (date: Date): string => {
    return date.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' });
  };

  // Get weekday labels
  const getWeekDays = (): string[] => {
    const days = [];
    const baseDate = new Date(2024, 0, 7); // Sunday
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      days.push(d.toLocaleDateString(i18n.language, { weekday: 'short' }));
    }
    return days;
  };

  // Build day cells for the current month grid
  const getDaysInMonth = (): (number | null)[] => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: (number | null)[] = [];

    // Leading empty cells before day 1
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Day numbers 1 … last day of month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  // Format as YYYY-MM-DD
  const formatDate = (day: number): string => {
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${month}-${d}`;
  };

  // Whether the day is before today
  const isPastDate = (day: number): boolean => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Whether the day is blocked in admin/config
  const isDateBlocked = (day: number): boolean => {
    const dateStr = formatDate(day);
    return blockedDates.some((b) => b.date === dateStr);
  };

  // Booking load for this day
  const getBookingStatus = (day: number): 'available' | 'limited' | 'busy' | 'blocked' => {
    const dateStr = formatDate(day);

    if (blockedDates.some((b) => b.date === dateStr)) {
      return 'blocked';
    }

    const booked = bookedDates.find((b) => b.date === dateStr);

    if (!booked || booked.count === 0) return 'available';
    if (booked.count >= 3) return 'busy';
    return 'limited';
  };

  // Check if currently viewing the month that contains today
  const isCurrentMonth = (): boolean => {
    const today = new Date();
    return (
      currentMonth.getFullYear() === today.getFullYear() &&
      currentMonth.getMonth() === today.getMonth()
    );
  };

  // Jump to today's month
  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const changeMonth = (delta: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + delta);

    const today = new Date();
    if (
      newMonth.getFullYear() < today.getFullYear() ||
      (newMonth.getFullYear() === today.getFullYear() && newMonth.getMonth() < today.getMonth())
    ) {
      return;
    }

    setCurrentMonth(newMonth);
  };

  const handleDateClick = (day: number) => {
    if (isPastDate(day)) return;
    if (isDateBlocked(day)) return;
    if (hasError) return;

    const dateStr = formatDate(day);
    onDateSelect(dateStr);
  };

  // Arrow key navigation for calendar days
  const calendarGridRef = useRef<HTMLDivElement>(null);

  const focusDayButton = useCallback((day: number) => {
    const grid = calendarGridRef.current;
    if (!grid) return;
    const btn = grid.querySelector<HTMLButtonElement>(`button[data-day="${day}"]`);
    btn?.focus();
  }, []);

  const handleDayKeyDown = (e: React.KeyboardEvent, day: number) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let targetDay: number | null = null;

    switch (e.key) {
      case 'ArrowLeft':
        targetDay = day - 1;
        break;
      case 'ArrowRight':
        targetDay = day + 1;
        break;
      case 'ArrowUp':
        targetDay = day - 7;
        break;
      case 'ArrowDown':
        targetDay = day + 7;
        break;
      case 'Home':
        targetDay = 1;
        break;
      case 'End':
        targetDay = daysInMonth;
        break;
      default:
        return;
    }

    e.preventDefault();

    if (targetDay !== null && targetDay >= 1 && targetDay <= daysInMonth) {
      focusDayButton(targetDay);
    }
  };

  const weekDays = getWeekDays();
  const days = getDaysInMonth();

  return (
    <div className="calendar">
      {calendarError && (
        <div className="calendar-error" role="alert">
          {calendarError}
          <button type="button" className="calendar-retry-btn" onClick={() => fetchCalendarData()}>
            {t('calendar.retry')}
          </button>
        </div>
      )}
      {loading && (
        <div className="calendar-loading" role="status">
          <span className="loading-spinner" aria-hidden="true"></span>
          <span>{t('calendar.loading')}</span>
        </div>
      )}
      <div className="calendar-header">
        <button
          type="button"
          className="month-btn"
          onClick={() => changeMonth(-1)}
          aria-label={t('calendar.prevMonth')}
        >
          <Icon name="chevron-left" size={16} aria-hidden />
        </button>
        <span className="month-name">{getMonthName(currentMonth)}</span>
        {!isCurrentMonth() && (
          <button type="button" className="today-btn" onClick={goToToday}>
            {t('calendar.goToToday')}
          </button>
        )}
        <button
          type="button"
          className="month-btn"
          onClick={() => changeMonth(1)}
          aria-label={t('calendar.nextMonth')}
        >
          <Icon name="chevron-right" size={16} aria-hidden />
        </button>
      </div>

      <div className="calendar-weekdays">
        {weekDays.map((day) => (
          <div key={day} className="weekday">
            {day}
          </div>
        ))}
      </div>

      <div className="calendar-days" ref={calendarGridRef} role="grid">
        {days.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="day empty" />;
          }

          const dateStr = formatDate(day);
          const isPast = isPastDate(day);
          const status = getBookingStatus(day);
          const isSelected = dateStr === selectedDate;
          const isBlocked = status === 'blocked';
          const isDisabledByError = hasError && !isPast;

          return (
            <button
              key={day}
              type="button"
              data-day={day}
              tabIndex={isSelected ? 0 : -1}
              className={`day ${isPast ? 'past' : ''} ${status} ${isSelected ? 'selected' : ''} ${isDisabledByError ? 'error-disabled' : ''}`}
              onClick={() => handleDateClick(day)}
              onKeyDown={(e) => handleDayKeyDown(e, day)}
              disabled={isPast || isBlocked || isDisabledByError}
              aria-label={`${day}, ${isDisabledByError ? 'unavailable' : isBlocked ? 'unavailable' : status === 'busy' ? 'busy' : status === 'limited' ? 'limited availability' : 'available'}`}
            >
              <span className="day-number">{day}</span>
              {!isPast && !isBlocked && !isDisabledByError && (
                <span className={`status-indicator ${status}`} aria-hidden="true">
                  {status === 'available' && '○'}
                  {status === 'limited' && '△'}
                  {status === 'busy' && '■'}
                </span>
              )}
              {isBlocked && (
                <span className="blocked-indicator" aria-hidden="true">
                  ✕
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-dot available" aria-hidden="true" />
          <span>{t('calendar.available')}</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot limited" aria-hidden="true" />
          <span>{t('calendar.limited')}</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot busy" aria-hidden="true" />
          <span>{t('calendar.busy')}</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot unavailable" aria-hidden="true" />
          <span>{t('calendar.unavailable')}</span>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
