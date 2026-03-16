import React, { forwardRef, useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../Icon';
import './DatePicker.css';

export interface DatePickerProps {
  label?: string;
  error?: string;
  hint?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name?: string;
  required?: boolean;
  minDate?: string;
  maxDate?: string;
  fullWidth?: boolean;
  className?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Custom DatePicker component with calendar dropdown
 */
export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  (
    {
      label,
      error,
      hint,
      value = '',
      onChange,
      name,
      required,
      minDate,
      maxDate,
      fullWidth = true,
      className = '',
    },
    ref
  ) => {
    const { t, i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const containerRef = useRef<HTMLDivElement>(null);
    const inputId = `datepicker-${Math.random().toString(36).substr(2, 9)}`;

    const selectedDate = useMemo(() => (value ? new Date(value + 'T00:00:00') : null), [value]);

    useEffect(() => {
      if (selectedDate) {
        setCurrentMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
      }
    }, [selectedDate]);

    // Close on outside click
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Get translated weekday names
    const getWeekdayName = (index: number) => {
      const key = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][index];
      return t(`calendar.weekdays.${key}`);
    };

    // Get translated month name
    const getMonthName = (month: number) => {
      const key = MONTHS[month].toLowerCase();
      return t(`calendar.months.${key}`);
    };

    // Format display date based on locale
    const formatDisplayDate = (date: Date | null): string => {
      if (!date) return '';

      const day = date.getDate();
      const monthNum = date.getMonth() + 1;
      const month = getMonthName(date.getMonth());
      const year = date.getFullYear();
      const lang = i18n.language;

      // Format based on language
      switch (lang) {
        case 'zh':
          // 中文: 2026年1月25日
          return `${year}年${monthNum}月${day}日`;
        case 'ja':
          // 日本語: 2026年1月25日
          return `${year}年${monthNum}月${day}日`;
        case 'ko':
          // 한국어: 2026년 1월 25일
          return `${year}년 ${monthNum}월 ${day}일`;
        case 'es':
          // Español: 25 de enero de 2026
          return `${day} de ${month.toLowerCase()} de ${year}`;
        case 'vi':
          // Tiếng Việt: 25 tháng 1, 2026
          return `${day} tháng ${monthNum}, ${year}`;
        case 'hi':
          // हिन्दी: 25 जनवरी 2026
          return `${day} ${month} ${year}`;
        case 'tl':
          // Filipino: Enero 25, 2026
          return `${month} ${day}, ${year}`;
        case 'en':
        default:
          // English: January 25, 2026
          return `${month} ${day}, ${year}`;
      }
    };

    // Get days in month
    const getDaysInMonth = (date: Date) => {
      return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    // Get first day of month (0-6)
    const getFirstDayOfMonth = (date: Date) => {
      return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    // Check if date is disabled
    const isDateDisabled = (date: Date) => {
      const dateStr = formatDateValue(date);
      if (minDate && dateStr < minDate) return true;
      if (maxDate && dateStr > maxDate) return true;
      return false;
    };

    // Check if date is today
    const isToday = (date: Date) => {
      const today = new Date();
      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    };

    // Check if date is selected
    const isSelected = (date: Date) => {
      if (!selectedDate) return false;
      return (
        date.getDate() === selectedDate.getDate() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getFullYear() === selectedDate.getFullYear()
      );
    };

    // Format date for value (YYYY-MM-DD)
    const formatDateValue = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Handle date selection
    const handleDateSelect = (day: number) => {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      if (isDateDisabled(date)) return;

      const dateValue = formatDateValue(date);

      // Create synthetic event
      const syntheticEvent = {
        target: { name, value: dateValue },
        currentTarget: { name, value: dateValue },
      } as React.ChangeEvent<HTMLInputElement>;

      onChange?.(syntheticEvent);
      setIsOpen(false);
    };

    // Navigate months
    const goToPrevMonth = () => {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    // Generate calendar days
    const renderCalendarDays = () => {
      const daysInMonth = getDaysInMonth(currentMonth);
      const firstDay = getFirstDayOfMonth(currentMonth);
      const days = [];

      // Empty cells for days before first day of month
      for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} className="datepicker__day datepicker__day--empty" />);
      }

      // Days of month
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const disabled = isDateDisabled(date);
        const selected = isSelected(date);
        const today = isToday(date);

        days.push(
          <button
            key={day}
            type="button"
            className={[
              'datepicker__day',
              disabled && 'datepicker__day--disabled',
              selected && 'datepicker__day--selected',
              today && 'datepicker__day--today',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => handleDateSelect(day)}
            disabled={disabled}
          >
            {day}
          </button>
        );
      }

      return days;
    };

    const wrapperClasses = [
      'datepicker-wrapper',
      fullWidth && 'datepicker-wrapper--full',
      error && 'datepicker-wrapper--error',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={wrapperClasses} ref={containerRef}>
        {label && (
          <label htmlFor={inputId} className="datepicker__label">
            {label}
            {required && <span className="datepicker__required">*</span>}
          </label>
        )}

        <div className="datepicker__container">
          <input ref={ref} type="hidden" name={name} value={value} required={required} />

          <button
            type="button"
            id={inputId}
            className={`datepicker__trigger ${value ? 'has-value' : ''}`}
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-haspopup="dialog"
          >
            <span className="datepicker__value">
              {selectedDate ? formatDisplayDate(selectedDate) : t('form.selectDate')}
            </span>
            <span className="datepicker__icon">
              <Icon name="calendar" size={18} />
            </span>
          </button>

          {isOpen && (
            <div className="datepicker__dropdown" role="dialog" aria-modal="true">
              <div className="datepicker__header">
                <button
                  type="button"
                  className="datepicker__nav"
                  onClick={goToPrevMonth}
                  aria-label={t('calendar.prevMonth')}
                >
                  ‹
                </button>
                <span className="datepicker__month-year">
                  {getMonthName(currentMonth.getMonth())} {currentMonth.getFullYear()}
                </span>
                <button
                  type="button"
                  className="datepicker__nav"
                  onClick={goToNextMonth}
                  aria-label={t('calendar.nextMonth')}
                >
                  ›
                </button>
              </div>

              <div className="datepicker__weekdays">
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="datepicker__weekday">
                    {getWeekdayName(i)}
                  </div>
                ))}
              </div>

              <div className="datepicker__days">{renderCalendarDays()}</div>

              <div className="datepicker__footer">
                <button
                  type="button"
                  className="datepicker__today-btn"
                  onClick={() => {
                    const today = new Date();
                    if (!isDateDisabled(today)) {
                      handleDateSelect(today.getDate());
                      setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                    }
                  }}
                >
                  {t('calendar.today')}
                </button>
              </div>
            </div>
          )}
        </div>

        {error && <span className="datepicker__error">{error}</span>}
        {hint && !error && <span className="datepicker__hint">{hint}</span>}
      </div>
    );
  }
);

DatePicker.displayName = 'DatePicker';

export default DatePicker;
