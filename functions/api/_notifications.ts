/**
 * Notification Helpers
 *
 * Provides in-app notification storage and retrieval for admin users.
 * Notifications are stored per-user in KV under `notifications:{userId}`.
 */

export interface Notification {
  id: string;
  type: 'booking_assigned' | 'status_changed' | 'booking_cancelled' | 'reminder' | 'mention';
  title: string;
  message: string;
  bookingId?: string;
  read: boolean;
  createdAt: string;
}

const KV_PREFIX = 'notifications:';
const MAX_NOTIFICATIONS = 100;

export async function readNotifications(kv: KVNamespace, userId: string): Promise<Notification[]> {
  const key = KV_PREFIX + userId;
  const data = await kv.get(key, 'json');
  return (data as Notification[] | null) || [];
}

export async function writeNotifications(kv: KVNamespace, userId: string, notifications: Notification[]): Promise<void> {
  // Keep last 100 notifications max
  const trimmed = notifications.slice(0, MAX_NOTIFICATIONS);
  await kv.put(KV_PREFIX + userId, JSON.stringify(trimmed));
}

export async function createNotification(
  kv: KVNamespace,
  userId: string,
  type: Notification['type'],
  title: string,
  message: string,
  bookingId?: string
): Promise<void> {
  const notifications = await readNotifications(kv, userId);
  notifications.unshift({
    id: crypto.randomUUID(),
    type,
    title,
    message,
    bookingId,
    read: false,
    createdAt: new Date().toISOString(),
  });
  await writeNotifications(kv, userId, notifications);
}
