import { useState, useEffect, useCallback, useRef } from 'react';
import * as adminApi from '../services/adminApi';
import type { AdminNotification } from '../types/admin';

const POLL_INTERVAL_MS = 30_000; // 30 seconds

export function useNotifications(token: string) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await adminApi.fetchNotifications(token);
      if (res.success) {
        setNotifications(res.notifications);
      }
    } catch {
      // Silently fail — notifications are non-critical
    } finally {
      setLoading(false);
    }
  }, [token]);

  const markRead = useCallback(
    async (ids: string[]) => {
      if (!token || ids.length === 0) return;
      // Optimistic update
      setNotifications((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)));
      try {
        await adminApi.markNotificationsRead(token, ids);
      } catch {
        // Revert on failure
        fetchNotifications();
      }
    },
    [token, fetchNotifications]
  );

  const markAllRead = useCallback(async () => {
    if (!token) return;
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await adminApi.markAllNotificationsRead(token);
    } catch {
      fetchNotifications();
    }
  }, [token, fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    fetchNotifications();
    intervalRef.current = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    refetch: fetchNotifications,
  };
}
