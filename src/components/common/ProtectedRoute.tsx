import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { AdminRole, Permission } from '../../types/admin';
import { hasPermission } from '../../types/admin';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  requiredPermission?: Permission;
}

function getStoredAuth() {
  const token = sessionStorage.getItem('admin_token');
  const role = sessionStorage.getItem('admin_role') as AdminRole | null;
  return { token, role };
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth: _requireAuth = false,
  requireAdmin = false,
  requiredPermission,
}) => {
  const location = useLocation();

  if (requireAdmin) {
    const { token, role } = getStoredAuth();

    if (!token) {
      return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }

    if (requiredPermission && role && !hasPermission(role, requiredPermission)) {
      return <Navigate to="/admin/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
