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
  validFrom: string;
  validUntil: string;
  enabled: boolean;
  createdAt: string;
}

export interface BlockedDate {
  date: string;
  reason?: string;
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

export type MenuType =
  | 'dashboard'
  | 'bookings'
  | 'calendar'
  | 'reviews'
  | 'coupons'
  | 'instagram'
  | 'gallery'
  | 'settings';
export type StatusType = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled';

export function getAuthToken(): string | null {
  return sessionStorage.getItem('admin_token');
}

export function getAuthHeader(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
