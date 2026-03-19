import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Navigation, Footer, TopBar } from './components';
import { ProtectedRoute, ErrorBoundary } from './components/common';
import { HomePage, NotFound } from './pages';

import { SettingsProvider } from './hooks';
import { OrderProvider } from './contexts/OrderContext';
import './App.css';

const CityLandingPage = React.lazy(() => import('./pages/CityLandingPage'));
const MenuPage = React.lazy(() => import('./pages/MenuPage'));
const GalleryPage = React.lazy(() => import('./pages/GalleryPage'));
const FAQPage = React.lazy(() => import('./pages/FAQPage'));
const ContactPage = React.lazy(() => import('./pages/ContactPage'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const AdminLoginPage = React.lazy(() =>
  import('./pages/AdminDashboard').then((m) => ({ default: m.AdminLoginPage }))
);
const FreeEstimate = React.lazy(() => import('./pages/FreeEstimate'));
const OrderPage = React.lazy(() => import('./pages/OrderPage'));
const MyBooking = React.lazy(() => import('./pages/MyBooking'));
const Privacy = React.lazy(() => import('./pages/Privacy'));
const Terms = React.lazy(() => import('./pages/Terms'));

const DashboardOverview = React.lazy(() => import('./pages/admin/DashboardOverview'));
const ManagerDashboard = React.lazy(() => import('./pages/admin/ManagerDashboard'));
const AnalyticsDashboard = React.lazy(() => import('./pages/admin/AnalyticsDashboard'));
const BookingManagement = React.lazy(() => import('./pages/admin/bookings/BookingManagement'));
const CalendarManagement = React.lazy(() => import('./pages/admin/CalendarManagement'));
const ReviewManagement = React.lazy(() => import('./pages/admin/ReviewManagement'));
const CouponManagement = React.lazy(() => import('./pages/admin/CouponManagement'));
const GalleryManagement = React.lazy(() => import('./pages/admin/GalleryManagement'));
const InstagramManagement = React.lazy(() => import('./pages/admin/InstagramManagement'));
const SettingsPage = React.lazy(() => import('./pages/admin/settings/SettingsPage'));
const MenuManagement = React.lazy(() => import('./pages/admin/menu/MenuManagement'));
const CustomerManagement = React.lazy(() => import('./pages/admin/CustomerManagement'));
const ActivityLog = React.lazy(() => import('./pages/admin/ActivityLog'));
const UserManagement = React.lazy(() => import('./pages/admin/UserManagement'));
const TeamDashboard = React.lazy(() => import('./pages/admin/TeamDashboard'));
const DispatchCenter = React.lazy(() => import('./pages/admin/DispatchCenter'));

const LanguageUpdater: React.FC = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return null;
};

/**
 * Choose default dashboard component based on role stored in session.
 */
const DashboardIndex: React.FC = () => {
  const role = sessionStorage.getItem('admin_role');
  return role === 'order_manager' ? <ManagerDashboard /> : <DashboardOverview />;
};

/**
 * Redirect legacy /admin hash URLs and bare /admin to /admin/dashboard.
 */
const AdminHashRedirect: React.FC = () => {
  const hash = window.location.hash.replace('#', '');
  const routeMap: Record<string, string> = {
    dashboard: '/admin/dashboard',
    analytics: '/admin/analytics',
    bookings: '/admin/bookings',
    calendar: '/admin/calendar',
    reviews: '/admin/reviews',
    coupons: '/admin/coupons',
    gallery: '/admin/gallery',
    menu: '/admin/menu',
    instagram: '/admin/instagram',
    customers: '/admin/customers',
    activity: '/admin/activity',
    settings: '/admin/settings',
    users: '/admin/users',
    team: '/admin/team',
    dispatch: '/admin/dispatch',
  };
  const target = (hash && routeMap[hash]) || '/admin/dashboard';
  return <Navigate to={target} replace />;
};

const AdminLoadingScreen: React.FC = () => (
  <div className="admin-page-loader">
    <div className="admin-page-loader-spinner" />
  </div>
);

const AppRoutes: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  if (isAdmin) {
    return (
      <Suspense fallback={<AdminLoadingScreen />}>
        <Routes>
          {/* Login (public) */}
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* Protected admin routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminHashRedirect />} />
            <Route path="dashboard" element={<DashboardIndex />} />
            <Route path="analytics" element={<AnalyticsDashboard />} />
            <Route path="bookings" element={<BookingManagement />} />
            <Route path="calendar" element={<CalendarManagement />} />
            <Route path="reviews" element={<ReviewManagement />} />
            <Route path="coupons" element={<CouponManagement />} />
            <Route path="gallery" element={<GalleryManagement />} />
            <Route path="menu" element={<MenuManagement />} />
            <Route path="instagram" element={<InstagramManagement />} />
            <Route path="customers" element={<CustomerManagement />} />
            <Route path="activity" element={<ActivityLog />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="team" element={<TeamDashboard />} />
            <Route path="dispatch" element={<DispatchCenter />} />
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Route>
        </Routes>
      </Suspense>
    );
  }

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">
        {t('common.skipToContent')}
      </a>
      <TopBar />
      <Navigation />
      <main id="main-content" className="main-content">
        <Suspense
          fallback={
            <div className="loading-screen">
              <div className="admin-page-loader-spinner" />
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/order" element={<OrderPage />} />
            <Route path="/free-estimate" element={<FreeEstimate />} />
            <Route path="/book-now" element={<Navigate to="/order" replace />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/hibachi-catering/:stateSlug/:citySlug" element={<CityLandingPage />} />
            <Route path="/hibachi-catering/:stateSlug" element={<CityLandingPage />} />
            <Route path="/my-booking" element={<MyBooking />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <OrderProvider>
          <ErrorBoundary>
            <LanguageUpdater />
            <AppRoutes />
          </ErrorBoundary>
        </OrderProvider>
      </SettingsProvider>
    </BrowserRouter>
  );
};

export default App;
