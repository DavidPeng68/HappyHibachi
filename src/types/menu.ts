// Menu System Types

export type LocaleCode = 'en' | 'zh' | 'es' | 'ko' | 'vi' | 'ja' | 'tl' | 'hi';
export type TranslatableText = Partial<Record<LocaleCode, string>> & { en: string };

export interface MenuItem {
  id: string;
  categoryId: string;
  name: TranslatableText;
  description: TranslatableText;
  price: number;
  priceType: 'included' | 'per_person' | 'per_item' | 'upgrade';
  imageUrl: string;
  tags: string[];
  available: boolean;
  orderable: boolean;
  sortOrder: number;
}

export interface MenuCategory {
  id: string;
  name: TranslatableText;
  description: TranslatableText;
  slug: string;
  sortOrder: number;
  visible: boolean;
}

export interface MenuPackage {
  id: string;
  name: TranslatableText;
  description: TranslatableText;
  pricePerPerson: number;
  minGuests: number;
  maxGuests: number | null;
  features: TranslatableText[];
  categoryIds: string[];
  highlighted: boolean;
  sortOrder: number;
  visible: boolean;
  // Admin-configurable fields
  proteinCount: number; // proteins per person (0 = no protein step)
  kidsPrice: number | null; // kids per-person price (null = use global pricing.kidsPrice)
  flatPrice: number | null; // fixed total price (non-null ignores pricePerPerson) — for Intimate Party
  serviceDuration: number; // service duration in minutes
  serviceType: string; // service style: "hibachi", "buffet", "plated", etc.
}

export interface MenuSpotlight {
  id: string;
  menuItemId: string;
  title: TranslatableText;
  subtitle: TranslatableText;
  imageUrl: string;
  videoUrl?: string;
  sortOrder: number;
  visible: boolean;
}

export interface CouponTier {
  id: string;
  guestRange: TranslatableText;
  discount: number;
  sortOrder: number;
}

export interface PricingConfig {
  kidsPrice: number;
  creditCardFee: number;
  gratuitySuggested: number;
  cancellationFee: number;
  minimumOrder: number;
  outdoorNote: TranslatableText;
  weatherNote: TranslatableText;
}

export interface OrderItem {
  menuItemId: string;
  quantity: number;
  specialNotes?: string;
}

export interface AddonItem {
  menuItemId: string;
  quantity: number;
}

export interface OrderState {
  packageId: string | null;
  guestCount: number;
  kidsCount: number;
  proteinSelections: string[]; // menuItemId[], length capped by pkg.proteinCount
  addons: AddonItem[];
  /** @deprecated kept for sessionStorage migration from old format */
  items?: OrderItem[];
}

export interface MenuData {
  version: 1;
  packages: MenuPackage[];
  categories: MenuCategory[];
  items: MenuItem[];
  spotlights: MenuSpotlight[];
  couponTiers: CouponTier[];
  pricing: PricingConfig;
  updatedAt: string;
}
