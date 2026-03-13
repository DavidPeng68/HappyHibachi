/**
 * Calendar utility functions
 * Generate links for adding events to various calendar applications
 */

import i18n from '../i18n';

export interface CalendarEvent {
  title: string;
  description: string;
  location: string;
  startDate: string; // YYYY-MM-DD format
  startTime?: string; // HH:MM format (24-hour)
  endTime?: string; // HH:MM format (24-hour)
  duration?: number; // Duration in hours (default: 3)
}

/**
 * Format date for calendar URLs
 */
const formatDateTime = (date: string, time?: string): string => {
  const d = new Date(date + 'T' + (time || '18:00') + ':00');
  return d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
};

/**
 * Generate Google Calendar URL
 */
export const generateGoogleCalendarUrl = (event: CalendarEvent): string => {
  const duration = event.duration || 3;
  const startTime = event.startTime || '18:00';

  // Calculate end time
  const [hours, minutes] = startTime.split(':').map(Number);
  const endHours = hours + duration;
  const endTime =
    event.endTime || `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  const start = formatDateTime(event.startDate, startTime);
  const end = formatDateTime(event.startDate, endTime);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${start}/${end}`,
    details: event.description,
    location: event.location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

/**
 * Generate Outlook Calendar URL
 */
export const generateOutlookCalendarUrl = (event: CalendarEvent): string => {
  const duration = event.duration || 3;
  const startTime = event.startTime || '18:00';

  const [hours, minutes] = startTime.split(':').map(Number);
  const endHours = hours + duration;
  const endTime =
    event.endTime || `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  const startDateTime = `${event.startDate}T${startTime}:00`;
  const endDateTime = `${event.startDate}T${endTime}:00`;

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    body: event.description,
    location: event.location,
    startdt: startDateTime,
    enddt: endDateTime,
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
};

/**
 * Generate .ics file content for Apple Calendar and other apps
 */
export const generateICSContent = (event: CalendarEvent): string => {
  const duration = event.duration || 3;
  const startTime = event.startTime || '18:00';

  const [hours, minutes] = startTime.split(':').map(Number);
  const endHours = hours + duration;
  const endTime =
    event.endTime || `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  const start = formatDateTime(event.startDate, startTime);
  const end = formatDateTime(event.startDate, endTime);

  const domain = event.title.replace(/[^a-zA-Z]/g, '').toLowerCase() || 'hibachi';
  const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@${domain}.com`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${event.title}//Booking//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
    `LOCATION:${event.location}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return icsContent;
};

/**
 * Download .ics file
 */
export const downloadICS = (event: CalendarEvent): void => {
  const icsContent = generateICSContent(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `hibachi-booking-${event.startDate}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Convert time slot ID to actual time
 * If the time is already in HH:MM format, return it directly
 */
const timeSlotToTime = (timeSlot: string | undefined): string => {
  // Check if it's already a time format (HH:MM)
  if (timeSlot && /^\d{1,2}:\d{2}$/.test(timeSlot)) {
    return timeSlot;
  }
  // Default time slot mappings (fallback)
  const timeMap: Record<string, string> = {
    afternoon: '13:00',
    evening: '17:00',
    night: '19:00',
  };
  return timeMap[timeSlot || ''] || '18:00';
};

interface HibachiEventOptions {
  brandName?: string;
  phone?: string;
  email?: string;
}

export const createHibachiEvent = (
  date: string,
  time: string | undefined,
  guestCount: number,
  region: string,
  customerName: string,
  timeSlotLabel?: string,
  options?: HibachiEventOptions
): CalendarEvent => {
  const startTime = timeSlotToTime(time);
  const brand = options?.brandName || 'Family Friends Hibachi';
  const phone = options?.phone || '909-615-6633';
  const email = options?.email || 'familyfriendshibachi@gmail.com';

  return {
    title: i18n.t('calendarEvent.title', { brand }),
    description: `${i18n.t('calendarEvent.description')}\n\n${i18n.t('calendarEvent.guests')}: ${guestCount}\n${i18n.t('calendarEvent.region')}: ${region.toUpperCase()}\n${i18n.t('calendarEvent.bookedBy')}: ${customerName}${timeSlotLabel ? `\n${i18n.t('calendarEvent.time')}: ${timeSlotLabel}` : ''}\n\n${i18n.t('calendarEvent.chefArrival')}\n\n${i18n.t('calendarEvent.contact')}: ${phone}\n${i18n.t('calendarEvent.email')}: ${email}`,
    location: i18n.t('calendarEvent.locationTBD', { region: region.toUpperCase() }),
    startDate: date,
    startTime: startTime,
    duration: 3,
  };
};
