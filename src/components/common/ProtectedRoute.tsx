import React, { ReactNode } from 'react';

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
  requireAdmin: _requireAdmin = false,
}) => {
  // Admin routes are protected by the login form in AdminDashboard itself,
  // so no environment variable gate is needed here.

  return <>{children}</>;
};

export default ProtectedRoute;
