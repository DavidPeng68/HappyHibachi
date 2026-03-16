import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AdminMenuType } from '../types/admin';

export interface NavigationContextValue {
  activeMenu: AdminMenuType;
  setActiveMenu: (menu: AdminMenuType, payload?: Record<string, string>) => void;
  navigationPayload: Record<string, string> | null;
  clearNavigationPayload: () => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function useAdminNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useAdminNavigation must be used within NavigationProvider');
  return ctx;
}

const ALL_MENUS: AdminMenuType[] = [
  'dashboard',
  'analytics',
  'bookings',
  'calendar',
  'reviews',
  'coupons',
  'gallery',
  'menu',
  'instagram',
  'customers',
  'activity',
  'settings',
  'users',
];

function getMenuFromHash(): AdminMenuType | null {
  const hash = window.location.hash.replace('#', '');
  if (hash && ALL_MENUS.includes(hash as AdminMenuType)) {
    return hash as AdminMenuType;
  }
  return null;
}

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeMenu, setActiveMenuState] = useState<AdminMenuType>(
    () => getMenuFromHash() || 'dashboard'
  );
  const [navigationPayload, setNavigationPayload] = useState<Record<string, string> | null>(null);

  const setActiveMenu = useCallback((menu: AdminMenuType, payload?: Record<string, string>) => {
    setActiveMenuState(menu);
    setNavigationPayload(payload || null);
    window.location.hash = menu === 'dashboard' ? '' : menu;
  }, []);

  const clearNavigationPayload = useCallback(() => setNavigationPayload(null), []);

  useEffect(() => {
    const onHashChange = () => {
      const menu = getMenuFromHash();
      setActiveMenuState(menu || 'dashboard');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const value = useMemo(
    () => ({ activeMenu, setActiveMenu, navigationPayload, clearNavigationPayload }),
    [activeMenu, setActiveMenu, navigationPayload, clearNavigationPayload]
  );
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
};
