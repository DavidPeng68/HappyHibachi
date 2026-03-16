import React, { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { AdminMenuType } from '../../types/admin';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import Icon from '../ui/Icon/Icon';
import type { IconName } from '../ui/Icon/Icon';

// ---------------------------------------------------------------------------
// Constants (shared with AdminLayout)
// ---------------------------------------------------------------------------

export const MENU_ICONS: Record<AdminMenuType, IconName> = {
  dashboard: 'chart-bar',
  analytics: 'chart-line',
  bookings: 'clipboard',
  calendar: 'calendar',
  reviews: 'star-filled',
  coupons: 'ticket',
  gallery: 'camera',
  menu: 'utensils',
  instagram: 'instagram',
  customers: 'users',
  activity: 'activity',
  settings: 'settings-gear',
  users: 'user',
  team: 'users',
  dispatch: 'clipboard',
};

export const ALL_MENUS: AdminMenuType[] = [
  'dashboard',
  'analytics',
  'bookings',
  'calendar',
  'reviews',
  'coupons',
  'gallery',
  'menu',
  'instagram',
  'customers',
  'activity',
  'settings',
  'users',
  'team',
  'dispatch',
];

export const MENU_GROUPS: { labelKey: string; items: AdminMenuType[] }[] = [
  { labelKey: 'admin.sidebar.overview', items: ['dashboard', 'analytics'] },
  { labelKey: 'admin.sidebar.operations', items: ['bookings', 'calendar', 'customers'] },
  {
    labelKey: 'admin.sidebar.content',
    items: ['reviews', 'coupons', 'gallery', 'menu', 'instagram'],
  },
  { labelKey: 'admin.sidebar.admin', items: ['activity', 'settings', 'users', 'team', 'dispatch'] },
];

export const ORDER_MANAGER_MENUS: AdminMenuType[] = ['dashboard', 'bookings', 'calendar'];

export const MOBILE_NAV_ITEMS: AdminMenuType[] = ['dashboard', 'bookings', 'calendar', 'menu'];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AdminSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeMenu: AdminMenuType;
  visibleMenus: AdminMenuType[];
  onNavigate: (menu: AdminMenuType) => void;
  onLogout: () => void;
  getBadgeCount: (key: AdminMenuType) => number;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  collapsed,
  onToggleCollapse,
  activeMenu,
  visibleMenus,
  onNavigate,
  onLogout,
  getBadgeCount,
  mobileOpen = false,
  onMobileClose,
}) => {
  const { t } = useTranslation();
  const { isMobile } = useBreakpoint();
  const sidebarRef = useRef<HTMLElement>(null);
  const touchStartX = useRef<number | null>(null);

  const handleNavigate = useCallback(
    (menu: AdminMenuType) => {
      onNavigate(menu);
      if (isMobile && onMobileClose) {
        onMobileClose();
      }
    },
    [onNavigate, isMobile, onMobileClose]
  );

  // Close on Escape key
  useEffect(() => {
    if (!isMobile || !mobileOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onMobileClose?.();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isMobile, mobileOpen, onMobileClose]);

  // Swipe-to-close on mobile drawer
  useEffect(() => {
    if (!isMobile || !mobileOpen) return;
    const el = sidebarRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current === null) return;
      const diff = touchStartX.current - e.changedTouches[0].clientX;
      if (diff > 80) onMobileClose?.();
      touchStartX.current = null;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [isMobile, mobileOpen, onMobileClose]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobile && mobileOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isMobile, mobileOpen]);

  if (isMobile && !mobileOpen) return null;

  const isDrawer = isMobile && mobileOpen;

  return (
    <>
      {isDrawer && <div className="sidebar-overlay" onClick={onMobileClose} role="presentation" />}
      <aside
        ref={sidebarRef}
        className={`sidebar${collapsed && !isDrawer ? ' collapsed' : ''}${isDrawer ? ' sidebar--mobile-drawer' : ''}`}
        role="navigation"
      >
        <div className="sidebar-header">
          <span className="sidebar-logo" aria-hidden="true">
            <Icon name="fire" size={24} />
          </span>
          {(!collapsed || isDrawer) && (
            <span className="sidebar-title">{t('admin.dashboard.title')}</span>
          )}
          {!isDrawer && (
            <button
              className="sidebar-toggle"
              onClick={onToggleCollapse}
              aria-label={collapsed ? t('admin.sidebar.expand') : t('admin.sidebar.collapse')}
              aria-expanded={!collapsed}
              data-tooltip={collapsed ? t('admin.sidebar.expand') : undefined}
            >
              {collapsed ? '\u2192' : '\u2190'}
            </button>
          )}
          {isDrawer && (
            <button
              className="sidebar-toggle"
              onClick={onMobileClose}
              aria-label={t('common.close')}
            >
              &times;
            </button>
          )}
        </div>

        <nav className="sidebar-nav" aria-label={t('admin.sidebar.navigation')}>
          {MENU_GROUPS.map((group) => {
            const groupItems = group.items.filter((key) => visibleMenus.includes(key));
            if (groupItems.length === 0) return null;
            return (
              <div key={group.labelKey} className="sidebar-group">
                {(!collapsed || isDrawer) && (
                  <div className="sidebar-group-label">{t(group.labelKey)}</div>
                )}
                {groupItems.map((key) => {
                  const icon = MENU_ICONS[key];
                  const label = t(`admin.nav.${key}`);
                  const badge = getBadgeCount(key);
                  return (
                    <button
                      key={key}
                      className={`nav-item${activeMenu === key ? ' active' : ''}`}
                      onClick={() => handleNavigate(key)}
                      data-tooltip={collapsed && !isDrawer ? label : undefined}
                      aria-current={activeMenu === key ? 'page' : undefined}
                    >
                      <span className="nav-icon">
                        <Icon name={icon} size={18} />
                      </span>
                      {(!collapsed || isDrawer) && <span className="nav-label">{label}</span>}
                      {badge > 0 && <span className="nav-badge">{badge}</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item logout" onClick={onLogout}>
            <span className="nav-icon">
              <Icon name="log-out" size={18} />
            </span>
            {(!collapsed || isDrawer) && (
              <span className="nav-label">{t('admin.dashboard.logout')}</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

export default React.memo(AdminSidebar);
