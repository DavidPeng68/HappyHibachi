import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ToastMessage } from '../types/admin';

export interface ToastContextValue {
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  toasts: ToastMessage[];
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const MAX_TOASTS = 3;
const TOAST_DURATION_MS = 3000;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastIdRef = useRef(0);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    const id = String(++toastIdRef.current);
    setToasts((prev) => {
      const next = [...prev, { id, message, type }];
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
    });
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  const value = React.useMemo(
    () => ({ showToast, toasts, dismissToast }),
    [showToast, toasts, dismissToast]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};
