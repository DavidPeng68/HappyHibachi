import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import type {
  AdminMenuType,
  AdminRole,
  Booking,
  BlockedDate,
  Review,
  Coupon,
  ToastMessage,
} from '../../types/admin';
import type { AppSettings } from '../../types';
import * as adminApi from '../../services/adminApi';
import '../AdminDashboard.css';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export interface AdminContextValue {
  activeMenu: AdminMenuType;
  setActiveMenu: (menu: AdminMenuType) => void;
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
  token: string;
  role: AdminRole;
  userId: string;
  displayName: string;
  onLogout: () => void;
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MOBILE_NAV_ITEMS: AdminMenuType[] = ['dashboard', 'bookings', 'calendar', 'menu'];

const MENU_ICONS: Record<AdminMenuType, string> = {
  dashboard: '\u{1F4CA}',
  analytics: '\u{1F4C8}',
  bookings: '\u{1F4CB}',
  calendar: '\u{1F4C5}',
  reviews: '\u2B50',
  coupons: '\u{1F39F}\uFE0F',
  gallery: '\u{1F5BC}\uFE0F',
  menu: '\u{1F37D}\uFE0F',
  instagram: '\u{1F4F8}',
  customers: '\u{1F465}',
  activity: '\u{1F4DD}',
  settings: '\u2699\uFE0F',
  users: '\u{1F464}',
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
];

const ORDER_MANAGER_MENUS: AdminMenuType[] = ['dashboard', 'bookings', 'calendar'];

const MAX_TOASTS = 3;
const TOAST_DURATION_MS = 3000;

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

const AdminLayout: React.FC<AdminLayoutProps> = ({
  token,
  role,
  userId,
  displayName,
  onLogout,
  children,
}) => {
  const isSuperAdmin = role === 'super_admin';
  const { t } = useTranslation();

  // Navigation
  const [activeMenu, setActiveMenu] = useState<AdminMenuType>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  // Data
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastIdRef = useRef(0);

  // -------------------------------------------------------------------
  // Toast
  // -------------------------------------------------------------------

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    const id = String(++toastIdRef.current);
    setToasts((prev) => {
      const next = [...prev, { id, message, type }];
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
    });
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  // -------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------

  const refreshAll = useCallback(async () => {
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
    }
  }, [token, showToast, t]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

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

  const handleMobileNavClick = useCallback((key: AdminMenuType) => {
    setActiveMenu(key);
    setMoreSheetOpen(false);
  }, []);

  const handleMoreToggle = useCallback(() => {
    setMoreSheetOpen((prev) => !prev);
  }, []);

  // Page title
  const pageTitle = useMemo(() => {
    const item = menuItems.find((m) => m.key === activeMenu);
    return item ? item.label : t('admin.dashboard.title');
  }, [activeMenu, menuItems, t]);

  // -------------------------------------------------------------------
  // Context value
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
    }),
    [
      activeMenu,
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
              🔥
            </span>
            {!sidebarCollapsed && (
              <span className="sidebar-title">{t('admin.dashboard.title')}</span>
            )}
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarCollapsed((c) => !c)}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? '→' : '←'}
            </button>
          </div>

          <nav className="sidebar-nav">
            {menuItems.map((item) => (
              <button
                key={item.key}
                className={`nav-item${activeMenu === item.key ? ' active' : ''}`}
                onClick={() => setActiveMenu(item.key)}
              >
                <span className="nav-icon">{item.icon}</span>
                {!sidebarCollapsed && <span className="nav-label">{item.label}</span>}
              </button>
            ))}
          </nav>

          <div className="sidebar-footer">
            <button className="nav-item logout" onClick={onLogout}>
              <span className="nav-icon">🚪</span>
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
              <div className="user-info">
                <span className="user-avatar">{'\uD83D\uDC64'}</span>
                <span className="user-name">{displayName}</span>
              </div>
              <button
                className="btn-icon"
                onClick={onLogout}
                aria-label={t('admin.dashboard.logout')}
              >
                🚪
              </button>
            </div>
          </header>

          {/* Content */}
          <main className="content-area">{children}</main>
        </div>

        {/* Mobile bottom navigation */}
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {visibleMobileNavItems.map((key) => (
            <button
              key={key}
              className={`mobile-nav-item${activeMenu === key ? ' active' : ''}`}
              onClick={() => handleMobileNavClick(key)}
            >
              <span className="mobile-nav-icon">{MENU_ICONS[key]}</span>
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
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Toasts */}
        <div className="toast-container" aria-live="polite">
          {toasts.map((toast, index) => (
            <div
              key={toast.id}
              className={`toast toast-${toast.type}`}
              style={{ top: `${24 + index * 60}px` }}
            >
              {toast.message}
            </div>
          ))}
        </div>
      </div>
    </AdminContext.Provider>
  );
};

export default AdminLayout;
