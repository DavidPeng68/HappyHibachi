import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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

  // Check for existing session
  React.useEffect(() => {
    const savedToken = sessionStorage.getItem('admin_token');
    if (savedToken) {
      setToken(savedToken);
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (newToken: string) => {
    sessionStorage.setItem('admin_token', newToken);
    setToken(newToken);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_token');
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
      <AdminLayout token={token} onLogout={handleLogout}>
        <AdminContent />
      </AdminLayout>
    </>
  );
};

export default AdminDashboard;
