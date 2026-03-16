import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AdminRole } from '../types/admin';
import { SEO } from '../components/common';
import AdminLayout, { useAdmin } from './admin/AdminLayout';
import AdminLogin from './admin/AdminLogin';
import { onSessionExpired, onTokenRefreshed } from '../services/adminApi';
import { AuthProvider } from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';
import { NavigationProvider } from '../contexts/NavigationContext';
import { useSessionTimeout } from '../hooks/useSessionTimeout';
import { AdminErrorBoundaryWithI18n } from '../components/admin/AdminErrorBoundary';
import '../styles/admin/index.css';

const DashboardOverview = React.lazy(() => import('./admin/DashboardOverview'));
const AnalyticsDashboard = React.lazy(() => import('./admin/AnalyticsDashboard'));
const BookingManagement = React.lazy(() => import('./admin/bookings/BookingManagement'));
const CalendarManagement = React.lazy(() => import('./admin/CalendarManagement'));
const ReviewManagement = React.lazy(() => import('./admin/ReviewManagement'));
const CouponManagement = React.lazy(() => import('./admin/CouponManagement'));
const GalleryManagement = React.lazy(() => import('./admin/GalleryManagement'));
const InstagramManagement = React.lazy(() => import('./admin/InstagramManagement'));
const SettingsPage = React.lazy(() => import('./admin/settings/SettingsPage'));
const MenuManagement = React.lazy(() => import('./admin/menu/MenuManagement'));
const CustomerManagement = React.lazy(() => import('./admin/CustomerManagement'));
const ActivityLog = React.lazy(() => import('./admin/ActivityLog'));
const UserManagement = React.lazy(() => import('./admin/UserManagement'));
const ManagerDashboard = React.lazy(() => import('./admin/ManagerDashboard'));
const TeamDashboard = React.lazy(() => import('./admin/TeamDashboard'));
const DispatchCenter = React.lazy(() => import('./admin/DispatchCenter'));

// ---------------------------------------------------------------------------
// Content switcher — must be a child of AdminLayout to access context
// ---------------------------------------------------------------------------

const LazyPage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AdminErrorBoundaryWithI18n>
    <React.Suspense fallback={<div className="loading-screen">Loading...</div>}>
      {children}
    </React.Suspense>
  </AdminErrorBoundaryWithI18n>
);

const AdminContent: React.FC = () => {
  const { activeMenu, role } = useAdmin();

  return (
    <>
      {activeMenu === 'dashboard' && (
        <LazyPage>
          {role === 'order_manager' ? <ManagerDashboard /> : <DashboardOverview />}
        </LazyPage>
      )}
      {activeMenu === 'analytics' && (
        <LazyPage>
          <AnalyticsDashboard />
        </LazyPage>
      )}
      {activeMenu === 'bookings' && (
        <LazyPage>
          <BookingManagement />
        </LazyPage>
      )}
      {activeMenu === 'calendar' && (
        <LazyPage>
          <CalendarManagement />
        </LazyPage>
      )}
      {activeMenu === 'reviews' && (
        <LazyPage>
          <ReviewManagement />
        </LazyPage>
      )}
      {activeMenu === 'coupons' && (
        <LazyPage>
          <CouponManagement />
        </LazyPage>
      )}
      {activeMenu === 'gallery' && (
        <LazyPage>
          <GalleryManagement />
        </LazyPage>
      )}
      {activeMenu === 'menu' && (
        <LazyPage>
          <MenuManagement />
        </LazyPage>
      )}
      {activeMenu === 'instagram' && (
        <LazyPage>
          <InstagramManagement />
        </LazyPage>
      )}
      {activeMenu === 'customers' && (
        <LazyPage>
          <CustomerManagement />
        </LazyPage>
      )}
      {activeMenu === 'activity' && (
        <LazyPage>
          <ActivityLog />
        </LazyPage>
      )}
      {activeMenu === 'settings' && (
        <LazyPage>
          <SettingsPage />
        </LazyPage>
      )}
      {activeMenu === 'users' && (
        <LazyPage>
          <UserManagement />
        </LazyPage>
      )}
      {activeMenu === 'team' && (
        <LazyPage>
          <TeamDashboard />
        </LazyPage>
      )}
      {activeMenu === 'dispatch' && (
        <LazyPage>
          <DispatchCenter />
        </LazyPage>
      )}
    </>
  );
};

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState('');
  const [role, setRole] = useState<AdminRole>('super_admin');
  const [userId, setUserId] = useState('__env__');
  const [displayName, setDisplayName] = useState('Admin');

  // Check for existing session
  React.useEffect(() => {
    const savedToken = sessionStorage.getItem('admin_token');
    const savedRole = sessionStorage.getItem('admin_role') as AdminRole | null;
    const savedUserId = sessionStorage.getItem('admin_userId');
    const savedDisplayName = sessionStorage.getItem('admin_displayName');
    if (savedToken) {
      setToken(savedToken);
      setRole(savedRole || 'super_admin');
      setUserId(savedUserId || '__env__');
      setDisplayName(savedDisplayName || 'Admin');
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (result: {
    token: string;
    role: AdminRole;
    userId: string;
    displayName: string;
  }) => {
    sessionStorage.setItem('admin_token', result.token);
    sessionStorage.setItem('admin_role', result.role);
    sessionStorage.setItem('admin_userId', result.userId);
    sessionStorage.setItem('admin_displayName', result.displayName);
    setToken(result.token);
    setRole(result.role);
    setUserId(result.userId);
    setDisplayName(result.displayName);
    setIsAuthenticated(true);
  };

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_role');
    sessionStorage.removeItem('admin_userId');
    sessionStorage.removeItem('admin_displayName');
    setIsAuthenticated(false);
  }, []);

  // Auto-logout after 30 minutes of inactivity
  useSessionTimeout(handleLogout);

  // Wire up auto-refresh and session expiry handlers
  useEffect(() => {
    onSessionExpired(() => {
      handleLogout();
    });
    onTokenRefreshed((newToken: string) => {
      sessionStorage.setItem('admin_token', newToken);
      setToken(newToken);
    });
  }, [handleLogout]);

  if (!isAuthenticated) {
    return (
      <>
        <SEO title={t('admin.login.title')} noIndex />
        <AdminLogin onLogin={handleLogin} />
      </>
    );
  }

  return (
    <>
      <SEO title={t('admin.dashboard.title')} noIndex />
      <AuthProvider token={token} role={role} userId={userId} displayName={displayName}>
        <ToastProvider>
          <NavigationProvider>
            <AdminLayout onLogout={handleLogout}>
              <AdminContent />
            </AdminLayout>
          </NavigationProvider>
        </ToastProvider>
      </AuthProvider>
    </>
  );
};

export default AdminDashboard;
