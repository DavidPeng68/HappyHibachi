import React from 'react';
import { useTranslation } from 'react-i18next';
import type { AdminMenuType } from '../../types/admin';
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
}) => {
  const { t } = useTranslation();

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="sidebar-header">
        <span className="sidebar-logo" role="img" aria-label="logo">
          <Icon name="fire" size={24} />
        </span>
        {!collapsed && <span className="sidebar-title">{t('admin.dashboard.title')}</span>}
        <button
          className="sidebar-toggle"
          onClick={onToggleCollapse}
          aria-label={collapsed ? t('admin.sidebar.expand') : t('admin.sidebar.collapse')}
          aria-expanded={!collapsed}
          data-tooltip={collapsed ? t('admin.sidebar.expand') : undefined}
        >
          {collapsed ? '\u2192' : '\u2190'}
        </button>
      </div>

      <nav className="sidebar-nav" aria-label={t('admin.sidebar.navigation')}>
        {MENU_GROUPS.map((group) => {
          const groupItems = group.items.filter((key) => visibleMenus.includes(key));
          if (groupItems.length === 0) return null;
          return (
            <div key={group.labelKey} className="sidebar-group">
              {!collapsed && <div className="sidebar-group-label">{t(group.labelKey)}</div>}
              {groupItems.map((key) => {
                const icon = MENU_ICONS[key];
                const label = t(`admin.nav.${key}`);
                const badge = getBadgeCount(key);
                return (
                  <button
                    key={key}
                    className={`nav-item${activeMenu === key ? ' active' : ''}`}
                    onClick={() => onNavigate(key)}
                    data-tooltip={collapsed ? label : undefined}
                    aria-current={activeMenu === key ? 'page' : undefined}
                  >
                    <span className="nav-icon">
                      <Icon name={icon} size={18} />
                    </span>
                    {!collapsed && <span className="nav-label">{label}</span>}
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
          {!collapsed && <span className="nav-label">{t('admin.dashboard.logout')}</span>}
        </button>
      </div>
    </aside>
  );
};

export default React.memo(AdminSidebar);
