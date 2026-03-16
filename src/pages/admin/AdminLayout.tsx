import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AdminMenuType } from '../../types/admin';
import * as adminApi from '../../services/adminApi';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useAdminNavigation } from '../../contexts/NavigationContext';
import { AdminDataProvider, useAdminData } from '../../contexts/AdminDataContext';
import type { AdminDataContextValue } from '../../contexts/AdminDataContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import AdminSidebar, {
  ALL_MENUS,
  MENU_ICONS,
  ORDER_MANAGER_MENUS,
} from '../../components/admin/AdminSidebar';
import AdminTopbar from '../../components/admin/AdminTopbar';
import AdminMobileNav from '../../components/admin/AdminMobileNav';
import CommandPalette from '../../components/admin/CommandPalette';
import Breadcrumb from '../../components/admin/Breadcrumb';
import type { BreadcrumbItem } from '../../components/admin/Breadcrumb';
import { useNotifications } from '../../hooks/useNotifications';
import '../../styles/admin/index.css';

// ---------------------------------------------------------------------------
// Backward-compatible facade context
// ---------------------------------------------------------------------------

export interface AdminContextValue extends AdminDataContextValue {
  activeMenu: AdminMenuType;
  setActiveMenu: (menu: AdminMenuType, payload?: Record<string, string>) => void;
  token: string;
  role: string;
  userId: string;
  displayName: string;
  isSuperAdmin: boolean;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const AdminContext = React.createContext<AdminContextValue | null>(null);

export function useAdmin(): AdminContextValue {
  const ctx = React.useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminLayout');
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
// Inner layout (has access to AdminDataContext)
// ---------------------------------------------------------------------------

const AdminLayoutInner: React.FC<AdminLayoutProps> = ({ onLogout, children }) => {
  const auth = useAuth();
  const { activeMenu, setActiveMenu } = useAdminNavigation();
  const { showToast, toasts, dismissToast } = useToast();
  const data = useAdminData();
  const { t } = useTranslation();

  const { token, displayName, isSuperAdmin } = auth;

  // Notifications
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(token);

  // Local UI state
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage('admin:sidebar-collapsed', false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);

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
  // Derived values
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

  const getBadgeCount = useCallback(
    (menuKey: AdminMenuType): number => {
      if (menuKey === 'bookings') {
        return data.bookings.filter((b) => b.status === 'pending').length;
      }
      if (menuKey === 'users') return pendingUsersCount;
      return 0;
    },
    [data.bookings, pendingUsersCount]
  );

  const pageTitle = useMemo(() => {
    const item = menuItems.find((m) => m.key === activeMenu);
    return item ? item.label : t('admin.dashboard.title');
  }, [activeMenu, menuItems, t]);

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
  // Facade context value (backward compatible with useAdmin())
  // -------------------------------------------------------------------

  const contextValue = useMemo<AdminContextValue>(
    () => ({
      // Auth
      ...auth,
      // Navigation
      activeMenu,
      setActiveMenu,
      // Toast
      showToast,
      // Data (spread all from AdminDataContext)
      ...data,
    }),
    [auth, activeMenu, setActiveMenu, showToast, data]
  );

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------

  return (
    <AdminContext.Provider value={contextValue}>
      <div className="admin-layout">
        <AdminSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
          activeMenu={activeMenu}
          visibleMenus={visibleMenus}
          onNavigate={setActiveMenu}
          onLogout={onLogout}
          getBadgeCount={getBadgeCount}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />

        <div className="main-content">
          <AdminTopbar
            pageTitle={pageTitle}
            displayName={displayName}
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkRead={markRead}
            onMarkAllRead={markAllRead}
            onRefresh={data.refreshAll}
            onLogout={onLogout}
            onMobileMenuToggle={() => setMobileSidebarOpen(true)}
          />

          <main className="content-area">
            <Breadcrumb items={breadcrumbItems} />
            {children}
          </main>
        </div>

        <AdminMobileNav
          activeMenu={activeMenu}
          visibleMenus={visibleMenus}
          menuItems={menuItems}
          onNavigate={setActiveMenu}
        />

        <CommandPalette
          open={cmdkOpen}
          onClose={() => setCmdkOpen(false)}
          onNavigate={(menu) => {
            setActiveMenu(menu);
            setCmdkOpen(false);
          }}
          onRefresh={() => {
            data.refreshAll();
            setCmdkOpen(false);
          }}
          bookings={data.bookings}
          visibleMenus={visibleMenus}
        />

        <div className="toast-container" aria-live="polite">
          {toasts.map((toast, index) => (
            <div
              key={toast.id}
              className={`toast toast-${toast.type}`}
              style={{ top: `${24 + index * 60}px` }}
              role={toast.type === 'error' ? 'alert' : 'status'}
            >
              {toast.message}
              <button
                className="toast-close"
                onClick={() => dismissToast(toast.id)}
                aria-label={t('common.close')}
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

// ---------------------------------------------------------------------------
// Outer wrapper — provides AdminDataContext
// ---------------------------------------------------------------------------

const AdminLayout: React.FC<AdminLayoutProps> = (props) => (
  <AdminDataProvider>
    <AdminLayoutInner {...props} />
  </AdminDataProvider>
);

export default AdminLayout;
