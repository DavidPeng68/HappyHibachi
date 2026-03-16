import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  AdminMenuType,
  AdminRole,
  Booking,
  BlockedDate,
  Review,
  Coupon,
} from '../../types/admin';
import type { AppSettings } from '../../types';
import * as adminApi from '../../services/adminApi';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useAdminNavigation } from '../../contexts/NavigationContext';
import Icon from '../../components/ui/Icon/Icon';
import type { IconName } from '../../components/ui/Icon/Icon';
import CommandPalette from '../../components/admin/CommandPalette';
import NotificationBell from '../../components/admin/NotificationBell';
import Breadcrumb from '../../components/admin/Breadcrumb';
import type { BreadcrumbItem } from '../../components/admin/Breadcrumb';
import { useNotifications } from '../../hooks/useNotifications';
import '../../styles/admin/index.css';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export interface AdminContextValue {
  activeMenu: AdminMenuType;
  setActiveMenu: (menu: AdminMenuType, payload?: Record<string, string>) => void;
  token: string;
  role: AdminRole;
  userId: string;
  displayName: string;
  isSuperAdmin: boolean;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  blockedDates: BlockedDate[];
  setBlockedDates: React.Dispatch<React.SetStateAction<BlockedDate[]>>;
  reviews: Review[];
  setReviews: React.Dispatch<React.SetStateAction<Review[]>>;
  coupons: Coupon[];
  setCoupons: React.Dispatch<React.SetStateAction<Coupon[]>>;
  refreshAll: () => void;
  loading: boolean;
}

export const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) {
    throw new Error('useAdmin must be used within AdminLayout');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AdminLayoutProps {
  onLogout: () => void;
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MOBILE_NAV_ITEMS: AdminMenuType[] = ['dashboard', 'bookings', 'calendar', 'menu'];

const MENU_ICONS: Record<AdminMenuType, IconName> = {
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

const ALL_MENUS: AdminMenuType[] = [
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

const MENU_GROUPS: { labelKey: string; items: AdminMenuType[] }[] = [
  { labelKey: 'admin.sidebar.overview', items: ['dashboard', 'analytics'] },
  { labelKey: 'admin.sidebar.operations', items: ['bookings', 'calendar', 'customers'] },
  {
    labelKey: 'admin.sidebar.content',
    items: ['reviews', 'coupons', 'gallery', 'menu', 'instagram'],
  },
  { labelKey: 'admin.sidebar.admin', items: ['activity', 'settings', 'users', 'team', 'dispatch'] },
];

const ORDER_MANAGER_MENUS: AdminMenuType[] = ['dashboard', 'bookings', 'calendar'];

const DEFAULT_SETTINGS: AppSettings = {
  timeSlots: [],
  minGuests: 10,
  maxGuests: 50,
  pricePerPerson: 55,
  minimumOrder: 550,
  socialLinks: {} as AppSettings['socialLinks'],
  promoBanner: {} as AppSettings['promoBanner'],
  contactInfo: {} as AppSettings['contactInfo'],
  galleryImages: [],
  featureToggles: {
    photoShare: false,
    referralProgram: false,
    newsletter: false,
    specialOffer: false,
    instagramFeed: false,
    coupons: false,
  },
  brandInfo: {} as AppSettings['brandInfo'],
  seoDefaults: {} as AppSettings['seoDefaults'],
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AdminLayout: React.FC<AdminLayoutProps> = ({ onLogout, children }) => {
  const { token, role, userId, displayName, isSuperAdmin } = useAuth();
  const { activeMenu, setActiveMenu } = useAdminNavigation();
  const { showToast, toasts, dismissToast } = useToast();
  const { t } = useTranslation();

  // Notifications
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(token);

  // Local UI state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [cmdkOpen, setCmdkOpen] = useState(false);

  // Data
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // -------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const [bookingsRes, calendarRes, reviewsRes, couponsRes, settingsRes] = await Promise.all([
        adminApi.fetchBookings(token),
        adminApi.fetchCalendar(),
        adminApi.fetchReviews(token),
        adminApi.fetchCoupons(token),
        adminApi.fetchSettings(),
      ]);

      if (bookingsRes.success) setBookings(bookingsRes.bookings);
      if (calendarRes.success) setBlockedDates(calendarRes.blockedDates);
      if (reviewsRes.success) setReviews(reviewsRes.reviews);
      if (couponsRes.success) setCoupons(couponsRes.coupons);
      if (settingsRes.success && settingsRes.settings) setSettings(settingsRes.settings);
    } catch {
      showToast(t('admin.toast.fetchFailed'), 'error');
    } finally {
      setLoading(false);
    }
  }, [token, showToast, t]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Fetch pending users count
  useEffect(() => {
    if (!token || !isSuperAdmin) return;
    adminApi
      .fetchUsers(token, 'pending')
      .then((res) => {
        if (res.success) setPendingUsersCount(res.users.length);
      })
      .catch(() => {});
  }, [token, isSuperAdmin]);

  // Cmd+K / Ctrl+K command palette shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdkOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // -------------------------------------------------------------------
  // Menu items
  // -------------------------------------------------------------------

  const visibleMenus = useMemo(
    () => (isSuperAdmin ? ALL_MENUS : ORDER_MANAGER_MENUS),
    [isSuperAdmin]
  );

  const menuItems = useMemo(
    () =>
      visibleMenus.map((key) => ({
        key,
        icon: MENU_ICONS[key],
        label: t(`admin.nav.${key}`),
      })),
    [visibleMenus, t]
  );

  const visibleMobileNavItems = useMemo(
    () => MOBILE_NAV_ITEMS.filter((key) => visibleMenus.includes(key)),
    [visibleMenus]
  );

  const moreMenuItems = useMemo(
    () => menuItems.filter((item) => !MOBILE_NAV_ITEMS.includes(item.key)),
    [menuItems]
  );

  // -------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------

  const getBadgeCount = useCallback(
    (menuKey: AdminMenuType): number => {
      if (menuKey === 'bookings') {
        return bookings.filter((b) => b.status === 'pending').length;
      }
      if (menuKey === 'users') {
        return pendingUsersCount;
      }
      return 0;
    },
    [bookings, pendingUsersCount]
  );

  const handleMobileNavClick = useCallback(
    (key: AdminMenuType) => {
      setActiveMenu(key);
      setMoreSheetOpen(false);
    },
    [setActiveMenu]
  );

  const handleMoreToggle = useCallback(() => {
    setMoreSheetOpen((prev) => !prev);
  }, []);

  // Page title
  const pageTitle = useMemo(() => {
    const item = menuItems.find((m) => m.key === activeMenu);
    return item ? item.label : t('admin.dashboard.title');
  }, [activeMenu, menuItems, t]);

  // Breadcrumb
  const breadcrumbItems = useMemo((): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [
      { label: t('admin.nav.dashboard'), onClick: () => setActiveMenu('dashboard') },
    ];
    if (activeMenu !== 'dashboard') {
      items.push({ label: t(`admin.nav.${activeMenu}`) });
    }
    return items;
  }, [activeMenu, t, setActiveMenu]);

  // -------------------------------------------------------------------
  // Context value (facade — combines all sub-contexts + data)
  // -------------------------------------------------------------------

  const contextValue = useMemo<AdminContextValue>(
    () => ({
      activeMenu,
      setActiveMenu,
      token,
      role,
      userId,
      displayName,
      isSuperAdmin,
      showToast,
      bookings,
      setBookings,
      settings,
      setSettings,
      blockedDates,
      setBlockedDates,
      reviews,
      setReviews,
      coupons,
      setCoupons,
      refreshAll,
      loading,
    }),
    [
      activeMenu,
      setActiveMenu,
      token,
      role,
      userId,
      displayName,
      isSuperAdmin,
      showToast,
      bookings,
      settings,
      blockedDates,
      reviews,
      coupons,
      refreshAll,
      loading,
    ]
  );

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------

  return (
    <AdminContext.Provider value={contextValue}>
      <div className="admin-layout">
        {/* Sidebar (desktop) */}
        <aside className={`sidebar${sidebarCollapsed ? ' collapsed' : ''}`}>
          <div className="sidebar-header">
            <span className="sidebar-logo" role="img" aria-label="logo">
              <Icon name="fire" size={24} />
            </span>
            {!sidebarCollapsed && (
              <span className="sidebar-title">{t('admin.dashboard.title')}</span>
            )}
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarCollapsed((c) => !c)}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? '\u2192' : '\u2190'}
            </button>
          </div>

          <nav className="sidebar-nav">
            {MENU_GROUPS.map((group) => {
              const groupItems = group.items.filter((key) => visibleMenus.includes(key));
              if (groupItems.length === 0) return null;
              return (
                <div key={group.labelKey} className="sidebar-group">
                  {!sidebarCollapsed && (
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
                        onClick={() => setActiveMenu(key)}
                      >
                        <span className="nav-icon">
                          <Icon name={icon} size={18} />
                        </span>
                        {!sidebarCollapsed && <span className="nav-label">{label}</span>}
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
              {!sidebarCollapsed && (
                <span className="nav-label">{t('admin.dashboard.logout')}</span>
              )}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div className="main-content">
          {/* Topbar */}
          <header className="topbar">
            <div className="topbar-left">
              <h1 className="page-title">{pageTitle}</h1>
            </div>
            <div className="topbar-right">
              <button
                className="btn-icon"
                onClick={refreshAll}
                aria-label={t('admin.dashboard.refresh')}
                title={t('admin.dashboard.refresh')}
              >
                🔄
              </button>
              <NotificationBell
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkRead={markRead}
                onMarkAllRead={markAllRead}
              />
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
            </div>
          </header>

          {/* Content */}
          <main className="content-area">
            <Breadcrumb items={breadcrumbItems} />
            {children}
          </main>
        </div>

        {/* Mobile bottom navigation */}
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {visibleMobileNavItems.map((key) => (
            <button
              key={key}
              className={`mobile-nav-item${activeMenu === key ? ' active' : ''}`}
              onClick={() => handleMobileNavClick(key)}
            >
              <span className="mobile-nav-icon">
                <Icon name={MENU_ICONS[key]} size={20} />
              </span>
              <span className="mobile-nav-label">{t(`admin.nav.${key}`)}</span>
            </button>
          ))}
          <button
            className={`mobile-nav-item${moreSheetOpen ? ' active' : ''}`}
            onClick={handleMoreToggle}
            aria-label={t('admin.nav.more')}
          >
            <span className="mobile-nav-icon">{'\u22EF'}</span>
            <span className="mobile-nav-label">{t('admin.nav.more')}</span>
          </button>
        </nav>

        {/* More sheet (mobile) */}
        {moreSheetOpen && (
          <>
            <div
              className="more-sheet-overlay"
              onClick={() => setMoreSheetOpen(false)}
              role="presentation"
            />
            <div className="more-sheet" role="dialog" aria-label={t('admin.nav.more')}>
              <div className="more-sheet-handle" />
              {moreMenuItems.map((item) => (
                <button
                  key={item.key}
                  className={`nav-item${activeMenu === item.key ? ' active' : ''}`}
                  onClick={() => handleMobileNavClick(item.key)}
                >
                  <span className="nav-icon">
                    <Icon name={item.icon} size={18} />
                  </span>
                  <span className="nav-label">{item.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Command Palette */}
        <CommandPalette
          open={cmdkOpen}
          onClose={() => setCmdkOpen(false)}
          onNavigate={(menu) => {
            setActiveMenu(menu);
            setCmdkOpen(false);
          }}
          onRefresh={() => {
            refreshAll();
            setCmdkOpen(false);
          }}
          bookings={bookings}
          visibleMenus={visibleMenus}
        />

        {/* Toasts */}
        <div className="toast-container" aria-live="polite">
          {toasts.map((toast, index) => (
            <div
              key={toast.id}
              className={`toast toast-${toast.type}`}
              style={{ top: `${24 + index * 60}px` }}
            >
              {toast.message}
              <button
                className="toast-close"
                onClick={() => dismissToast(toast.id)}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      </div>
    </AdminContext.Provider>
  );
};

export default AdminLayout;
