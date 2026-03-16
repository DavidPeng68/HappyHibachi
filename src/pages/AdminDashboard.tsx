import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import type { AdminRole } from '../types/admin';
import { getDefaultRoute } from '../types/admin';
import { SEO } from '../components/common';
import AdminLayout from './admin/AdminLayout';
import AdminLogin from './admin/AdminLogin';
import { onSessionExpired, onTokenRefreshed } from '../services/adminApi';
import { AuthProvider } from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';
import { NavigationProvider } from '../contexts/NavigationContext';
import { useSessionTimeout } from '../hooks/useSessionTimeout';
import { AdminErrorBoundaryWithI18n } from '../components/admin/AdminErrorBoundary';
import '../styles/admin/index.css';

const LazyPage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AdminErrorBoundaryWithI18n>
    <React.Suspense
      fallback={
        <div className="admin-page-loader">
          <div className="admin-page-loader-spinner" />
        </div>
      }
    >
      {children}
    </React.Suspense>
  </AdminErrorBoundaryWithI18n>
);

/**
 * Admin login wrapper — shown at /admin/login
 */
export const AdminLoginPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

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

    const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
    navigate(from || getDefaultRoute(result.role), { replace: true });
  };

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    const token = sessionStorage.getItem('admin_token');
    if (token) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [navigate]);

  return (
    <>
      <SEO title={t('admin.login.title')} noIndex />
      <AdminLogin onLogin={handleLogin} />
    </>
  );
};

/**
 * Admin layout wrapper — shown at /admin/* (authenticated)
 */
const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [token, setToken] = useState(() => sessionStorage.getItem('admin_token') || '');
  const role = (sessionStorage.getItem('admin_role') as AdminRole) || 'super_admin';
  const userId = sessionStorage.getItem('admin_userId') || '__env__';
  const displayName = sessionStorage.getItem('admin_displayName') || t('admin.roles.admin');

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_role');
    sessionStorage.removeItem('admin_userId');
    sessionStorage.removeItem('admin_displayName');
    navigate('/admin/login', { replace: true });
  }, [navigate]);

  useSessionTimeout(handleLogout);

  useEffect(() => {
    onSessionExpired(() => handleLogout());
    onTokenRefreshed((newToken: string) => {
      sessionStorage.setItem('admin_token', newToken);
      setToken(newToken);
    });
  }, [handleLogout]);

  if (!token) {
    navigate('/admin/login', { replace: true });
    return null;
  }

  return (
    <>
      <SEO title={t('admin.dashboard.title')} noIndex />
      <AuthProvider token={token} role={role} userId={userId} displayName={displayName}>
        <ToastProvider>
          <NavigationProvider>
            <AdminLayout onLogout={handleLogout}>
              <LazyPage>
                <Outlet />
              </LazyPage>
            </AdminLayout>
          </NavigationProvider>
        </ToastProvider>
      </AuthProvider>
    </>
  );
};

export default AdminDashboard;
