/**
 * Admin Dashboard Types
 *
 * Extracted from AdminDashboard.tsx and expanded with new fields.
 */

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
  orderData?: BookingOrderData;
  adminNotes?: string;
  createdAt: string;
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

export interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  details: string;
  performedBy: string;
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
  | 'settings';

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
