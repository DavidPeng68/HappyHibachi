// Common Types for Family Friends Hibachi Application
export * from './menu';

export interface Review {
  id: string;
  name: string;
  location: string;
  rating: number;
  review: string;
  event: string;
}

export interface FAQItem {
  id: number;
  question: string;
  answer: string;
}

export interface Region {
  id: string;
  name: string;
  cities: string[];
  hashLink: string;
}

export interface PricingTier {
  guestRange: string;
  discount: number;
}

export interface ContactInfo {
  phone: string;
  email: string;
  contactPerson: string;
  responseTime?: string;
}

export interface BusinessHours {
  afternoon: string;
  evening: string;
  night: string;
}

export interface GalleryImage {
  src: string;
  alt: string;
  description: string;
}

// Route protection types
export interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}

// Order data snapshot (stored with booking for historical accuracy)
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

// Form types
export interface BookingFormData {
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  guestCount: number;
  region: string;
  message?: string;
  couponCode?: string;
  referralCode?: string;
  referralSource?: string;
  orderData?: BookingOrderData;
}

export interface EstimateFormData {
  name: string;
  email: string;
  phone: string;
  eventType: string;
  guestCount: number;
  preferredDate: string;
  region: string;
  additionalInfo?: string;
}

export interface SocialLinks {
  instagram: string;
  facebook: string;
  tiktok: string;
}

export interface PromoBanner {
  enabled: boolean;
  text: string;
  emoji: string;
}

export interface TimeSlot {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  enabled: boolean;
}

export interface GalleryImageApi {
  id: string;
  url: string;
  r2Key?: string;
  caption: string;
  order: number;
}

export interface FeatureToggles {
  photoShare: boolean; // 照片分享活动
  referralProgram: boolean; // 推荐计划
  newsletter: boolean; // 新闻订阅
  specialOffer: boolean; // 特别优惠弹窗
  instagramFeed: boolean; // Instagram 动态
  coupons: boolean; // 优惠券系统
}

export interface BrandInfo {
  name: string;
  url: string;
  logoUrl: string;
  hashtag: string;
  logoImage?: string;
  heroImage?: string;
  heroVideo?: string;
}

export interface SEODefaults {
  title: string;
  description: string;
  keywords: string;
}

export interface AppSettings {
  timeSlots: TimeSlot[];
  minGuests: number;
  maxGuests: number;
  pricePerPerson: number;
  minimumOrder: number;
  socialLinks: SocialLinks;
  promoBanner: PromoBanner;
  contactInfo: ContactInfo;
  galleryImages: GalleryImageApi[];
  featureToggles: FeatureToggles;
  brandInfo: BrandInfo;
  seoDefaults: SEODefaults;
}
