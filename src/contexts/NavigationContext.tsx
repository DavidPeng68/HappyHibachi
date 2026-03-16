import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { AdminMenuType } from '../types/admin';
import { MENU_ROUTE_MAP, ROUTE_MENU_MAP } from '../types/admin';

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

function getMenuFromPath(pathname: string): AdminMenuType {
  const match = ROUTE_MENU_MAP[pathname];
  if (match) return match;

  for (const [route, menu] of Object.entries(ROUTE_MENU_MAP)) {
    if (pathname.startsWith(route + '/')) return menu;
  }

  return 'dashboard';
}

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const activeMenu = useMemo(() => getMenuFromPath(location.pathname), [location.pathname]);
  const [navigationPayload, setNavigationPayload] = useState<Record<string, string> | null>(null);

  const setActiveMenu = useCallback(
    (menu: AdminMenuType, payload?: Record<string, string>) => {
      setNavigationPayload(payload || null);
      const route = MENU_ROUTE_MAP[menu] || '/admin/dashboard';
      navigate(route);
    },
    [navigate]
  );

  const clearNavigationPayload = useCallback(() => setNavigationPayload(null), []);

  // Handle legacy hash navigation — redirect to route
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && MENU_ROUTE_MAP[hash as AdminMenuType]) {
      navigate(MENU_ROUTE_MAP[hash as AdminMenuType], { replace: true });
    }
  }, [navigate]);

  const value = useMemo(
    () => ({ activeMenu, setActiveMenu, navigationPayload, clearNavigationPayload }),
    [activeMenu, setActiveMenu, navigationPayload, clearNavigationPayload]
  );
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
};
