import React, { createContext, useContext, useMemo } from 'react';
import type { AdminRole } from '../types/admin';

export interface AuthContextValue {
  token: string;
  role: AdminRole;
  userId: string;
  displayName: string;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

interface AuthProviderProps {
  token: string;
  role: AdminRole;
  userId: string;
  displayName: string;
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  token,
  role,
  userId,
  displayName,
  children,
}) => {
  const isSuperAdmin = role === 'super_admin';
  const value = useMemo(
    () => ({ token, role, userId, displayName, isSuperAdmin }),
    [token, role, userId, displayName, isSuperAdmin]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
