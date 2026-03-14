import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AdminRole } from '../types/admin';
import { SEO } from '../components/common';
import AdminLayout, { useAdmin } from './admin/AdminLayout';
import AdminLogin from './admin/AdminLogin';
import DashboardOverview from './admin/DashboardOverview';
import AnalyticsDashboard from './admin/AnalyticsDashboard';
import BookingManagement from './admin/BookingManagement';
import CalendarManagement from './admin/CalendarManagement';
import ReviewManagement from './admin/ReviewManagement';
import CouponManagement from './admin/CouponManagement';
import GalleryManagement from './admin/GalleryManagement';
import InstagramManagement from './admin/InstagramManagement';
import SettingsPage from './admin/SettingsPage';
import './AdminDashboard.css';

const MenuManagement = React.lazy(() => import('./admin/MenuManagement'));
const CustomerManagement = React.lazy(() => import('./admin/CustomerManagement'));
const ActivityLog = React.lazy(() => import('./admin/ActivityLog'));
const UserManagement = React.lazy(() => import('./admin/UserManagement'));

// ---------------------------------------------------------------------------
// Content switcher — must be a child of AdminLayout to access context
// ---------------------------------------------------------------------------

const AdminContent: React.FC = () => {
  const { activeMenu } = useAdmin();

  return (
    <>
      {activeMenu === 'dashboard' && <DashboardOverview />}
      {activeMenu === 'analytics' && <AnalyticsDashboard />}
      {activeMenu === 'bookings' && <BookingManagement />}
      {activeMenu === 'calendar' && <CalendarManagement />}
      {activeMenu === 'reviews' && <ReviewManagement />}
      {activeMenu === 'coupons' && <CouponManagement />}
      {activeMenu === 'gallery' && <GalleryManagement />}
      {activeMenu === 'menu' && (
        <React.Suspense fallback={<div className="loading-screen">Loading...</div>}>
          <MenuManagement />
        </React.Suspense>
      )}
      {activeMenu === 'instagram' && <InstagramManagement />}
      {activeMenu === 'customers' && (
        <React.Suspense fallback={<div className="loading-screen">Loading...</div>}>
          <CustomerManagement />
        </React.Suspense>
      )}
      {activeMenu === 'activity' && (
        <React.Suspense fallback={<div className="loading-screen">Loading...</div>}>
          <ActivityLog />
        </React.Suspense>
      )}
      {activeMenu === 'settings' && <SettingsPage />}
      {activeMenu === 'users' && (
        <React.Suspense fallback={<div className="loading-screen">Loading...</div>}>
          <UserManagement />
        </React.Suspense>
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

  const handleLogout = () => {
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_role');
    sessionStorage.removeItem('admin_userId');
    sessionStorage.removeItem('admin_displayName');
    setIsAuthenticated(false);
  };

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
      <AdminLayout
        token={token}
        role={role}
        userId={userId}
        displayName={displayName}
        onLogout={handleLogout}
      >
        <AdminContent />
      </AdminLayout>
    </>
  );
};

export default AdminDashboard;
