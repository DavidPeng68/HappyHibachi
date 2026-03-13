import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Navigation, Footer, TopBar } from './components';
import { ProtectedRoute, ErrorBoundary } from './components/common';
import { HomePage, NotFound } from './pages';

import { SettingsProvider } from './hooks';
import { OrderProvider } from './contexts/OrderContext';
import './App.css';

const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const FreeEstimate = React.lazy(() => import('./pages/FreeEstimate'));
const OrderPage = React.lazy(() => import('./pages/OrderPage'));
const MyBooking = React.lazy(() => import('./pages/MyBooking'));
const Privacy = React.lazy(() => import('./pages/Privacy'));
const Terms = React.lazy(() => import('./pages/Terms'));

// 动态更新 HTML lang 属性
const LanguageUpdater: React.FC = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return null;
};

// 内部路由组件
const AppRoutes: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  if (isAdmin) {
    return (
      <Suspense fallback={<div className="loading-screen">Loading...</div>}>
        <Routes>
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
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
        <Suspense fallback={<div className="loading-screen">Loading...</div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/order" element={<OrderPage />} />
            <Route path="/free-estimate" element={<FreeEstimate />} />
            <Route path="/book-now" element={<Navigate to="/order" replace />} />
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
