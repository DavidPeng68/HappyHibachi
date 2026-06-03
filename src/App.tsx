import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Navigation, Footer, TopBar } from './components';
import { ProtectedRoute, ErrorBoundary } from './components/common';
import { HomePage, NotFound } from './pages';

import { SettingsProvider } from './hooks';
import { OrderProvider } from './contexts/OrderContext';
import lazyWithRetry from './utils/lazyWithRetry';
import './App.css';

const CityLandingPage = lazyWithRetry(() => import('./pages/CityLandingPage'));
const MenuPage = lazyWithRetry(() => import('./pages/MenuPage'));
const GalleryPage = lazyWithRetry(() => import('./pages/GalleryPage'));
const FAQPage = lazyWithRetry(() => import('./pages/FAQPage'));
const ContactPage = lazyWithRetry(() => import('./pages/ContactPage'));
const AdminDashboard = lazyWithRetry(() => import('./pages/AdminDashboard'));
const AdminLoginPage = lazyWithRetry(() =>
  import('./pages/AdminDashboard').then((m) => ({ default: m.AdminLoginPage }))
);
const FreeEstimate = lazyWithRetry(() => import('./pages/FreeEstimate'));
const OrderPage = lazyWithRetry(() => import('./pages/OrderPage'));
const MyBooking = lazyWithRetry(() => import('./pages/MyBooking'));
const Privacy = lazyWithRetry(() => import('./pages/Privacy'));
const Terms = lazyWithRetry(() => import('./pages/Terms'));
const FloatingContact = lazyWithRetry(() => import('./components/FloatingContact'));

const DashboardOverview = lazyWithRetry(() => import('./pages/admin/DashboardOverview'));
const ManagerDashboard = lazyWithRetry(() => import('./pages/admin/ManagerDashboard'));
const AnalyticsDashboard = lazyWithRetry(() => import('./pages/admin/AnalyticsDashboard'));
const BookingManagement = lazyWithRetry(() => import('./pages/admin/bookings/BookingManagement'));
const CalendarManagement = lazyWithRetry(() => import('./pages/admin/CalendarManagement'));
const ReviewManagement = lazyWithRetry(() => import('./pages/admin/ReviewManagement'));
const CouponManagement = lazyWithRetry(() => import('./pages/admin/CouponManagement'));
const GalleryManagement = lazyWithRetry(() => import('./pages/admin/GalleryManagement'));
const InstagramManagement = lazyWithRetry(() => import('./pages/admin/InstagramManagement'));
const SettingsPage = lazyWithRetry(() => import('./pages/admin/settings/SettingsPage'));
const MenuManagement = lazyWithRetry(() => import('./pages/admin/menu/MenuManagement'));
const CustomerManagement = lazyWithRetry(() => import('./pages/admin/CustomerManagement'));
const ActivityLog = lazyWithRetry(() => import('./pages/admin/ActivityLog'));
const UserManagement = lazyWithRetry(() => import('./pages/admin/UserManagement'));
const TeamDashboard = lazyWithRetry(() => import('./pages/admin/TeamDashboard'));
const DispatchCenter = lazyWithRetry(() => import('./pages/admin/DispatchCenter'));

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

/** Wraps each admin sub-route with its own ErrorBoundary + Suspense so a
 *  single chunk failure only affects that page, not the whole admin shell. */
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary>
    <Suspense fallback={<AdminLoadingScreen />}>{children}</Suspense>
  </ErrorBoundary>
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
            <Route
              path="dashboard"
              element={
                <AdminRoute>
                  <DashboardIndex />
                </AdminRoute>
              }
            />
            <Route
              path="analytics"
              element={
                <AdminRoute>
                  <AnalyticsDashboard />
                </AdminRoute>
              }
            />
            <Route
              path="bookings"
              element={
                <AdminRoute>
                  <BookingManagement />
                </AdminRoute>
              }
            />
            <Route
              path="calendar"
              element={
                <AdminRoute>
                  <CalendarManagement />
                </AdminRoute>
              }
            />
            <Route
              path="reviews"
              element={
                <AdminRoute>
                  <ReviewManagement />
                </AdminRoute>
              }
            />
            <Route
              path="coupons"
              element={
                <AdminRoute>
                  <CouponManagement />
                </AdminRoute>
              }
            />
            <Route
              path="gallery"
              element={
                <AdminRoute>
                  <GalleryManagement />
                </AdminRoute>
              }
            />
            <Route
              path="menu"
              element={
                <AdminRoute>
                  <MenuManagement />
                </AdminRoute>
              }
            />
            <Route
              path="instagram"
              element={
                <AdminRoute>
                  <InstagramManagement />
                </AdminRoute>
              }
            />
            <Route
              path="customers"
              element={
                <AdminRoute>
                  <CustomerManagement />
                </AdminRoute>
              }
            />
            <Route
              path="activity"
              element={
                <AdminRoute>
                  <ActivityLog />
                </AdminRoute>
              }
            />
            <Route
              path="settings"
              element={
                <AdminRoute>
                  <SettingsPage />
                </AdminRoute>
              }
            />
            <Route
              path="users"
              element={
                <AdminRoute>
                  <UserManagement />
                </AdminRoute>
              }
            />
            <Route
              path="team"
              element={
                <AdminRoute>
                  <TeamDashboard />
                </AdminRoute>
              }
            />
            <Route
              path="dispatch"
              element={
                <AdminRoute>
                  <DispatchCenter />
                </AdminRoute>
              }
            />
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
      <Suspense fallback={null}>
        <FloatingContact />
      </Suspense>
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
