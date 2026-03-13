import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { AppSettings } from '../types';

const DEFAULT_SETTINGS: AppSettings = {
  timeSlots: [
    { id: 'afternoon', label: 'Afternoon', startTime: '13:00', endTime: '15:00', enabled: true },
    { id: 'evening', label: 'Evening', startTime: '17:00', endTime: '19:00', enabled: true },
    { id: 'night', label: 'Night', startTime: '19:00', endTime: '21:00', enabled: true },
  ],
  minGuests: 10,
  maxGuests: 100,
  pricePerPerson: 60,
  minimumOrder: 600,
  socialLinks: {
    instagram: 'https://instagram.com/familyfriendshibachi',
    facebook: 'https://facebook.com/familyfriendshibachi',
    tiktok: 'https://tiktok.com/@familyfriendshibachi',
  },
  promoBanner: {
    enabled: true,
    text: 'Book Today & Get $30 OFF!',
    emoji: '🔥',
  },
  contactInfo: {
    phone: process.env.REACT_APP_PHONE || '909-615-6633',
    email: process.env.REACT_APP_EMAIL || 'familyfriendshibachi@gmail.com',
    contactPerson: 'Family Friends Hibachi Team',
  },
  galleryImages: [],
  featureToggles: {
    photoShare: true,
    referralProgram: true,
    newsletter: true,
    specialOffer: true,
    instagramFeed: true,
    coupons: true,
  },
  brandInfo: {
    name: 'Family Friends Hibachi',
    url: process.env.REACT_APP_BASE_URL || 'https://familyfriendshibachi.com',
    logoUrl: '/icon.svg',
    hashtag: '#MORESAKEMOREHAPPY',
    logoImage: '',
    heroImage: '',
  },
  seoDefaults: {
    title: 'Family Friends Hibachi - At Home Hibachi Experience',
    description:
      'Top Rated Hibachi At Home Experience. We bring our Hibachi Grill + Chef to your backyard. Serving California, Texas, and Florida.',
    keywords:
      'hibachi, at home hibachi, hibachi catering, backyard hibachi, hibachi chef, California hibachi, Texas hibachi, Florida hibachi',
  },
};

interface SettingsContextType {
  settings: AppSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  loading: true,
  refreshSettings: async () => {},
});

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const refreshSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      if (data.success && data.settings) {
        setSettings((prev) => ({ ...prev, ...data.settings }));
      }
    } catch {
      // Keep using current/default settings
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  const value = useMemo(
    () => ({ settings, loading, refreshSettings }),
    [settings, loading, refreshSettings]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export function useSettings(): SettingsContextType {
  return useContext(SettingsContext);
}

export { DEFAULT_SETTINGS };
