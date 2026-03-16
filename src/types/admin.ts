/**
 * Admin Dashboard Types
 *
 * Extracted from AdminDashboard.tsx and expanded with new fields.
 */

// ---------------------------------------------------------------------------
// Role-Based Access Control
// ---------------------------------------------------------------------------

export type AdminRole = 'super_admin' | 'order_manager';
export type AccountStatus = 'pending' | 'approved' | 'rejected';
export type FieldVisibility = 'full' | 'standard' | 'minimal';

export type Permission =
  | 'dashboard.view'
  | 'analytics.view'
  | 'bookings.view'
  | 'bookings.edit'
  | 'bookings.delete'
  | 'calendar.view'
  | 'calendar.edit'
  | 'reviews.view'
  | 'reviews.edit'
  | 'coupons.view'
  | 'coupons.edit'
  | 'gallery.view'
  | 'gallery.edit'
  | 'menu.view'
  | 'menu.edit'
  | 'instagram.view'
  | 'instagram.edit'
  | 'customers.view'
  | 'customers.edit'
  | 'activity.view'
  | 'settings.view'
  | 'settings.edit'
  | 'users.view'
  | 'users.edit'
  | 'team.view'
  | 'dispatch.view';

export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  super_admin: [
    'dashboard.view',
    'analytics.view',
    'bookings.view',
    'bookings.edit',
    'bookings.delete',
    'calendar.view',
    'calendar.edit',
    'reviews.view',
    'reviews.edit',
    'coupons.view',
    'coupons.edit',
    'gallery.view',
    'gallery.edit',
    'menu.view',
    'menu.edit',
    'instagram.view',
    'instagram.edit',
    'customers.view',
    'customers.edit',
    'activity.view',
    'settings.view',
    'settings.edit',
    'users.view',
    'users.edit',
    'team.view',
    'dispatch.view',
  ],
  order_manager: [
    'dashboard.view',
    'bookings.view',
    'bookings.edit',
    'calendar.view',
    'calendar.edit',
  ],
};

export const MENU_ROUTE_MAP: Record<AdminMenuType, string> = {
  dashboard: '/admin/dashboard',
  analytics: '/admin/analytics',
  bookings: '/admin/bookings',
  calendar: '/admin/calendar',
  reviews: '/admin/reviews',
  coupons: '/admin/coupons',
  gallery: '/admin/gallery',
  menu: '/admin/menu',
  instagram: '/admin/instagram',
  customers: '/admin/customers',
  activity: '/admin/activity',
  settings: '/admin/settings',
  users: '/admin/users',
  team: '/admin/team',
  dispatch: '/admin/dispatch',
};

export const ROUTE_MENU_MAP: Record<string, AdminMenuType> = Object.fromEntries(
  Object.entries(MENU_ROUTE_MAP).map(([k, v]) => [v, k as AdminMenuType])
) as Record<string, AdminMenuType>;

export function hasPermission(role: AdminRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function getDefaultRoute(_role: AdminRole): string {
  return '/admin/dashboard';
}

export function getMenuPermission(menu: AdminMenuType): Permission {
  return `${menu}.view` as Permission;
}

export interface AdminUser {
  id: string;
  username: string;
  passwordHash: string;
  role: AdminRole;
  displayName: string;
  enabled: boolean;
  status: AccountStatus;
  createdAt: string;
  createdBy: string;
  visibility?: FieldVisibility;
}

export interface BookingOrderData {
  packageName: string;
  priceModel: string;
  guestCount: number;
  kidsCount: number;
  serviceType: string;
  serviceDuration: number;
  proteins: string[];
  addons: Array<{ name: string; quantity: number; unitPrice: number }>;
  estimatedTotal: number;
}

export interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  guestCount: number;
  region: string;
  message?: string;
  formType: 'booking' | 'estimate';
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  couponCode?: string;
  couponDiscount?: string;
  referralSource?: string;
  referralCode?: string;
  referralDiscount?: string;
  eventType?: string;
  orderData?: BookingOrderData;
  adminNotes?: string;
  assignedTo?: string;
  createdAt: string;
  _version?: number;
  deletedAt?: string | null;
  dietaryRestrictions?: string[]; // TODO: future feature — dietary needs collection
  allergens?: string[]; // TODO: future feature — allergen tracking
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minGuests: number;
  maxUses: number;
  usedCount: number;
  usedByBookings?: string[];
  validFrom: string;
  validUntil: string;
  enabled: boolean;
  createdAt: string;
}

export interface BlockedDate {
  date: string;
  reason?: string;
  region?: string;
}

export interface Review {
  id: string;
  name: string;
  location: string;
  rating: number;
  review: string;
  event: string;
  createdAt: string;
  visible: boolean;
}

export interface TimeSlot {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  enabled: boolean;
}

export interface GalleryImage {
  id: string;
  url: string;
  caption: string;
  order: number;
}

export interface FeatureToggles {
  photoShare: boolean;
  referralProgram: boolean;
  newsletter: boolean;
  specialOffer: boolean;
  instagramFeed: boolean;
  coupons: boolean;
}

export interface InstagramPost {
  id: string;
  image: string;
  link: string;
  caption?: string;
}

export interface InstagramSettings {
  handle: string;
  posts: InstagramPost[];
  updatedAt: string;
}

export interface Customer {
  email: string;
  name: string;
  phone: string;
  region: string;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  firstBookingDate: string;
  lastBookingDate: string;
  notes: string;
  tags: string[];
}

export interface BookingComment {
  id: string;
  bookingId: string;
  userId: string;
  displayName: string;
  content: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  details: string;
  performedBy: string;
  createdAt: string;
}

export interface AdminNotification {
  id: string;
  type: 'booking_assigned' | 'status_changed' | 'booking_cancelled' | 'reminder' | 'mention';
  title: string;
  message: string;
  bookingId?: string;
  read: boolean;
  createdAt: string;
}

export type AdminMenuType =
  | 'dashboard'
  | 'analytics'
  | 'bookings'
  | 'calendar'
  | 'reviews'
  | 'coupons'
  | 'gallery'
  | 'menu'
  | 'instagram'
  | 'customers'
  | 'activity'
  | 'settings'
  | 'users'
  | 'team'
  | 'dispatch';

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type StatusFilter = 'all' | BookingStatus;

export interface StatusConfig {
  label: string;
  color: string;
  bg: string;
}

export type SortField = 'name' | 'date' | 'guestCount' | 'status' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  region?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: string;
  dir?: 'asc' | 'desc';
}
