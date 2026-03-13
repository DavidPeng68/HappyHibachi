import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { ROUTES } from '../../constants';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}

/**
 * Route protection component
 * Redirects to home if user doesn't have required permissions
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth: _requireAuth = false,
  requireAdmin = false,
}) => {
  // Check if admin feature is enabled via environment variable
  // Default to true in development, false in production
  const isAdminEnabled =
    process.env.REACT_APP_ENABLE_ADMIN === 'true' || process.env.NODE_ENV === 'development';

  // For admin routes, check if admin access is enabled
  if (requireAdmin && !isAdminEnabled) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  // TODO: Add actual authentication logic when backend is ready
  // For now, this is a placeholder structure
  // const { isAuthenticated, isAdmin } = useAuth();

  // if (requireAuth && !isAuthenticated) {
  //   return <Navigate to="/login" replace />;
  // }

  // if (requireAdmin && !isAdmin) {
  //   return <Navigate to={ROUTES.HOME} replace />;
  // }

  return <>{children}</>;
};

export default ProtectedRoute;
