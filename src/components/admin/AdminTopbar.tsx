import React from 'react';
import { useTranslation } from 'react-i18next';
import type { AdminNotification } from '../../types/admin';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import Icon from '../ui/Icon/Icon';
import NotificationBell from './NotificationBell';

interface AdminTopbarProps {
  pageTitle: string;
  displayName: string;
  notifications: AdminNotification[];
  unreadCount: number;
  onMarkRead: (ids: string[]) => void;
  onMarkAllRead: () => void;
  onRefresh: () => void;
  onLogout: () => void;
  onMobileMenuToggle?: () => void;
}

const AdminTopbar: React.FC<AdminTopbarProps> = ({
  pageTitle,
  displayName,
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onRefresh,
  onLogout,
  onMobileMenuToggle,
}) => {
  const { t } = useTranslation();
  const { isMobile } = useBreakpoint();

  return (
    <header className="topbar">
      <div className="topbar-left">
        {isMobile && onMobileMenuToggle && (
          <button
            className="btn-icon topbar-hamburger"
            onClick={onMobileMenuToggle}
            aria-label={t('admin.sidebar.navigation')}
          >
            <Icon name="menu" size={20} />
          </button>
        )}
        <h1 className="page-title">{pageTitle}</h1>
      </div>
      <div className="topbar-right">
        {!isMobile && (
          <button
            className="btn-icon"
            onClick={onRefresh}
            aria-label={t('admin.dashboard.refresh')}
            title={t('admin.dashboard.refresh')}
          >
            <Icon name="refresh" size={18} />
          </button>
        )}
        <NotificationBell
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkRead={onMarkRead}
          onMarkAllRead={onMarkAllRead}
        />
        {!isMobile && (
          <>
            <div className="user-info">
              <span className="user-avatar">
                <Icon name="user" size={18} />
              </span>
              <span className="user-name">{displayName}</span>
            </div>
            <button
              className="btn-icon"
              onClick={onLogout}
              aria-label={t('admin.dashboard.logout')}
            >
              <Icon name="log-out" size={18} />
            </button>
          </>
        )}
      </div>
    </header>
  );
};

export default React.memo(AdminTopbar);
