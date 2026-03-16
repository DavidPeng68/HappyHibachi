import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '../ui/Icon/Icon';
import type { AdminNotification } from '../../types/admin';

interface NotificationBellProps {
  notifications: AdminNotification[];
  unreadCount: number;
  onMarkRead: (ids: string[]) => void;
  onMarkAllRead: () => void;
}

function timeAgo(
  createdAt: string,
  t: (key: string, opts?: Record<string, unknown>) => string
): string {
  const now = Date.now();
  const created = new Date(createdAt).getTime();
  const diffMs = now - created;
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMinutes < 1) return t('admin.notifications.justNow');
  if (diffHours < 1) return t('admin.notifications.minutesAgo', { count: diffMinutes });
  if (diffDays < 1) return t('admin.notifications.hoursAgo', { count: diffHours });
  return t('admin.notifications.daysAgo', { count: diffDays });
}

function typeLabel(type: AdminNotification['type'], t: (key: string) => string): string {
  switch (type) {
    case 'booking_assigned':
      return t('admin.notifications.bookingAssigned');
    case 'status_changed':
      return t('admin.notifications.statusChanged');
    case 'booking_cancelled':
      return t('admin.notifications.bookingCancelled');
    case 'reminder':
      return t('admin.notifications.reminder');
    default:
      return '';
  }
}

const NotificationBell: React.FC<NotificationBellProps> = ({
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleNotificationClick = (notification: AdminNotification) => {
    if (!notification.read) {
      onMarkRead([notification.id]);
    }
  };

  return (
    <div className="notification-bell">
      <button
        ref={buttonRef}
        className="btn-icon"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={t('admin.notifications.title')}
        title={t('admin.notifications.title')}
      >
        <Icon name="bell" size={18} />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notification-panel" ref={panelRef}>
          <div className="notification-header">
            <h4>{t('admin.notifications.title')}</h4>
            {unreadCount > 0 && (
              <button
                className="notification-mark-all-btn"
                onClick={() => {
                  onMarkAllRead();
                }}
              >
                {t('admin.notifications.markAllRead')}
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">{t('admin.notifications.empty')}</div>
            ) : (
              notifications.slice(0, 50).map((n) => (
                <div
                  key={n.id}
                  className={`notification-item${n.read ? '' : ' unread'}`}
                  onClick={() => handleNotificationClick(n)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNotificationClick(n);
                  }}
                >
                  <div className="notification-item-content">
                    <div className="notification-item-title">{typeLabel(n.type, t)}</div>
                    <div className="notification-item-message">{n.message}</div>
                    <div className="notification-item-time">{timeAgo(n.createdAt, t)}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && unreadCount > 0 && (
            <div className="notification-mark-all">
              <button onClick={onMarkAllRead}>{t('admin.notifications.markAllRead')}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
