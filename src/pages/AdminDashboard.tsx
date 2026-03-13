import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/common';
import { useSettings, DEFAULT_SETTINGS } from '../hooks/useSettings';
import { ImageUploader } from '../components/ui';
import { LOGO_PRESET, HERO_PRESET, GALLERY_PRESET } from '../utils/imageCompression';
import type { AppSettings } from '../types';
import './AdminDashboard.css';

interface BookingOrderData {
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

interface Booking {
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
  createdAt: string;
}

interface Coupon {
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

interface BlockedDate {
  date: string;
  reason?: string;
}

interface Review {
  id: string;
  name: string;
  location: string;
  rating: number;
  review: string;
  event: string;
  createdAt: string;
  visible: boolean;
}

interface TimeSlot {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  enabled: boolean;
}

interface GalleryImage {
  id: string;
  url: string;
  caption: string;
  order: number;
}

interface FeatureToggles {
  photoShare: boolean;
  referralProgram: boolean;
  newsletter: boolean;
  specialOffer: boolean;
  instagramFeed: boolean;
  coupons: boolean;
}

interface InstagramPost {
  id: string;
  image: string; // base64 image
  link: string; // Instagram post link
  caption?: string;
}

interface InstagramSettings {
  handle: string;
  posts: InstagramPost[];
  updatedAt: string;
}

const MenuManagement = React.lazy(() => import('./admin/MenuManagement'));

type MenuType =
  | 'dashboard'
  | 'bookings'
  | 'calendar'
  | 'reviews'
  | 'coupons'
  | 'instagram'
  | 'gallery'
  | 'menu'
  | 'settings';
type StatusType = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled';

const DEFAULT_FEATURE_TOGGLES: FeatureToggles = {
  photoShare: true,
  referralProgram: true,
  newsletter: true,
  specialOffer: true,
  instagramFeed: true,
  coupons: true,
};

const ADMIN_DEFAULT_SETTINGS: AppSettings = {
  ...DEFAULT_SETTINGS,
  featureToggles: DEFAULT_FEATURE_TOGGLES,
};

const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { settings: globalSettings, refreshSettings: refreshGlobalSettings } = useSettings();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [settings, setSettings] = useState<AppSettings>(ADMIN_DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [activeMenu, setActiveMenu] = useState<MenuType>('dashboard');
  const [statusFilter, setStatusFilter] = useState<StatusType>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [updating, setUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState('');

  // Reminder state
  const [reminderStatus, setReminderStatus] = useState<{
    pending: number;
    reminded: number;
    loading: boolean;
  }>({ pending: 0, reminded: 0, loading: false });

  // Instagram state
  const [instagramSettings, setInstagramSettings] = useState<InstagramSettings>({
    handle: '',
    posts: [],
    updatedAt: '',
  });
  const [instagramLoading, setInstagramLoading] = useState(false);
  const [newPostLink, setNewPostLink] = useState('');
  const [newPostImage, setNewPostImage] = useState<string | null>(null);

  // Coupon state
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [newCoupon, setNewCoupon] = useState<Partial<Coupon>>({
    code: '',
    type: 'percentage',
    value: 10,
    minGuests: 0,
    maxUses: 0,
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    enabled: true,
  });

  // Toast
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Check login status
  useEffect(() => {
    const token = sessionStorage.getItem('admin_token');
    if (token) {
      setIsAuthenticated(true);
      fetchBookings();
      fetchBlockedDates();
      fetchSettings();
      fetchReminderStatus();
      fetchReviews();
      fetchInstagramSettings();
      fetchCoupons();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (result.success) {
        sessionStorage.setItem('admin_token', result.token);
        setIsAuthenticated(true);
        fetchBookings();
        fetchBlockedDates();
        fetchSettings();
      } else {
        setLoginError('Incorrect password');
      }
    } catch {
      setLoginError('Login failed, please try again');
    }
    setLoading(false);
  };

  // Logout
  const handleLogout = () => {
    sessionStorage.removeItem('admin_token');
    setIsAuthenticated(false);
    setBookings([]);
  };

  // Fetch bookings
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('admin_token');
      const response = await fetch('/api/admin/bookings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.success) {
        setBookings(result.bookings || []);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      showToast(t('admin.toast.fetchFailed'), 'error');
    }
    setLoading(false);
  }, []);

  // Fetch blocked dates
  const fetchBlockedDates = useCallback(async () => {
    try {
      const response = await fetch('/api/calendar');
      const result = await response.json();
      if (result.success) {
        setBlockedDates(result.blockedDates || []);
      }
    } catch (error) {
      console.error('Failed to fetch blocked dates:', error);
    }
  }, []);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/settings');
      const result = await response.json();
      if (result.success && result.settings) {
        setSettings(result.settings);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  }, []);

  // Save settings
  const saveSettings = async (newSettings: Partial<AppSettings>) => {
    setUpdating(true);
    try {
      const token = sessionStorage.getItem('admin_token');
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newSettings),
      });
      const result = await response.json();
      if (result.success) {
        setSettings(result.settings);
        showToast(t('admin.toast.settingsSaved'));
        refreshGlobalSettings();
      } else {
        showToast(t('admin.toast.saveFailed'), 'error');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      showToast(t('admin.toast.saveFailed'), 'error');
    }
    setUpdating(false);
  };

  // Toggle time slot
  const toggleTimeSlot = (slotId: string) => {
    const newTimeSlots = settings.timeSlots.map((slot) =>
      slot.id === slotId ? { ...slot, enabled: !slot.enabled } : slot
    );
    saveSettings({ timeSlots: newTimeSlots });
  };

  // Update time slot times
  const updateTimeSlotTime = (slotId: string, field: 'startTime' | 'endTime', value: string) => {
    const newTimeSlots = settings.timeSlots.map((slot) =>
      slot.id === slotId ? { ...slot, [field]: value } : slot
    );
    setSettings((prev) => ({ ...prev, timeSlots: newTimeSlots }));
  };

  // Add new time slot
  const addTimeSlot = () => {
    const newSlot: TimeSlot = {
      id: `custom_${Date.now()}`,
      label: 'New slot',
      startTime: '12:00',
      endTime: '14:00',
      enabled: true,
    };
    const newTimeSlots = [...settings.timeSlots, newSlot];
    saveSettings({ timeSlots: newTimeSlots });
  };

  // Delete time slot
  const deleteTimeSlot = (slotId: string) => {
    const newTimeSlots = settings.timeSlots.filter((slot) => slot.id !== slotId);
    saveSettings({ timeSlots: newTimeSlots });
  };

  // Update time slot label
  const updateTimeSlotLabel = (slotId: string, label: string) => {
    const newTimeSlots = settings.timeSlots.map((slot) =>
      slot.id === slotId ? { ...slot, label } : slot
    );
    setSettings((prev) => ({ ...prev, timeSlots: newTimeSlots }));
  };

  // Upload gallery images (uses ImageUploader compression)
  const handleGalleryUploadMultiple = async (images: string[]) => {
    const currentImages = settings.galleryImages || [];
    const maxOrder =
      currentImages.length > 0 ? Math.max(...currentImages.map((img) => img.order)) : 0;

    const newImages: GalleryImage[] = images.map((base64, i) => ({
      id: `img_${Date.now()}_${i}`,
      url: base64,
      caption: '',
      order: maxOrder + i + 1,
    }));

    const updatedImages = [...currentImages, ...newImages];
    await saveSettings({ galleryImages: updatedImages });
    showToast(t('admin.toast.uploadedImages', { count: newImages.length }));
  };

  // Update image caption
  const updateGalleryCaption = (imageId: string, caption: string) => {
    const updatedImages = (settings.galleryImages || []).map((img) =>
      img.id === imageId ? { ...img, caption } : img
    );
    setSettings((prev) => ({ ...prev, galleryImages: updatedImages }));
  };

  // Move image order
  const moveGalleryImage = (imageId: string, direction: 'up' | 'down') => {
    const images = [...(settings.galleryImages || [])].sort((a, b) => a.order - b.order);
    const index = images.findIndex((img) => img.id === imageId);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    // Swap order
    const temp = images[index].order;
    images[index].order = images[targetIndex].order;
    images[targetIndex].order = temp;

    saveSettings({ galleryImages: images });
  };

  // Delete image
  const deleteGalleryImage = (imageId: string) => {
    if (!window.confirm('Are you sure you want to delete this image?')) return;
    const updatedImages = (settings.galleryImages || []).filter((img) => img.id !== imageId);
    saveSettings({ galleryImages: updatedImages });
    showToast(t('admin.toast.imageDeleted'));
  };

  // Fetch reminder status
  const fetchReminderStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/cron/reminders');
      const result = await response.json();
      if (result.success) {
        setReminderStatus((prev) => ({
          ...prev,
          pending: result.pendingReminders || 0,
          reminded: result.alreadyReminded || 0,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch reminder status:', error);
    }
  }, []);

  // Send reminder emails
  const sendReminders = async () => {
    setReminderStatus((prev) => ({ ...prev, loading: true }));
    try {
      const token = sessionStorage.getItem('admin_token');
      const response = await fetch('/api/cron/reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await response.json();
      if (result.success) {
        showToast(t('admin.toast.remindersSent', { count: result.processed }));
        fetchReminderStatus();
      } else {
        showToast(t('admin.toast.sendFailed'), 'error');
      }
    } catch (error) {
      console.error('Failed to send reminders:', error);
      showToast(t('admin.toast.sendFailed'), 'error');
    }
    setReminderStatus((prev) => ({ ...prev, loading: false }));
  };

  // Export bookings as CSV
  const exportBookingsCSV = () => {
    if (bookings.length === 0) {
      showToast(t('admin.toast.noDataExport'), 'error');
      return;
    }

    // CSV headers
    const headers = [
      'ID',
      'Name',
      'Email',
      'Phone',
      'Date',
      'Time',
      'Guests',
      'Package',
      'Adults',
      'Kids',
      'Proteins',
      'Addons',
      'EstTotal',
      'Region',
      'Status',
      'Type',
      'Coupon',
      'Discount',
      'Referral',
      'Message',
      'Created',
    ];

    // CSV content
    const csvContent = [
      headers.join(','),
      ...bookings.map((b) =>
        [
          b.id,
          `"${b.name.replace(/"/g, '""')}"`,
          b.email,
          b.phone,
          b.date,
          b.time,
          b.guestCount,
          `"${(b.orderData?.packageName || '').replace(/"/g, '""')}"`,
          b.orderData?.guestCount ?? '',
          b.orderData?.kidsCount ?? '',
          `"${(b.orderData?.proteins || []).join(', ')}"`,
          `"${(b.orderData?.addons || []).map((a) => `${a.name}x${a.quantity}`).join(', ')}"`,
          b.orderData?.estimatedTotal ?? '',
          b.region,
          b.status,
          b.formType,
          b.couponCode || '',
          b.couponDiscount || '',
          b.referralSource || '',
          `"${(b.message || '').replace(/"/g, '""')}"`,
          b.createdAt,
        ].join(',')
      ),
    ].join('\n');

    // Create download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bookings_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(t('admin.toast.exported', { count: bookings.length }));
  };

  // Copy bookings to clipboard
  const copyBookingsToClipboard = async () => {
    if (bookings.length === 0) {
      showToast(t('admin.toast.noDataCopy'), 'error');
      return;
    }

    const statusMap: Record<string, string> = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };

    const textContent = bookings
      .map(
        (b, i) =>
          `[Booking ${i + 1}]\n` +
          `Name: ${b.name}\n` +
          `Phone: ${b.phone}\n` +
          `Email: ${b.email}\n` +
          `Date: ${b.date}\n` +
          `Time: ${b.time}\n` +
          `Guests: ${b.guestCount}\n` +
          `Region: ${b.region}\n` +
          `Status: ${statusMap[b.status] || b.status}\n` +
          (b.orderData
            ? `Package: ${b.orderData.packageName} (${b.orderData.priceModel})\n` +
              `Adults: ${b.orderData.guestCount}, Kids: ${b.orderData.kidsCount}\n` +
              `Proteins: ${b.orderData.proteins.length > 0 ? b.orderData.proteins.join(', ') : "Chef's Choice"}\n` +
              (b.orderData.addons.length > 0
                ? `Add-ons: ${b.orderData.addons.map((a) => `${a.name} x${a.quantity}`).join(', ')}\n`
                : '') +
              `Est. Total: $${b.orderData.estimatedTotal}\n`
            : '') +
          (b.couponCode ? `Coupon: ${b.couponCode} (${b.couponDiscount})\n` : '') +
          (b.message ? `Message: ${b.message}\n` : '') +
          `Created: ${new Date(b.createdAt).toLocaleString()}`
      )
      .join('\n\n' + '─'.repeat(30) + '\n\n');

    const header = `${globalSettings.brandInfo.name} Booking Export\nExport time: ${new Date().toLocaleString()}\nTotal: ${bookings.length} records\n\n${'═'.repeat(30)}\n\n`;

    try {
      await navigator.clipboard.writeText(header + textContent);
      showToast(t('admin.toast.copied', { count: bookings.length }));
    } catch (error) {
      console.error('Copy failed:', error);
      showToast(t('admin.toast.copyFailed'), 'error');
    }
  };

  // Export bookings as image
  const exportBookingsAsImage = async () => {
    if (bookings.length === 0) {
      showToast(t('admin.toast.noDataExport'), 'error');
      return;
    }

    const statusMap: Record<string, string> = {
      pending: '⏳ Pending',
      confirmed: '✅ Confirmed',
      completed: '🎉 Completed',
      cancelled: '❌ Cancelled',
    };

    // Create canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      showToast(t('admin.toast.browserNotSupported'), 'error');
      return;
    }

    // Calculate dimensions
    const padding = 40;
    const headerHeight = 80;
    const itemPadding = 20;
    const itemHeight = 220;
    const cols = Math.min(2, Math.ceil(bookings.length / 5));
    const rows = Math.ceil(bookings.length / cols);

    canvas.width = Math.max(800, cols * 380 + padding * 2);
    canvas.height = headerHeight + rows * itemHeight + padding * 2;

    // Background
    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#FF6B35';
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.fillText(`🍱 ${globalSettings.brandInfo.name} Booking Data`, padding, padding + 30);

    ctx.fillStyle = '#888';
    ctx.font = '14px system-ui, -apple-system, sans-serif';
    ctx.fillText(
      `Export time: ${new Date().toLocaleString()} | Total ${bookings.length} records`,
      padding,
      padding + 55
    );

    // Draw booking cards
    bookings.forEach((b, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = padding + col * 380;
      const y = headerHeight + padding + row * itemHeight;

      // Card background
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.roundRect(x, y, 360, itemHeight - 20, 8);
      ctx.fill();

      // Card border
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Content
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.fillText(`${b.name}`, x + itemPadding, y + 30);

      ctx.fillStyle = '#FF6B35';
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      ctx.fillText(statusMap[b.status] || b.status, x + 280, y + 30);

      ctx.fillStyle = '#aaa';
      ctx.font = '13px system-ui, -apple-system, sans-serif';
      const lines = [
        `📞 ${b.phone}`,
        `📧 ${b.email}`,
        `📅 ${b.date} ${b.time}`,
        `👥 ${b.guestCount} guests | 📍 ${b.region}`,
        b.couponCode ? `🎫 ${b.couponCode}` : '',
      ].filter(Boolean);

      lines.forEach((line, li) => {
        ctx.fillText(line, x + itemPadding, y + 60 + li * 26);
      });
    });

    // Download
    canvas.toBlob((blob) => {
      if (!blob) {
        showToast(t('admin.toast.imageGenFailed'), 'error');
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `bookings_${new Date().toISOString().split('T')[0]}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      showToast(t('admin.toast.imageSaved', { count: bookings.length }));
    }, 'image/png');
  };

  // Fetch reviews
  const fetchReviews = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('admin_token');
      const response = await fetch('/api/reviews', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.success) {
        setReviews(result.reviews || []);
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    }
  }, []);

  // Add review
  const addReview = async (reviewData: Omit<Review, 'id' | 'createdAt'>) => {
    try {
      const token = sessionStorage.getItem('admin_token');
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(reviewData),
      });
      const result = await response.json();
      if (result.success) {
        showToast(t('admin.toast.reviewAdded'));
        fetchReviews();
        return true;
      }
    } catch (error) {
      console.error('Failed to add review:', error);
    }
    showToast(t('admin.toast.addFailed'), 'error');
    return false;
  };

  // Toggle review visibility
  const toggleReviewVisibility = async (id: string, visible: boolean) => {
    try {
      const token = sessionStorage.getItem('admin_token');
      const response = await fetch('/api/reviews', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, visible }),
      });
      const result = await response.json();
      if (result.success) {
        setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, visible } : r)));
        showToast(visible ? t('admin.toast.reviewShown') : t('admin.toast.reviewHidden'));
      }
    } catch (error) {
      console.error('Failed to toggle review:', error);
      showToast(t('admin.toast.operationFailed'), 'error');
    }
  };

  // Delete review
  const deleteReview = async (id: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;
    try {
      const token = sessionStorage.getItem('admin_token');
      const response = await fetch('/api/reviews', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (result.success) {
        setReviews((prev) => prev.filter((r) => r.id !== id));
        showToast(t('admin.toast.reviewDeleted'));
      }
    } catch (error) {
      console.error('Failed to delete review:', error);
      showToast(t('admin.toast.deleteFailed'), 'error');
    }
  };

  // Fetch Instagram settings
  const fetchInstagramSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/instagram');
      const result = await response.json();
      if (result.success && result.settings) {
        setInstagramSettings(result.settings);
      }
    } catch (error) {
      console.error('Failed to fetch Instagram settings:', error);
    }
  }, []);

  // Save Instagram handle
  const saveInstagramHandle = async (handle: string) => {
    try {
      const token = sessionStorage.getItem('admin_token');
      const response = await fetch('/api/instagram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ handle }),
      });
      const result = await response.json();
      if (result.success) {
        setInstagramSettings(result.settings);
        showToast(t('admin.toast.accountUpdated'));
      }
    } catch (error) {
      console.error('Failed to save Instagram handle:', error);
      showToast(t('admin.toast.saveFailed'), 'error');
    }
  };

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showToast(t('admin.toast.imageMaxSize'), 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setNewPostImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Add new post
  const addInstagramPost = async () => {
    if (!newPostImage || !newPostLink.trim()) {
      showToast(t('admin.toast.uploadImageAndLink'), 'error');
      return;
    }

    setInstagramLoading(true);
    try {
      const token = sessionStorage.getItem('admin_token');
      const response = await fetch('/api/instagram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'add',
          post: {
            image: newPostImage,
            link: newPostLink.trim(),
          },
        }),
      });
      const result = await response.json();
      if (result.success) {
        setInstagramSettings(result.settings);
        setNewPostImage(null);
        setNewPostLink('');
        showToast(t('admin.toast.postAdded'));
      } else {
        showToast(t('admin.toast.addFailed'), 'error');
      }
    } catch (error) {
      console.error('Failed to add Instagram post:', error);
      showToast(t('admin.toast.addFailed'), 'error');
    }
    setInstagramLoading(false);
  };

  // Delete post
  const deleteInstagramPost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    setInstagramLoading(true);
    try {
      const token = sessionStorage.getItem('admin_token');
      const response = await fetch('/api/instagram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'delete',
          postId,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setInstagramSettings(result.settings);
        showToast(t('admin.toast.postDeleted'));
      } else {
        showToast(t('admin.toast.deleteFailed'), 'error');
      }
    } catch (error) {
      console.error('Failed to delete Instagram post:', error);
      showToast(t('admin.toast.deleteFailed'), 'error');
    }
    setInstagramLoading(false);
  };

  // Reorder posts
  const moveInstagramPost = async (postId: string, direction: 'up' | 'down') => {
    const posts = [...instagramSettings.posts];
    const index = posts.findIndex((p) => p.id === postId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= posts.length) return;

    // Swap positions
    [posts[index], posts[newIndex]] = [posts[newIndex], posts[index]];

    try {
      const token = sessionStorage.getItem('admin_token');
      const response = await fetch('/api/instagram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ posts }),
      });
      const result = await response.json();
      if (result.success) {
        setInstagramSettings(result.settings);
      }
    } catch (error) {
      console.error('Failed to reorder posts:', error);
    }
  };

  // Fetch coupons
  const fetchCoupons = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('admin_token');
      const response = await fetch('/api/coupons', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.success) {
        setCoupons(result.coupons || []);
      }
    } catch (error) {
      console.error('Failed to fetch coupons:', error);
    }
  }, []);

  // Create coupon
  const createCoupon = async () => {
    if (!newCoupon.code) {
      showToast(t('admin.toast.enterCouponCode'), 'error');
      return;
    }
    try {
      const token = sessionStorage.getItem('admin_token');
      const response = await fetch('/api/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newCoupon),
      });
      const result = await response.json();
      if (result.success) {
        showToast(t('admin.toast.couponCreated'));
        fetchCoupons();
        setShowCouponForm(false);
        setNewCoupon({
          code: '',
          type: 'percentage',
          value: 10,
          minGuests: 0,
          maxUses: 0,
          validFrom: new Date().toISOString().split('T')[0],
          validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          enabled: true,
        });
      } else {
        showToast(result.error || t('admin.toast.createFailed'), 'error');
      }
    } catch (error) {
      console.error('Failed to create coupon:', error);
      showToast(t('admin.toast.createFailed'), 'error');
    }
  };

  // Toggle coupon status
  const toggleCoupon = async (id: string, enabled: boolean) => {
    try {
      const token = sessionStorage.getItem('admin_token');
      const response = await fetch('/api/coupons', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, enabled }),
      });
      const result = await response.json();
      if (result.success) {
        setCoupons((prev) => prev.map((c) => (c.id === id ? { ...c, enabled } : c)));
        showToast(enabled ? t('admin.toast.couponEnabled') : t('admin.toast.couponDisabled'));
      }
    } catch (error) {
      console.error('Failed to toggle coupon:', error);
    }
  };

  // Delete coupon
  const deleteCoupon = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      const token = sessionStorage.getItem('admin_token');
      const response = await fetch('/api/coupons', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (result.success) {
        setCoupons((prev) => prev.filter((c) => c.id !== id));
        showToast(t('admin.toast.couponDeleted'));
      }
    } catch (error) {
      console.error('Failed to delete coupon:', error);
    }
  };

  // Compute referral stats
  const referralStats = useMemo(() => {
    const stats: Record<string, number> = {};
    bookings.forEach((b) => {
      const source = b.referralSource || 'Direct visit';
      stats[source] = (stats[source] || 0) + 1;
    });
    return Object.entries(stats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [bookings]);

  // Update status
  const updateBookingStatus = async (id: string, status: Booking['status']) => {
    setUpdating(true);
    try {
      const token = sessionStorage.getItem('admin_token');
      const response = await fetch('/api/admin/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, status }),
      });
      const result = await response.json();
      if (result.success) {
        setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
        if (selectedBooking?.id === id) setSelectedBooking({ ...selectedBooking, status });
        showToast(t('admin.toast.statusUpdated'));
      }
    } catch {
      showToast(t('admin.toast.updateFailed'), 'error');
    }
    setUpdating(false);
  };

  // Delete booking
  const deleteBooking = async (id: string) => {
    setUpdating(true);
    try {
      const token = sessionStorage.getItem('admin_token');
      const response = await fetch('/api/admin/bookings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (result.success) {
        setBookings((prev) => prev.filter((b) => b.id !== id));
        setSelectedBooking(null);
        setShowDeleteConfirm(false);
        showToast(t('admin.toast.deleteSuccessful'));
      }
    } catch {
      showToast(t('admin.toast.deleteFailed'), 'error');
    }
    setUpdating(false);
  };

  // Date management
  const addBlockedDate = async (date: string, reason?: string) => {
    setUpdating(true);
    try {
      const token = sessionStorage.getItem('admin_token');
      const response = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date, reason }),
      });
      const result = await response.json();
      if (result.success) {
        setBlockedDates(result.blockedDates || []);
        setSelectedCalendarDate(null);
        setBlockReason('');
        showToast(t('admin.toast.dateClosed'));
      }
    } catch {
      showToast(t('admin.toast.operationFailed'), 'error');
    }
    setUpdating(false);
  };

  const removeBlockedDate = async (date: string) => {
    setUpdating(true);
    try {
      const token = sessionStorage.getItem('admin_token');
      const response = await fetch('/api/calendar', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date }),
      });
      const result = await response.json();
      if (result.success) {
        setBlockedDates(result.blockedDates || []);
        showToast(t('admin.toast.dateOpened'));
      }
    } catch {
      showToast(t('admin.toast.operationFailed'), 'error');
    }
    setUpdating(false);
  };

  // Stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    return {
      total: bookings.length,
      pending: bookings.filter((b) => b.status === 'pending').length,
      confirmed: bookings.filter((b) => b.status === 'confirmed').length,
      completed: bookings.filter((b) => b.status === 'completed').length,
      cancelled: bookings.filter((b) => b.status === 'cancelled').length,
      today: bookings.filter((b) => b.date === today && b.status !== 'cancelled').length,
      thisWeek: bookings.filter((b) => {
        const d = new Date(b.date);
        return d >= weekStart && d <= weekEnd && b.status !== 'cancelled';
      }).length,
      totalGuests: bookings
        .filter((b) => b.status !== 'cancelled')
        .reduce((sum, b) => sum + b.guestCount, 0),
    };
  }, [bookings]);

  // Filter bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchStatus = statusFilter === 'all' || b.status === statusFilter;
      const matchSearch =
        !searchQuery ||
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.phone.includes(searchQuery);
      return matchStatus && matchSearch;
    });
  }, [bookings, statusFilter, searchQuery]);

  // Calendar helpers
  const getDaysInMonth = (): (number | null)[] => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const formatCalendarDate = (day: number): string => {
    const year = calendarMonth.getFullYear();
    const month = String(calendarMonth.getMonth() + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${month}-${d}`;
  };

  const isDateBlocked = (day: number): boolean =>
    blockedDates.some((b) => b.date === formatCalendarDate(day));
  const getDateBookings = (day: number): Booking[] =>
    bookings.filter((b) => b.date === formatCalendarDate(day) && b.status !== 'cancelled');
  const isPastDate = (day: number): boolean => {
    const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    return date < todayDate;
  };

  // Formatting
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        weekday: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  const formatCreatedAt = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 60) return `${diffMins} min ago`;
      const diffHours = Math.floor(diffMs / 3600000);
      if (diffHours < 24) return `${diffHours} hrs ago`;
      const diffDays = Math.floor(diffMs / 86400000);
      if (diffDays < 7) return `${diffDays} days ago`;
      return date.toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => showToast(t('admin.toast.clipboardCopied'), 'info'));
  };

  // Status config
  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: 'Pending', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
    confirmed: { label: 'Confirmed', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' },
    completed: { label: 'Completed', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
    cancelled: { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
  };

  // Menu config
  const menuItems = [
    { key: 'dashboard', icon: '📊', label: 'Dashboard' },
    { key: 'bookings', icon: '📋', label: 'Booking Management' },
    { key: 'calendar', icon: '📅', label: 'Calendar Management' },
    { key: 'reviews', icon: '⭐', label: 'Review Management' },
    { key: 'coupons', icon: '🎟️', label: 'Coupons' },
    { key: 'gallery', icon: '🖼️', label: 'Gallery' },
    { key: 'menu', icon: '🍽️', label: 'Menu' },
    { key: 'instagram', icon: '📸', label: 'Instagram' },
    { key: 'settings', icon: '⚙️', label: 'Settings' },
  ];

  // ========== Login page ==========
  if (!isAuthenticated) {
    return (
      <div className="admin-login-page">
        <SEO title="Admin Login" />
        <div className="login-container">
          <div className="login-brand">
            <span className="brand-icon">🍱</span>
            <h1>{globalSettings.brandInfo.name}</h1>
            <p>Admin Dashboard</p>
          </div>
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                autoFocus
              />
            </div>
            {loginError && <div className="form-error">{loginError}</div>}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          <div className="login-footer">
            <p>Contact support: {globalSettings.contactInfo.phone}</p>
          </div>
        </div>
      </div>
    );
  }

  // ========== Main layout ==========
  return (
    <div className="admin-layout">
      <SEO title="Admin Dashboard" />

      {/* Toast */}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-logo">🍱</span>
          {!sidebarCollapsed && (
            <span className="sidebar-title">{globalSettings.brandInfo.name}</span>
          )}
          <button className="sidebar-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.key}
              className={`nav-item ${activeMenu === item.key ? 'active' : ''}`}
              onClick={() => {
                setActiveMenu(item.key as MenuType);
                setSelectedBooking(null);
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              {!sidebarCollapsed && <span className="nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="nav-item logout" onClick={handleLogout}>
            <span className="nav-icon">🚪</span>
            {!sidebarCollapsed && <span className="nav-label">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        {/* Top bar */}
        <header className="topbar">
          <div className="topbar-left">
            <h1 className="page-title">
              {menuItems.find((m) => m.key === activeMenu)?.icon}{' '}
              {menuItems.find((m) => m.key === activeMenu)?.label}
            </h1>
          </div>
          <div className="topbar-right">
            <button className="btn-icon" onClick={fetchBookings} disabled={loading}>
              {loading ? '⏳' : '🔄'}
            </button>
            <div className="user-info">
              <span className="user-avatar">👤</span>
              <span className="user-name">Admin</span>
            </div>
          </div>
        </header>

        {/* Content area */}
        <div className="content-area">
          {/* ========== Dashboard ========== */}
          {activeMenu === 'dashboard' && (
            <div className="dashboard">
              {/* Stats cards */}
              <div className="stats-grid">
                <div className="stat-card highlight">
                  <div className="stat-icon">📆</div>
                  <div className="stat-info">
                    <span className="stat-value">{stats.today}</span>
                    <span className="stat-label">Today</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📊</div>
                  <div className="stat-info">
                    <span className="stat-value">{stats.thisWeek}</span>
                    <span className="stat-label">This Week</span>
                  </div>
                </div>
                <div className="stat-card warning">
                  <div className="stat-icon">⏳</div>
                  <div className="stat-info">
                    <span className="stat-value">{stats.pending}</span>
                    <span className="stat-label">Pending</span>
                  </div>
                </div>
                <div className="stat-card success">
                  <div className="stat-icon">✓</div>
                  <div className="stat-info">
                    <span className="stat-value">{stats.confirmed}</span>
                    <span className="stat-label">Confirmed</span>
                  </div>
                </div>
                <div className="stat-card info">
                  <div className="stat-icon">✓✓</div>
                  <div className="stat-info">
                    <span className="stat-value">{stats.completed}</span>
                    <span className="stat-label">Completed</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">👥</div>
                  <div className="stat-info">
                    <span className="stat-value">{stats.totalGuests}</span>
                    <span className="stat-label">Total Guests</span>
                  </div>
                </div>
              </div>

              {/* Recent bookings */}
              <div className="card">
                <div className="card-header">
                  <h2>Recent Bookings</h2>
                  <button className="btn-text" onClick={() => setActiveMenu('bookings')}>
                    View all →
                  </button>
                </div>
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Date</th>
                        <th>Guests</th>
                        <th>Region</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.slice(0, 5).map((booking) => (
                        <tr key={booking.id}>
                          <td>
                            <div className="cell-main">{booking.name}</div>
                            <div className="cell-sub">{booking.phone}</div>
                          </td>
                          <td>{formatDate(booking.date)}</td>
                          <td>
                            <strong>{booking.guestCount}</strong>
                          </td>
                          <td>
                            <span className="tag">{booking.region.toUpperCase()}</span>
                          </td>
                          <td>
                            <span
                              className="status-badge"
                              style={{
                                color: statusConfig[booking.status].color,
                                background: statusConfig[booking.status].bg,
                              }}
                            >
                              {statusConfig[booking.status].label}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn-sm"
                              onClick={() => {
                                setActiveMenu('bookings');
                                setSelectedBooking(booking);
                              }}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========== Booking Management ========== */}
          {activeMenu === 'bookings' && !selectedBooking && (
            <div className="bookings-page">
              {/* Toolbar */}
              <div className="toolbar">
                <div className="search-box">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Search name, phone, email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="filter-group">
                  {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as StatusType[]).map(
                    (status) => (
                      <button
                        key={status}
                        className={`filter-btn ${statusFilter === status ? 'active' : ''}`}
                        onClick={() => setStatusFilter(status)}
                      >
                        {status === 'all' ? 'All' : statusConfig[status].label}
                        <span className="filter-count">
                          {status === 'all'
                            ? bookings.length
                            : bookings.filter((b) => b.status === status).length}
                        </span>
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Booking list */}
              <div className="card">
                {loading ? (
                  <div className="loading-state">
                    <div className="spinner" />
                    <p>Loading...</p>
                  </div>
                ) : filteredBookings.length === 0 ? (
                  <div className="empty-state">
                    <span>📭</span>
                    <p>No bookings yet</p>
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Customer</th>
                          <th>Contact</th>
                          <th>Date</th>
                          <th>Guests</th>
                          <th>Package</th>
                          <th>Region</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th>Submitted</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBookings.map((booking) => (
                          <tr
                            key={booking.id}
                            className={
                              booking.date === new Date().toISOString().split('T')[0]
                                ? 'row-highlight'
                                : ''
                            }
                          >
                            <td>
                              <div className="cell-main">{booking.name}</div>
                            </td>
                            <td>
                              <div className="cell-main">{booking.phone}</div>
                              <div className="cell-sub">{booking.email}</div>
                            </td>
                            <td>
                              <div className="cell-main">{formatDate(booking.date)}</div>
                              <div className="cell-sub">{booking.time || 'TBD'}</div>
                            </td>
                            <td>
                              <strong>{booking.guestCount}</strong>
                            </td>
                            <td className="cell-muted">{booking.orderData?.packageName || '—'}</td>
                            <td>
                              <span className="tag">{booking.region.toUpperCase()}</span>
                            </td>
                            <td>
                              <span className={`type-badge ${booking.formType}`}>
                                {booking.formType === 'booking' ? 'Booking' : 'Estimate'}
                              </span>
                            </td>
                            <td>
                              <span
                                className="status-badge"
                                style={{
                                  color: statusConfig[booking.status].color,
                                  background: statusConfig[booking.status].bg,
                                }}
                              >
                                {statusConfig[booking.status].label}
                              </span>
                            </td>
                            <td className="cell-muted">{formatCreatedAt(booking.createdAt)}</td>
                            <td>
                              <button
                                className="btn-sm"
                                onClick={() => setSelectedBooking(booking)}
                              >
                                Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========== Booking Detail ========== */}
          {activeMenu === 'bookings' && selectedBooking && (
            <div className="booking-detail">
              {/* Delete confirm */}
              {showDeleteConfirm && (
                <div className="modal-overlay">
                  <div className="modal">
                    <h3>⚠️ Confirm Delete</h3>
                    <p>
                      Are you sure you want to delete <strong>{selectedBooking.name}</strong>&apos;s
                      booking?
                    </p>
                    <p className="text-danger">This action cannot be undone</p>
                    <div className="modal-actions">
                      <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                        Cancel
                      </button>
                      <button
                        className="btn-danger"
                        onClick={() => deleteBooking(selectedBooking.id)}
                        disabled={updating}
                      >
                        {updating ? 'Deleting...' : 'Confirm delete'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Back button */}
              <button className="btn-back" onClick={() => setSelectedBooking(null)}>
                ← Back to list
              </button>

              <div className="detail-grid">
                {/* Customer info card */}
                <div className="card">
                  <div className="card-header">
                    <h2>Customer Info</h2>
                    <span
                      className="status-badge"
                      style={{
                        color: statusConfig[selectedBooking.status].color,
                        background: statusConfig[selectedBooking.status].bg,
                      }}
                    >
                      {statusConfig[selectedBooking.status].label}
                    </span>
                  </div>
                  <div className="detail-info">
                    <div className="info-row">
                      <span className="info-label">Name</span>
                      <span className="info-value">{selectedBooking.name}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Phone</span>
                      <span className="info-value">
                        {selectedBooking.phone}
                        <button
                          className="btn-icon-sm"
                          onClick={() => copyToClipboard(selectedBooking.phone)}
                        >
                          📋
                        </button>
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Email</span>
                      <span className="info-value">
                        {selectedBooking.email}
                        <button
                          className="btn-icon-sm"
                          onClick={() => copyToClipboard(selectedBooking.email)}
                        >
                          📋
                        </button>
                      </span>
                    </div>
                  </div>
                  <div className="quick-actions">
                    <a href={`tel:${selectedBooking.phone}`} className="btn-action call">
                      📞 Call
                    </a>
                    <a href={`sms:${selectedBooking.phone}`} className="btn-action sms">
                      💬 SMS
                    </a>
                    <a href={`mailto:${selectedBooking.email}`} className="btn-action email">
                      📧 Email
                    </a>
                  </div>
                </div>

                {/* Booking detail card */}
                <div className="card">
                  <div className="card-header">
                    <h2>Booking Details</h2>
                    <span className={`type-badge ${selectedBooking.formType}`}>
                      {selectedBooking.formType === 'booking'
                        ? '🎉 Booking Request'
                        : '📋 Estimate Request'}
                    </span>
                  </div>
                  <div className="detail-info">
                    <div className="info-row">
                      <span className="info-label">Date</span>
                      <span className="info-value highlight">
                        {formatDate(selectedBooking.date)}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Time</span>
                      <span className="info-value">{selectedBooking.time || 'TBD'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Guests</span>
                      <span className="info-value highlight">{selectedBooking.guestCount}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Region</span>
                      <span className="info-value">{selectedBooking.region.toUpperCase()}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Submitted</span>
                      <span className="info-value muted">
                        {formatCreatedAt(selectedBooking.createdAt)}
                      </span>
                    </div>
                  </div>
                  {selectedBooking.message && (
                    <div className="message-section">
                      <h4>Customer Notes</h4>
                      <div className="message-content">{selectedBooking.message}</div>
                    </div>
                  )}
                </div>

                {/* Order details card */}
                {selectedBooking.orderData && (
                  <div className="card">
                    <div className="card-header">
                      <h2>Order Details</h2>
                    </div>
                    <div className="detail-info">
                      <div className="info-row">
                        <span className="info-label">Package</span>
                        <span className="info-value highlight">
                          {selectedBooking.orderData.packageName} (
                          {selectedBooking.orderData.priceModel})
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Guests</span>
                        <span className="info-value">
                          {selectedBooking.orderData.guestCount} adults
                          {selectedBooking.orderData.kidsCount > 0
                            ? ` + ${selectedBooking.orderData.kidsCount} kids`
                            : ''}
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Service</span>
                        <span className="info-value">
                          {selectedBooking.orderData.serviceType},{' '}
                          {selectedBooking.orderData.serviceDuration} min
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Proteins</span>
                        <span className="info-value">
                          {selectedBooking.orderData.proteins.length > 0
                            ? selectedBooking.orderData.proteins.join(', ')
                            : "Chef's Choice"}
                        </span>
                      </div>
                      {selectedBooking.orderData.addons.length > 0 && (
                        <div className="info-row">
                          <span className="info-label">Add-ons</span>
                          <span className="info-value">
                            {selectedBooking.orderData.addons
                              .map((a) => `${a.name} x${a.quantity} ($${a.unitPrice})`)
                              .join(', ')}
                          </span>
                        </div>
                      )}
                      <div className="info-row">
                        <span className="info-label">Est. Total</span>
                        <span className="info-value highlight" style={{ fontSize: '1.2em' }}>
                          ${selectedBooking.orderData.estimatedTotal.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Status management card */}
                <div className="card">
                  <div className="card-header">
                    <h2>Status Management</h2>
                  </div>
                  <div className="status-actions">
                    {(['pending', 'confirmed', 'completed', 'cancelled'] as const).map((status) => (
                      <button
                        key={status}
                        className={`status-btn ${selectedBooking.status === status ? 'active' : ''}`}
                        style={{
                          borderColor: statusConfig[status].color,
                          background:
                            selectedBooking.status === status
                              ? statusConfig[status].bg
                              : 'transparent',
                          color: statusConfig[status].color,
                        }}
                        onClick={() => updateBookingStatus(selectedBooking.id, status)}
                        disabled={selectedBooking.status === status || updating}
                      >
                        {statusConfig[status].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Danger zone */}
                <div className="card danger">
                  <div className="card-header">
                    <h2>Danger Zone</h2>
                  </div>
                  <button className="btn-danger-outline" onClick={() => setShowDeleteConfirm(true)}>
                    🗑️ Delete this booking
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========== Calendar ========== */}
          {activeMenu === 'calendar' && (
            <div className="calendar-page">
              <div className="calendar-grid">
                {/* Calendar */}
                <div className="card">
                  <div className="card-header">
                    <button
                      className="btn-icon"
                      onClick={() =>
                        setCalendarMonth(
                          new Date(calendarMonth.setMonth(calendarMonth.getMonth() - 1))
                        )
                      }
                    >
                      ◀
                    </button>
                    <h2>
                      {calendarMonth.toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                      })}
                    </h2>
                    <button
                      className="btn-icon"
                      onClick={() =>
                        setCalendarMonth(
                          new Date(calendarMonth.setMonth(calendarMonth.getMonth() + 1))
                        )
                      }
                    >
                      ▶
                    </button>
                  </div>
                  <div className="calendar-widget">
                    <div className="calendar-weekdays">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                        <div key={d} className="weekday">
                          {d}
                        </div>
                      ))}
                    </div>
                    <div className="calendar-days">
                      {getDaysInMonth().map((day, i) => {
                        if (day === null) return <div key={`e-${i}`} className="day empty" />;
                        const dateStr = formatCalendarDate(day);
                        const isBlocked = isDateBlocked(day);
                        const dayBookings = getDateBookings(day);
                        const isPast = isPastDate(day);
                        const isSelected = selectedCalendarDate === dateStr;
                        return (
                          <button
                            key={day}
                            className={`day ${isPast ? 'past' : ''} ${isBlocked ? 'blocked' : ''} ${isSelected ? 'selected' : ''}`}
                            onClick={() =>
                              !isPast && setSelectedCalendarDate(isSelected ? null : dateStr)
                            }
                            disabled={isPast}
                          >
                            <span className="day-num">{day}</span>
                            {dayBookings.length > 0 && (
                              <span className="day-count">{dayBookings.length}</span>
                            )}
                            {isBlocked && <span className="day-blocked">🚫</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="calendar-legend">
                    <div className="legend-item">
                      <span className="legend-dot available" /> Available
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot blocked" /> Blocked
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot booked" /> Has bookings
                    </div>
                  </div>
                </div>

                {/* Date detail */}
                <div className="card">
                  {selectedCalendarDate ? (
                    <>
                      <div className="card-header">
                        <h2>{formatDate(selectedCalendarDate)}</h2>
                      </div>
                      {isDateBlocked(parseInt(selectedCalendarDate.split('-')[2])) ? (
                        <div className="date-action">
                          <p className="status-text blocked">🚫 This date is blocked</p>
                          <button
                            className="btn-success"
                            onClick={() => removeBlockedDate(selectedCalendarDate)}
                            disabled={updating}
                          >
                            {updating ? 'Processing...' : 'Open this date'}
                          </button>
                        </div>
                      ) : (
                        <div className="date-action">
                          <p className="status-text open">✓ This date is available</p>
                          <input
                            type="text"
                            placeholder="Block reason (optional)"
                            value={blockReason}
                            onChange={(e) => setBlockReason(e.target.value)}
                            className="input"
                          />
                          <button
                            className="btn-danger"
                            onClick={() => addBlockedDate(selectedCalendarDate, blockReason)}
                            disabled={updating}
                          >
                            {updating ? 'Processing...' : 'Block this date'}
                          </button>
                        </div>
                      )}
                      {getDateBookings(parseInt(selectedCalendarDate.split('-')[2])).length > 0 && (
                        <div className="date-bookings">
                          <h4>Bookings for this date</h4>
                          {getDateBookings(parseInt(selectedCalendarDate.split('-')[2])).map(
                            (b) => (
                              <div
                                key={b.id}
                                className="mini-booking"
                                onClick={() => {
                                  setActiveMenu('bookings');
                                  setSelectedBooking(b);
                                }}
                              >
                                <span>{b.name}</span>
                                <span>{b.guestCount} guests</span>
                                <span style={{ color: statusConfig[b.status].color }}>
                                  {statusConfig[b.status].label}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="empty-state">
                      <p>Select a date to view details</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Blocked dates list */}
              <div className="card">
                <div className="card-header">
                  <h2>🚫 Blocked Dates ({blockedDates.length})</h2>
                </div>
                {blockedDates.length === 0 ? (
                  <div className="empty-state">
                    <p>No blocked dates</p>
                  </div>
                ) : (
                  <div className="blocked-list">
                    {blockedDates
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map((blocked) => (
                        <div key={blocked.date} className="blocked-item">
                          <div className="blocked-info">
                            <span className="blocked-date">{formatDate(blocked.date)}</span>
                            {blocked.reason && (
                              <span className="blocked-reason">{blocked.reason}</span>
                            )}
                          </div>
                          <button
                            className="btn-sm-success"
                            onClick={() => removeBlockedDate(blocked.date)}
                          >
                            Open
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========== Reviews ========== */}
          {activeMenu === 'reviews' && (
            <div className="reviews-page">
              {/* Add review */}
              <div className="card">
                <div className="card-header">
                  <h2>➕ Add New Review</h2>
                </div>
                <form
                  className="add-review-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const formData = new FormData(form);
                    const success = await addReview({
                      name: formData.get('name') as string,
                      location: formData.get('location') as string,
                      rating: parseInt(formData.get('rating') as string) || 5,
                      review: formData.get('review') as string,
                      event: formData.get('event') as string,
                      visible: true,
                    });
                    if (success) form.reset();
                  }}
                >
                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Customer Name *</label>
                      <input name="name" required placeholder="e.g. Sarah M." />
                    </div>
                    <div className="form-group">
                      <label>Location</label>
                      <input name="location" placeholder="e.g. Los Angeles, CA" />
                    </div>
                  </div>
                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Rating *</label>
                      <select name="rating" defaultValue="5">
                        <option value="5">⭐⭐⭐⭐⭐ (5 stars)</option>
                        <option value="4">⭐⭐⭐⭐ (4 stars)</option>
                        <option value="3">⭐⭐⭐ (3 stars)</option>
                        <option value="2">⭐⭐ (2 stars)</option>
                        <option value="1">⭐ (1 star)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Event Type</label>
                      <input name="event" placeholder="e.g. Birthday Party" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Review Content *</label>
                    <textarea
                      name="review"
                      required
                      rows={3}
                      placeholder="Customer review content..."
                    />
                  </div>
                  <button type="submit" className="btn-primary">
                    Add Review
                  </button>
                </form>
              </div>

              {/* Review list */}
              <div className="card">
                <div className="card-header">
                  <h2>📝 Reviews ({reviews.length})</h2>
                </div>
                {reviews.length === 0 ? (
                  <div className="empty-state">
                    <span>⭐</span>
                    <p>No reviews yet</p>
                  </div>
                ) : (
                  <div className="reviews-list">
                    {reviews.map((review) => (
                      <div
                        key={review.id}
                        className={`review-item ${!review.visible ? 'hidden' : ''}`}
                      >
                        <div className="review-header">
                          <div className="review-info">
                            <span className="review-name">{review.name}</span>
                            {review.location && (
                              <span className="review-location">{review.location}</span>
                            )}
                          </div>
                          <div className="review-rating">{'⭐'.repeat(review.rating)}</div>
                        </div>
                        <p className="review-text">{review.review}</p>
                        <div className="review-footer">
                          {review.event && <span className="review-event">📌 {review.event}</span>}
                          <span className="review-date">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="review-actions">
                          <button
                            className={`btn-sm ${review.visible ? '' : 'btn-sm-success'}`}
                            onClick={() => toggleReviewVisibility(review.id, !review.visible)}
                          >
                            {review.visible ? '👁️ Hide' : '👁️ Show'}
                          </button>
                          <button
                            className="btn-sm"
                            onClick={() => deleteReview(review.id)}
                            style={{ color: 'var(--admin-danger)' }}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========== Coupons ========== */}
          {activeMenu === 'coupons' && (
            <div className="coupons-page">
              {/* Create coupon */}
              <div className="card">
                <div className="card-header">
                  <h2>🎟️ Coupon Management</h2>
                  <button
                    className="btn-primary"
                    onClick={() => setShowCouponForm(!showCouponForm)}
                  >
                    {showCouponForm ? 'Cancel' : '+ New Coupon'}
                  </button>
                </div>

                {showCouponForm && (
                  <div className="coupon-form">
                    <div className="form-row-2">
                      <div className="form-group">
                        <label>Coupon Code *</label>
                        <input
                          type="text"
                          value={newCoupon.code || ''}
                          onChange={(e) =>
                            setNewCoupon((prev) => ({
                              ...prev,
                              code: e.target.value.toUpperCase(),
                            }))
                          }
                          placeholder="e.g. HAPPY10"
                          style={{ textTransform: 'uppercase' }}
                        />
                      </div>
                      <div className="form-group">
                        <label>Discount Type</label>
                        <select
                          value={newCoupon.type}
                          onChange={(e) =>
                            setNewCoupon((prev) => ({
                              ...prev,
                              type: e.target.value as 'percentage' | 'fixed',
                            }))
                          }
                        >
                          <option value="percentage">Percentage</option>
                          <option value="fixed">Fixed amount</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-row-2">
                      <div className="form-group">
                        <label>Discount Value *</label>
                        <div className="input-with-suffix">
                          <input
                            type="number"
                            value={newCoupon.value || 0}
                            onChange={(e) =>
                              setNewCoupon((prev) => ({
                                ...prev,
                                value: parseInt(e.target.value) || 0,
                              }))
                            }
                            min="0"
                          />
                          <span>{newCoupon.type === 'percentage' ? '%' : '$'}</span>
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Min Guests</label>
                        <input
                          type="number"
                          value={newCoupon.minGuests || 0}
                          onChange={(e) =>
                            setNewCoupon((prev) => ({
                              ...prev,
                              minGuests: parseInt(e.target.value) || 0,
                            }))
                          }
                          min="0"
                          placeholder="0 = no limit"
                        />
                      </div>
                    </div>
                    <div className="form-row-2">
                      <div className="form-group">
                        <label>Max Uses</label>
                        <input
                          type="number"
                          value={newCoupon.maxUses || 0}
                          onChange={(e) =>
                            setNewCoupon((prev) => ({
                              ...prev,
                              maxUses: parseInt(e.target.value) || 0,
                            }))
                          }
                          min="0"
                          placeholder="0 = no limit"
                        />
                      </div>
                      <div className="form-group">
                        <label>Validity</label>
                        <div className="date-range">
                          <input
                            type="date"
                            value={newCoupon.validFrom || ''}
                            onChange={(e) =>
                              setNewCoupon((prev) => ({ ...prev, validFrom: e.target.value }))
                            }
                          />
                          <span>to</span>
                          <input
                            type="date"
                            value={newCoupon.validUntil || ''}
                            onChange={(e) =>
                              setNewCoupon((prev) => ({ ...prev, validUntil: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <button className="btn-primary" onClick={createCoupon}>
                      Create Coupon
                    </button>
                  </div>
                )}

                {/* Coupon list */}
                {coupons.length === 0 ? (
                  <div className="empty-state">
                    <span>🎟️</span>
                    <p>No coupons yet</p>
                  </div>
                ) : (
                  <div className="coupons-list">
                    {coupons.map((coupon) => {
                      const isExpired = new Date(coupon.validUntil + 'T23:59:59') < new Date();
                      const isMaxed = coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses;

                      return (
                        <div
                          key={coupon.id}
                          className={`coupon-item ${!coupon.enabled || isExpired || isMaxed ? 'disabled' : ''}`}
                        >
                          <div className="coupon-main">
                            <div className="coupon-code">{coupon.code}</div>
                            <div className="coupon-value">
                              {coupon.type === 'percentage'
                                ? `${coupon.value}% OFF`
                                : `$${coupon.value} OFF`}
                            </div>
                          </div>
                          <div className="coupon-details">
                            <span>👥 Min {coupon.minGuests || '∞'} guests</span>
                            <span>
                              🎯 Used {coupon.usedCount}/{coupon.maxUses || '∞'}
                            </span>
                            <span>
                              📅 {coupon.validFrom} ~ {coupon.validUntil}
                            </span>
                          </div>
                          <div className="coupon-status">
                            {isExpired && <span className="status-badge expired">Expired</span>}
                            {isMaxed && <span className="status-badge maxed">Maxed</span>}
                            {!isExpired && !isMaxed && (
                              <span
                                className={`status-badge ${coupon.enabled ? 'active' : 'inactive'}`}
                              >
                                {coupon.enabled ? 'Active' : 'Disabled'}
                              </span>
                            )}
                          </div>
                          <div className="coupon-actions">
                            <button
                              className={`btn-sm ${coupon.enabled ? '' : 'btn-sm-success'}`}
                              onClick={() => toggleCoupon(coupon.id, !coupon.enabled)}
                              disabled={isExpired || isMaxed}
                            >
                              {coupon.enabled ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              className="btn-sm"
                              onClick={() => deleteCoupon(coupon.id)}
                              style={{ color: 'var(--admin-danger)' }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Referral stats */}
              <div className="card">
                <div className="card-header">
                  <h2>📊 Referral Source Stats</h2>
                </div>
                {referralStats.length === 0 ? (
                  <div className="empty-state">
                    <span>📊</span>
                    <p>No data yet</p>
                  </div>
                ) : (
                  <div className="referral-stats">
                    {referralStats.map(([source, count], index) => (
                      <div key={source} className="referral-item">
                        <span className="referral-rank">#{index + 1}</span>
                        <span className="referral-source">{source}</span>
                        <span className="referral-count">{count} bookings</span>
                        <div
                          className="referral-bar"
                          style={{ width: `${(count / referralStats[0][1]) * 100}%` }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========== Gallery ========== */}
          {activeMenu === 'gallery' && (
            <div className="gallery-page">
              <div className="card">
                <div className="card-header">
                  <h2>🖼️ Gallery Management</h2>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <ImageUploader
                    preset={GALLERY_PRESET}
                    multiple
                    onChange={() => {}}
                    onMultipleChange={handleGalleryUploadMultiple}
                    label="Upload new images (drag & drop, paste, multi-select)"
                  />
                </div>
                <div className="gallery-grid">
                  {(settings.galleryImages || []).length === 0 ? (
                    <div className="empty-state">
                      <span>📷</span>
                      <p>No images yet. Click the button above to upload</p>
                    </div>
                  ) : (
                    (settings.galleryImages || [])
                      .sort((a, b) => a.order - b.order)
                      .map((img, idx) => (
                        <div key={img.id} className="gallery-item">
                          <img src={img.url} alt={img.caption || `Gallery ${idx + 1}`} />
                          <div className="gallery-item-overlay">
                            <input
                              type="text"
                              className="caption-input"
                              placeholder="Add caption..."
                              value={img.caption}
                              onChange={(e) => updateGalleryCaption(img.id, e.target.value)}
                              onBlur={() => saveSettings({ galleryImages: settings.galleryImages })}
                            />
                            <div className="gallery-item-actions">
                              <button
                                className="btn-icon-sm"
                                onClick={() => moveGalleryImage(img.id, 'up')}
                                disabled={idx === 0}
                                title="Move up"
                              >
                                ⬆️
                              </button>
                              <button
                                className="btn-icon-sm"
                                onClick={() => moveGalleryImage(img.id, 'down')}
                                disabled={idx === (settings.galleryImages || []).length - 1}
                                title="Move down"
                              >
                                ⬇️
                              </button>
                              <button
                                className="btn-icon-sm danger"
                                onClick={() => deleteGalleryImage(img.id)}
                                title="Delete"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--admin-text-muted)',
                    padding: '16px 20px',
                    margin: 0,
                    borderTop: '1px solid var(--admin-border)',
                  }}
                >
                  Recommended size: 800x600 or larger, JPG/PNG supported
                </p>
              </div>
            </div>
          )}

          {/* ========== Menu Management ========== */}
          {activeMenu === 'menu' && (
            <React.Suspense
              fallback={<div className="loading-screen">Loading Menu Management...</div>}
            >
              <MenuManagement />
            </React.Suspense>
          )}

          {/* ========== Instagram ========== */}
          {activeMenu === 'instagram' && (
            <div className="instagram-page">
              {/* Instagram account settings */}
              <div className="card">
                <div className="card-header">
                  <h2>📸 Instagram Account</h2>
                </div>
                <div className="detail-info">
                  <div className="info-row">
                    <span className="info-label">Handle</span>
                    <div className="input-with-prefix">
                      <span className="input-prefix">@</span>
                      <input
                        type="text"
                        value={instagramSettings.handle}
                        onChange={(e) =>
                          setInstagramSettings((prev) => ({
                            ...prev,
                            handle: e.target.value.replace('@', ''),
                          }))
                        }
                        onBlur={(e) => saveInstagramHandle(e.target.value.replace('@', ''))}
                        placeholder="familyfriendshibachi"
                        className="input"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Add new post */}
              <div className="card">
                <div className="card-header">
                  <h2>➕ Add New Post</h2>
                </div>
                <div className="add-post-form">
                  <div className="add-post-upload">
                    {newPostImage ? (
                      <div className="upload-preview">
                        <img src={newPostImage} alt="Preview" />
                        <button className="upload-remove" onClick={() => setNewPostImage(null)}>
                          ✕
                        </button>
                      </div>
                    ) : (
                      <label className="upload-area">
                        <input type="file" accept="image/*" onChange={handleImageUpload} hidden />
                        <span className="upload-icon">📷</span>
                        <span className="upload-text">Click to upload image</span>
                        <span className="upload-hint">Max 2MB</span>
                      </label>
                    )}
                  </div>
                  <div className="add-post-fields">
                    <div className="form-group">
                      <label>Instagram Link</label>
                      <input
                        type="text"
                        value={newPostLink}
                        onChange={(e) => setNewPostLink(e.target.value)}
                        placeholder="https://www.instagram.com/p/ABC123/"
                        className="input"
                      />
                    </div>
                    <button
                      className="btn-primary"
                      onClick={addInstagramPost}
                      disabled={instagramLoading || !newPostImage || !newPostLink.trim()}
                    >
                      {instagramLoading ? 'Adding...' : 'Add Post'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Post list */}
              <div className="card">
                <div className="card-header">
                  <h2>📝 Post List</h2>
                  <span className="card-badge">{instagramSettings.posts.length} posts</span>
                </div>
                {instagramSettings.posts.length === 0 ? (
                  <div className="empty-state">
                    <span>📸</span>
                    <p>No posts yet. Please add.</p>
                  </div>
                ) : (
                  <div className="instagram-posts-list">
                    {instagramSettings.posts.map((post, index) => (
                      <div key={post.id} className="instagram-post-item">
                        <div className="post-order">
                          <button
                            className="btn-icon-sm"
                            onClick={() => moveInstagramPost(post.id, 'up')}
                            disabled={index === 0}
                          >
                            ↑
                          </button>
                          <span>{index + 1}</span>
                          <button
                            className="btn-icon-sm"
                            onClick={() => moveInstagramPost(post.id, 'down')}
                            disabled={index === instagramSettings.posts.length - 1}
                          >
                            ↓
                          </button>
                        </div>
                        <div className="post-image">
                          <img src={post.image} alt={`Post ${index + 1}`} />
                        </div>
                        <div className="post-info">
                          <a href={post.link} target="_blank" rel="noopener noreferrer">
                            {post.link.length > 40 ? post.link.slice(0, 40) + '...' : post.link}
                          </a>
                        </div>
                        <button
                          className="btn-icon-sm danger"
                          onClick={() => deleteInstagramPost(post.id)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Usage guide */}
              <div className="card">
                <div className="card-header">
                  <h2>📖 Usage Guide</h2>
                </div>
                <div className="help-content" style={{ padding: '16px 20px' }}>
                  <ol style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
                    <li>
                      Open the post in Instagram, <strong>screenshot</strong> or{' '}
                      <strong>save the image</strong>
                    </li>
                    <li>Click &quot;Copy link&quot; to get the post URL</li>
                    <li>Upload the image and paste the link, then click &quot;Add Post&quot;</li>
                    <li>Use ↑↓ buttons to reorder</li>
                    <li>
                      Recommended: add <strong>6 posts</strong> (mobile hides last 2)
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* ========== Settings ========== */}
          {activeMenu === 'settings' && (
            <div className="settings-page">
              {/* Time slot settings */}
              <div className="card">
                <div className="card-header">
                  <h2>⏰ Available Time Slots</h2>
                  <button className="btn-sm-success" onClick={addTimeSlot}>
                    + Add Slot
                  </button>
                </div>
                <div className="time-slots-list">
                  {settings.timeSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className={`time-slot-item ${!slot.enabled ? 'disabled' : ''}`}
                    >
                      <div className="slot-main">
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={slot.enabled}
                            onChange={() => toggleTimeSlot(slot.id)}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                        <input
                          type="text"
                          className="slot-label-input"
                          value={slot.label}
                          onChange={(e) => updateTimeSlotLabel(slot.id, e.target.value)}
                          onBlur={() => saveSettings({ timeSlots: settings.timeSlots })}
                          placeholder="Slot name"
                        />
                      </div>
                      <div className="slot-times">
                        <input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => updateTimeSlotTime(slot.id, 'startTime', e.target.value)}
                          onBlur={() => saveSettings({ timeSlots: settings.timeSlots })}
                        />
                        <span>—</span>
                        <input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => updateTimeSlotTime(slot.id, 'endTime', e.target.value)}
                          onBlur={() => saveSettings({ timeSlots: settings.timeSlots })}
                        />
                      </div>
                      <button
                        className="btn-icon-sm"
                        onClick={() => deleteTimeSlot(slot.id)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Auto reminders */}
              <div className="card">
                <div className="card-header">
                  <h2>📧 Event Reminder Emails</h2>
                </div>
                <div className="detail-info">
                  <div className="info-row">
                    <span className="info-label">Tomorrow&apos;s events</span>
                    <span className="info-value">
                      {reminderStatus.pending > 0 ? (
                        <span style={{ color: 'var(--admin-warning)' }}>
                          {reminderStatus.pending} pending
                        </span>
                      ) : (
                        <span style={{ color: 'var(--admin-text-muted)' }}>None</span>
                      )}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Reminders sent</span>
                    <span className="info-value">{reminderStatus.reminded}</span>
                  </div>
                </div>
                <div style={{ padding: '16px 20px', borderTop: '1px solid var(--admin-border)' }}>
                  <button
                    className="btn-primary"
                    onClick={sendReminders}
                    disabled={reminderStatus.loading || reminderStatus.pending === 0}
                    style={{ width: '100%' }}
                  >
                    {reminderStatus.loading
                      ? 'Sending...'
                      : `Send Reminder Emails (${reminderStatus.pending})`}
                  </button>
                  <p
                    style={{
                      fontSize: '12px',
                      color: 'var(--admin-text-muted)',
                      marginTop: '12px',
                      marginBottom: 0,
                      textAlign: 'center',
                    }}
                  >
                    Reminder emails are sent to confirmed customers with events tomorrow
                  </p>
                </div>
              </div>

              {/* Promo banner */}
              <div className="card">
                <div className="card-header">
                  <h2>📢 Promo Banner</h2>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.promoBanner?.enabled ?? true}
                      onChange={(e) =>
                        saveSettings({
                          promoBanner: { ...settings.promoBanner, enabled: e.target.checked },
                        })
                      }
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <div className="form-group">
                  <label>Emoji</label>
                  <input
                    type="text"
                    className="input"
                    value={settings.promoBanner?.emoji ?? '🔥'}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        promoBanner: { ...s.promoBanner, emoji: e.target.value },
                      }))
                    }
                    onBlur={() => saveSettings({ promoBanner: settings.promoBanner })}
                    placeholder="🔥"
                    style={{ width: '60px', textAlign: 'center' }}
                  />
                </div>
                <div className="form-group">
                  <label>Promo Text</label>
                  <input
                    type="text"
                    className="input"
                    value={settings.promoBanner?.text ?? 'Book Today & Get $30 OFF!'}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        promoBanner: { ...s.promoBanner, text: e.target.value },
                      }))
                    }
                    onBlur={() => saveSettings({ promoBanner: settings.promoBanner })}
                    placeholder="Book Today & Get $30 OFF!"
                  />
                </div>
              </div>

              {/* Contact info */}
              <div className="card">
                <div className="card-header">
                  <h2>📞 Contact Info</h2>
                </div>
                <div className="form-group">
                  <label>Contact Name</label>
                  <input
                    type="text"
                    className="input"
                    value={settings.contactInfo?.contactPerson ?? 'Family Friends Hibachi Team'}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        contactInfo: { ...s.contactInfo, contactPerson: e.target.value },
                      }))
                    }
                    onBlur={() => saveSettings({ contactInfo: settings.contactInfo })}
                    placeholder="Family Friends Hibachi Team"
                  />
                </div>
                <div className="form-group">
                  <label>📱 Phone</label>
                  <input
                    type="tel"
                    className="input"
                    value={settings.contactInfo?.phone ?? ''}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        contactInfo: { ...s.contactInfo, phone: e.target.value },
                      }))
                    }
                    onBlur={() => saveSettings({ contactInfo: settings.contactInfo })}
                    placeholder="909-615-6633"
                  />
                </div>
                <div className="form-group">
                  <label>📧 Email</label>
                  <input
                    type="email"
                    className="input"
                    value={settings.contactInfo?.email ?? ''}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        contactInfo: { ...s.contactInfo, email: e.target.value },
                      }))
                    }
                    onBlur={() => saveSettings({ contactInfo: settings.contactInfo })}
                    placeholder="familyfriendshibachi@gmail.com"
                  />
                </div>
              </div>

              {/* Feature toggles */}
              <div className="card">
                <div className="card-header">
                  <h2>🎛️ Feature Toggles</h2>
                </div>
                <div className="feature-toggles">
                  {[
                    {
                      key: 'photoShare',
                      label: '📸 Photo Share',
                      desc: 'Customers share photos for discounts',
                    },
                    {
                      key: 'referralProgram',
                      label: '🎁 Referral Program',
                      desc: 'Refer friends and earn rewards',
                    },
                    {
                      key: 'newsletter',
                      label: '📧 Newsletter',
                      desc: 'Email subscription feature',
                    },
                    {
                      key: 'specialOffer',
                      label: '🎉 Special Offer Popup',
                      desc: 'First visit popup discount',
                    },
                    {
                      key: 'instagramFeed',
                      label: '📷 Instagram Feed',
                      desc: 'Display Instagram posts',
                    },
                    { key: 'coupons', label: '🎫 Coupon System', desc: 'Use coupons at checkout' },
                  ].map((feature) => (
                    <div key={feature.key} className="feature-toggle-item">
                      <div className="feature-info">
                        <span className="feature-label">{feature.label}</span>
                        <span className="feature-desc">{feature.desc}</span>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={
                            settings.featureToggles?.[feature.key as keyof FeatureToggles] ?? true
                          }
                          onChange={(e) => {
                            const newToggles = {
                              ...DEFAULT_FEATURE_TOGGLES,
                              ...settings.featureToggles,
                              [feature.key]: e.target.checked,
                            };
                            setSettings((s) => ({ ...s, featureToggles: newToggles }));
                            saveSettings({ featureToggles: newToggles });
                          }}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Social media links */}
              <div className="card">
                <div className="card-header">
                  <h2>🔗 Social Media Links</h2>
                </div>
                <div className="form-group">
                  <label>📷 Instagram</label>
                  <input
                    type="url"
                    className="input"
                    value={settings.socialLinks?.instagram ?? ''}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        socialLinks: { ...s.socialLinks, instagram: e.target.value },
                      }))
                    }
                    onBlur={() => saveSettings({ socialLinks: settings.socialLinks })}
                    placeholder="https://instagram.com/familyfriendshibachi"
                  />
                </div>
                <div className="form-group">
                  <label>📘 Facebook</label>
                  <input
                    type="url"
                    className="input"
                    value={settings.socialLinks?.facebook ?? ''}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        socialLinks: { ...s.socialLinks, facebook: e.target.value },
                      }))
                    }
                    onBlur={() => saveSettings({ socialLinks: settings.socialLinks })}
                    placeholder="https://facebook.com/familyfriendshibachi"
                  />
                </div>
                <div className="form-group">
                  <label>🎵 TikTok</label>
                  <input
                    type="url"
                    className="input"
                    value={settings.socialLinks?.tiktok ?? ''}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        socialLinks: { ...s.socialLinks, tiktok: e.target.value },
                      }))
                    }
                    onBlur={() => saveSettings({ socialLinks: settings.socialLinks })}
                    placeholder="https://tiktok.com/@familyfriendshibachi"
                  />
                </div>
              </div>

              {/* Data export */}
              <div className="card">
                <div className="card-header">
                  <h2>📥 Data Export</h2>
                </div>
                <div
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <button
                    className="btn-primary"
                    onClick={exportBookingsCSV}
                    style={{ width: '100%' }}
                  >
                    📄 Export CSV
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={copyBookingsToClipboard}
                    style={{ width: '100%' }}
                  >
                    📋 Copy All Data
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={exportBookingsAsImage}
                    style={{ width: '100%' }}
                  >
                    🖼️ Save as Image
                  </button>
                  <p
                    style={{
                      fontSize: '12px',
                      color: 'var(--admin-text-muted)',
                      marginTop: '4px',
                      marginBottom: 0,
                      textAlign: 'center',
                    }}
                  >
                    Total {bookings.length} bookings
                  </p>
                </div>
              </div>

              {/* System info */}
              <div className="card">
                <div className="card-header">
                  <h2>📊 System Info</h2>
                </div>
                <div className="detail-info">
                  <div className="info-row">
                    <span className="info-label">Version</span>
                    <span className="info-value">1.0.0</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Total Bookings</span>
                    <span className="info-value">{stats.total}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Blocked Dates</span>
                    <span className="info-value">{blockedDates.length}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Enabled Slots</span>
                    <span className="info-value">
                      {settings.timeSlots.filter((s) => s.enabled).length} /{' '}
                      {settings.timeSlots.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact info */}
              <div className="card">
                <div className="card-header">
                  <h2>📞 Contact Info</h2>
                </div>
                <div className="detail-info">
                  <div className="info-row">
                    <span className="info-label">Phone</span>
                    <span className="info-value">{settings.contactInfo?.phone}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Email</span>
                    <span className="info-value">{settings.contactInfo?.email}</span>
                  </div>
                </div>
              </div>

              {/* Brand info */}
              <div className="card">
                <div className="card-header">
                  <h2>🏷️ Brand Info</h2>
                </div>
                <div className="form-group">
                  <label>Brand Name</label>
                  <input
                    type="text"
                    className="input"
                    value={settings.brandInfo?.name ?? 'Family Friends Hibachi'}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        brandInfo: { ...s.brandInfo, name: e.target.value },
                      }))
                    }
                    onBlur={() => saveSettings({ brandInfo: settings.brandInfo })}
                    placeholder="Family Friends Hibachi"
                  />
                </div>
                <div className="form-group">
                  <label>Website URL</label>
                  <input
                    type="url"
                    className="input"
                    value={settings.brandInfo?.url ?? ''}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        brandInfo: { ...s.brandInfo, url: e.target.value },
                      }))
                    }
                    onBlur={() => saveSettings({ brandInfo: settings.brandInfo })}
                    placeholder="https://familyfriendshibachi.com"
                  />
                </div>
                <div className="form-group">
                  <label>Brand Tagline</label>
                  <input
                    type="text"
                    className="input"
                    value={settings.brandInfo?.hashtag ?? '#MORESAKEMOREHAPPY'}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        brandInfo: { ...s.brandInfo, hashtag: e.target.value },
                      }))
                    }
                    onBlur={() => saveSettings({ brandInfo: settings.brandInfo })}
                    placeholder="#MORESAKEMOREHAPPY"
                  />
                </div>
                <div className="form-group">
                  <ImageUploader
                    label="Brand Logo (square recommended, auto-cropped to 1:1)"
                    preset={LOGO_PRESET}
                    aspectRatio={1}
                    value={settings.brandInfo?.logoImage || ''}
                    onChange={(base64) => {
                      const updated = { ...settings.brandInfo, logoImage: base64 };
                      setSettings((s) => ({ ...s, brandInfo: updated }));
                      saveSettings({ brandInfo: updated });
                    }}
                    onRemove={() => {
                      const updated = { ...settings.brandInfo, logoImage: '' };
                      setSettings((s) => ({ ...s, brandInfo: updated }));
                      saveSettings({ brandInfo: updated });
                    }}
                  />
                </div>
                <div className="form-group">
                  <ImageUploader
                    label="Hero Background (16:9 recommended, auto-cropped)"
                    preset={HERO_PRESET}
                    aspectRatio={16 / 9}
                    value={settings.brandInfo?.heroImage || ''}
                    onChange={(base64) => {
                      const updated = { ...settings.brandInfo, heroImage: base64 };
                      setSettings((s) => ({ ...s, brandInfo: updated }));
                      saveSettings({ brandInfo: updated });
                    }}
                    onRemove={() => {
                      const updated = { ...settings.brandInfo, heroImage: '' };
                      setSettings((s) => ({ ...s, brandInfo: updated }));
                      saveSettings({ brandInfo: updated });
                    }}
                  />
                </div>
              </div>

              {/* SEO defaults */}
              <div className="card">
                <div className="card-header">
                  <h2>🔍 SEO Settings</h2>
                </div>
                <div className="form-group">
                  <label>Page Title</label>
                  <input
                    type="text"
                    className="input"
                    value={settings.seoDefaults?.title ?? ''}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        seoDefaults: { ...s.seoDefaults, title: e.target.value },
                      }))
                    }
                    onBlur={() => saveSettings({ seoDefaults: settings.seoDefaults })}
                    placeholder="Family Friends Hibachi - At Home Hibachi Experience"
                  />
                </div>
                <div className="form-group">
                  <label>SEO Description</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={settings.seoDefaults?.description ?? ''}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        seoDefaults: { ...s.seoDefaults, description: e.target.value },
                      }))
                    }
                    onBlur={() => saveSettings({ seoDefaults: settings.seoDefaults })}
                    placeholder="Top Rated Hibachi At Home Experience..."
                  />
                </div>
                <div className="form-group">
                  <label>SEO Keywords</label>
                  <input
                    type="text"
                    className="input"
                    value={settings.seoDefaults?.keywords ?? ''}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        seoDefaults: { ...s.seoDefaults, keywords: e.target.value },
                      }))
                    }
                    onBlur={() => saveSettings({ seoDefaults: settings.seoDefaults })}
                    placeholder="hibachi, at home hibachi, hibachi catering..."
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav">
        {menuItems.map((item) => (
          <button
            key={item.key}
            className={`mobile-nav-item ${activeMenu === item.key ? 'active' : ''}`}
            onClick={() => {
              setActiveMenu(item.key as MenuType);
              setSelectedBooking(null);
            }}
          >
            <span className="mobile-nav-icon">{item.icon}</span>
            <span className="mobile-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default AdminDashboard;
