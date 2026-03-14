/**
 * Admin API Service
 *
 * All admin dashboard API calls extracted from AdminDashboard.tsx.
 * Uses fetch with AbortController timeout, matching the pattern in api.ts.
 */

import type {
  AdminRole,
  AdminUser,
  Booking,
  BookingStatus,
  BlockedDate,
  Review,
  Coupon,
  Customer,
  AuditLogEntry,
  InstagramPost,
  InstagramSettings,
} from '../types/admin';
import type { AppSettings } from '../types';

const API_BASE = '/api';
const REQUEST_TIMEOUT_MS = 15_000;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface AdminApiResponse {
  success: boolean;
  error?: string;
  [key: string]: unknown;
}

function authHeaders(token: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function adminRequest<T extends AdminApiResponse>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      try {
        const body = await response.json();
        if (body.error) {
          return { success: false, error: body.error } as T;
        }
      } catch {
        // No JSON body — fall through to generic error
      }
      return { success: false, error: `Request failed with status ${response.status}` } as T;
    }

    return (await response.json()) as T;
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { success: false, error: 'Request timed out' } as T;
    }
    console.error('Admin API request error:', error);
    return { success: false, error: 'Network error' } as T;
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function login(
  password: string,
  username?: string
): Promise<{
  success: boolean;
  token?: string;
  role?: AdminRole;
  userId?: string;
  displayName?: string;
  error?: string;
}> {
  return adminRequest(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, ...(username && { username }) }),
  });
}

export async function register(
  username: string,
  password: string,
  displayName: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  return adminRequest(`${API_BASE}/admin/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, displayName }),
  });
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

export async function fetchBookings(
  token: string
): Promise<{ success: boolean; bookings: Booking[] }> {
  return adminRequest(`${API_BASE}/admin/bookings`, {
    headers: authHeaders(token),
  });
}

export async function updateBooking(
  token: string,
  data: {
    id: string;
    status?: BookingStatus;
    date?: string;
    time?: string;
    guestCount?: number;
    region?: string;
    name?: string;
    email?: string;
    phone?: string;
    adminNotes?: string;
    message?: string;
    assignedTo?: string;
  }
): Promise<{ success: boolean; booking?: Booking }> {
  return adminRequest(`${API_BASE}/admin/bookings`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

export async function deleteBooking(token: string, id: string): Promise<{ success: boolean }> {
  return adminRequest(`${API_BASE}/admin/bookings`, {
    method: 'DELETE',
    headers: authHeaders(token),
    body: JSON.stringify({ id }),
  });
}

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

export async function fetchCalendar(region?: string): Promise<{
  success: boolean;
  bookedDates: Array<{ date: string; count: number }>;
  blockedDates: BlockedDate[];
}> {
  const params = region ? `?region=${encodeURIComponent(region)}` : '';
  return adminRequest(`${API_BASE}/calendar${params}`);
}

export async function addBlockedDate(
  token: string,
  date: string,
  reason?: string
): Promise<{ success: boolean; blockedDates: BlockedDate[] }> {
  return adminRequest(`${API_BASE}/calendar`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ date, reason }),
  });
}

export async function removeBlockedDate(
  token: string,
  date: string
): Promise<{ success: boolean; blockedDates: BlockedDate[] }> {
  return adminRequest(`${API_BASE}/calendar`, {
    method: 'DELETE',
    headers: authHeaders(token),
    body: JSON.stringify({ date }),
  });
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export async function fetchReviews(
  token: string
): Promise<{ success: boolean; reviews: Review[] }> {
  return adminRequest(`${API_BASE}/reviews`, {
    headers: authHeaders(token),
  });
}

export async function addReview(
  token: string,
  data: Omit<Review, 'id' | 'createdAt'>
): Promise<{ success: boolean; review?: Review }> {
  return adminRequest(`${API_BASE}/reviews`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

export async function updateReview(
  token: string,
  data: { id: string } & Partial<Review>
): Promise<{ success: boolean; review?: Review }> {
  return adminRequest(`${API_BASE}/reviews`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

export async function deleteReview(token: string, id: string): Promise<{ success: boolean }> {
  return adminRequest(`${API_BASE}/reviews`, {
    method: 'DELETE',
    headers: authHeaders(token),
    body: JSON.stringify({ id }),
  });
}

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------

export async function fetchCoupons(
  token: string
): Promise<{ success: boolean; coupons: Coupon[] }> {
  return adminRequest(`${API_BASE}/coupons`, {
    headers: authHeaders(token),
  });
}

export async function createCoupon(
  token: string,
  data: Partial<Coupon>
): Promise<{ success: boolean; coupon?: Coupon }> {
  return adminRequest(`${API_BASE}/coupons`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

export async function updateCoupon(
  token: string,
  data: { id: string } & Partial<Coupon>
): Promise<{ success: boolean; coupon?: Coupon }> {
  return adminRequest(`${API_BASE}/coupons`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

export async function deleteCoupon(token: string, id: string): Promise<{ success: boolean }> {
  return adminRequest(`${API_BASE}/coupons`, {
    method: 'DELETE',
    headers: authHeaders(token),
    body: JSON.stringify({ id }),
  });
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function fetchSettings(): Promise<{
  success: boolean;
  settings?: AppSettings;
}> {
  return adminRequest(`${API_BASE}/settings`);
}

export async function saveSettings(
  token: string,
  data: Partial<AppSettings>
): Promise<{ success: boolean; settings?: AppSettings }> {
  return adminRequest(`${API_BASE}/admin/settings`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

// ---------------------------------------------------------------------------
// Gallery Images (R2)
// ---------------------------------------------------------------------------

export async function uploadGalleryImage(
  token: string,
  blob: Blob
): Promise<{ success: boolean; key?: string; url?: string; error?: string }> {
  const formData = new FormData();
  formData.append('image', blob, 'gallery.webp');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(`${API_BASE}/admin/gallery`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
      signal: controller.signal,
    });
    return await response.json();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { success: false, error: 'Upload timed out' };
    }
    return { success: false, error: 'Network error' };
  } finally {
    clearTimeout(timeout);
  }
}

export async function deleteGalleryImages(
  token: string,
  keys: string[]
): Promise<{ success: boolean; error?: string }> {
  return adminRequest(`${API_BASE}/admin/gallery`, {
    method: 'DELETE',
    headers: authHeaders(token),
    body: JSON.stringify({ keys }),
  });
}

// ---------------------------------------------------------------------------
// Instagram
// ---------------------------------------------------------------------------

export async function fetchInstagram(): Promise<{
  success: boolean;
  settings?: InstagramSettings;
}> {
  return adminRequest(`${API_BASE}/instagram`);
}

export async function saveInstagramHandle(
  token: string,
  handle: string
): Promise<{ success: boolean; settings?: InstagramSettings }> {
  return adminRequest(`${API_BASE}/instagram`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ handle }),
  });
}

export async function addInstagramPost(
  token: string,
  post: { image: string; link: string }
): Promise<{ success: boolean; settings?: InstagramSettings }> {
  return adminRequest(`${API_BASE}/instagram`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ action: 'add', post }),
  });
}

export async function deleteInstagramPost(
  token: string,
  postId: string
): Promise<{ success: boolean; settings?: InstagramSettings }> {
  return adminRequest(`${API_BASE}/instagram`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ action: 'delete', postId }),
  });
}

export async function reorderInstagramPosts(
  token: string,
  posts: InstagramPost[]
): Promise<{ success: boolean; settings?: InstagramSettings }> {
  return adminRequest(`${API_BASE}/instagram`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ posts }),
  });
}

// ---------------------------------------------------------------------------
// Reminders
// ---------------------------------------------------------------------------

export async function fetchReminderStatus(): Promise<{
  success: boolean;
  pendingReminders?: number;
  alreadyReminded?: number;
}> {
  return adminRequest(`${API_BASE}/admin/reminders`);
}

export async function sendReminders(
  token: string
): Promise<{ success: boolean; processed?: number }> {
  return adminRequest(`${API_BASE}/admin/reminders`, {
    method: 'POST',
    headers: authHeaders(token),
  });
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export async function fetchCustomers(
  token: string
): Promise<{ success: boolean; customers: Customer[] }> {
  return adminRequest(`${API_BASE}/admin/customers`, {
    headers: authHeaders(token),
  });
}

export async function updateCustomerNotes(
  token: string,
  email: string,
  notes: string
): Promise<{ success: boolean }> {
  return adminRequest(`${API_BASE}/admin/customers`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ email, notes }),
  });
}

export async function updateCustomerTags(
  token: string,
  email: string,
  tags: string[]
): Promise<{ success: boolean }> {
  return adminRequest(`${API_BASE}/admin/customers`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ email, tags }),
  });
}

// ---------------------------------------------------------------------------
// Audit Log
// ---------------------------------------------------------------------------

export async function fetchAuditLog(
  token: string
): Promise<{ success: boolean; entries: AuditLogEntry[] }> {
  return adminRequest(`${API_BASE}/admin/audit-log`, {
    headers: authHeaders(token),
  });
}

// ---------------------------------------------------------------------------
// User Management
// ---------------------------------------------------------------------------

export async function fetchUsers(
  token: string,
  status?: string
): Promise<{ success: boolean; users: Omit<AdminUser, 'passwordHash'>[] }> {
  const params = status ? `?status=${encodeURIComponent(status)}` : '';
  return adminRequest(`${API_BASE}/admin/users${params}`, {
    headers: authHeaders(token),
  });
}

export async function createUser(
  token: string,
  data: { username: string; password: string; displayName: string; role?: AdminRole }
): Promise<{ success: boolean; user?: Omit<AdminUser, 'passwordHash'>; error?: string }> {
  return adminRequest(`${API_BASE}/admin/users`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

export async function updateUser(
  token: string,
  data: {
    id: string;
    displayName?: string;
    password?: string;
    enabled?: boolean;
    status?: 'approved' | 'rejected';
    role?: AdminRole;
  }
): Promise<{ success: boolean; user?: Omit<AdminUser, 'passwordHash'>; error?: string }> {
  return adminRequest(`${API_BASE}/admin/users`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

export async function deleteUser(
  token: string,
  id: string
): Promise<{ success: boolean; error?: string }> {
  return adminRequest(`${API_BASE}/admin/users?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}
