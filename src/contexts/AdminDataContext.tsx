import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Booking, BlockedDate, Review, Coupon } from '../types/admin';
import type { AppSettings } from '../types';
import * as adminApi from '../services/adminApi';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

// ---------------------------------------------------------------------------
// Loading state per resource
// ---------------------------------------------------------------------------

export interface AdminLoadingState {
  bookings: boolean;
  reviews: boolean;
  coupons: boolean;
  settings: boolean;
  calendar: boolean;
}

const INITIAL_LOADING: AdminLoadingState = {
  bookings: true,
  reviews: true,
  coupons: true,
  settings: true,
  calendar: true,
};

// ---------------------------------------------------------------------------
// Default settings
// ---------------------------------------------------------------------------

const DEFAULT_SETTINGS: AppSettings = {
  timeSlots: [],
  minGuests: 10,
  maxGuests: 50,
  pricePerPerson: 55,
  minimumOrder: 550,
  socialLinks: {} as AppSettings['socialLinks'],
  promoBanner: {} as AppSettings['promoBanner'],
  contactInfo: {} as AppSettings['contactInfo'],
  galleryImages: [],
  featureToggles: {
    photoShare: false,
    referralProgram: false,
    newsletter: false,
    specialOffer: false,
    instagramFeed: false,
    coupons: false,
  },
  brandInfo: {} as AppSettings['brandInfo'],
  seoDefaults: {} as AppSettings['seoDefaults'],
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export interface AdminDataContextValue {
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  reviews: Review[];
  setReviews: React.Dispatch<React.SetStateAction<Review[]>>;
  coupons: Coupon[];
  setCoupons: React.Dispatch<React.SetStateAction<Coupon[]>>;
  blockedDates: BlockedDate[];
  setBlockedDates: React.Dispatch<React.SetStateAction<BlockedDate[]>>;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  refreshAll: () => void;
  loading: boolean;
  loadingState: AdminLoadingState;
}

const AdminDataContext = createContext<AdminDataContextValue | null>(null);

export function useAdminData(): AdminDataContextValue {
  const ctx = useContext(AdminDataContext);
  if (!ctx) throw new Error('useAdminData must be used within AdminDataProvider');
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const AdminDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loadingState, setLoadingState] = useState<AdminLoadingState>(INITIAL_LOADING);

  const loading = useMemo(() => Object.values(loadingState).some(Boolean), [loadingState]);

  const refreshAll = useCallback(async () => {
    setLoadingState(INITIAL_LOADING);
    try {
      const [bookingsRes, calendarRes, reviewsRes, couponsRes, settingsRes] = await Promise.all([
        adminApi.fetchBookings(token),
        adminApi.fetchCalendar(),
        adminApi.fetchReviews(token),
        adminApi.fetchCoupons(token),
        adminApi.fetchSettings(),
      ]);

      if (bookingsRes.success) setBookings(bookingsRes.bookings);
      setLoadingState((prev) => ({ ...prev, bookings: false }));

      if (calendarRes.success) setBlockedDates(calendarRes.blockedDates);
      setLoadingState((prev) => ({ ...prev, calendar: false }));

      if (reviewsRes.success) setReviews(reviewsRes.reviews);
      setLoadingState((prev) => ({ ...prev, reviews: false }));

      if (couponsRes.success) setCoupons(couponsRes.coupons);
      setLoadingState((prev) => ({ ...prev, coupons: false }));

      if (settingsRes.success && settingsRes.settings) setSettings(settingsRes.settings);
      setLoadingState((prev) => ({ ...prev, settings: false }));
    } catch {
      showToast(t('admin.toast.fetchFailed'), 'error');
      setLoadingState({
        bookings: false,
        reviews: false,
        coupons: false,
        settings: false,
        calendar: false,
      });
    }
  }, [token, showToast, t]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const value = useMemo<AdminDataContextValue>(
    () => ({
      bookings,
      setBookings,
      reviews,
      setReviews,
      coupons,
      setCoupons,
      blockedDates,
      setBlockedDates,
      settings,
      setSettings,
      refreshAll,
      loading,
      loadingState,
    }),
    [bookings, reviews, coupons, blockedDates, settings, refreshAll, loading, loadingState]
  );

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
};
