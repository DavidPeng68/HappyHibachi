import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdmin } from './AdminLayout';
import { ConfirmDialog } from '../../components/admin';
import { ImageUploader } from '../../components/ui';
import { LOGO_PRESET, HERO_PRESET } from '../../utils/imageCompression';
import { useSettings } from '../../hooks/useSettings';
import * as adminApi from '../../services/adminApi';
import type { AppSettings, FeatureToggles, TimeSlot } from '../../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_FEATURE_TOGGLES: FeatureToggles = {
  photoShare: true,
  referralProgram: true,
  newsletter: true,
  specialOffer: true,
  instagramFeed: true,
  coupons: true,
};

const FEATURE_TOGGLE_ITEMS: Array<{
  key: keyof FeatureToggles;
  labelKey: string;
  descKey: string;
}> = [
  {
    key: 'photoShare',
    labelKey: 'admin.settings.features.photoShare',
    descKey: 'admin.settings.features.photoShareDesc',
  },
  {
    key: 'referralProgram',
    labelKey: 'admin.settings.features.referralProgram',
    descKey: 'admin.settings.features.referralProgramDesc',
  },
  {
    key: 'newsletter',
    labelKey: 'admin.settings.features.newsletter',
    descKey: 'admin.settings.features.newsletterDesc',
  },
  {
    key: 'specialOffer',
    labelKey: 'admin.settings.features.specialOffer',
    descKey: 'admin.settings.features.specialOfferDesc',
  },
  {
    key: 'instagramFeed',
    labelKey: 'admin.settings.features.instagramFeed',
    descKey: 'admin.settings.features.instagramFeedDesc',
  },
  {
    key: 'coupons',
    labelKey: 'admin.settings.features.coupons',
    descKey: 'admin.settings.features.couponsDesc',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { token, showToast, settings, setSettings, bookings, blockedDates } = useAdmin();
  const { refreshSettings: refreshGlobalSettings } = useSettings();

  const [reminderStatus, setReminderStatus] = useState<{
    pending: number;
    reminded: number;
    loading: boolean;
  }>({ pending: 0, reminded: 0, loading: false });

  const [deleteSlotId, setDeleteSlotId] = useState<string | null>(null);

  // -------------------------------------------------------------------
  // Save helper
  // -------------------------------------------------------------------

  const saveSettings = useCallback(
    async (newSettings: Partial<AppSettings>) => {
      try {
        const result = await adminApi.saveSettings(token, newSettings);
        if (result.success && result.settings) {
          setSettings(result.settings);
          showToast(t('admin.toast.settingsSaved'), 'success');
          refreshGlobalSettings();
        } else {
          showToast(t('admin.toast.saveFailed'), 'error');
        }
      } catch {
        showToast(t('admin.toast.saveFailed'), 'error');
      }
    },
    [token, setSettings, showToast, t, refreshGlobalSettings]
  );

  // -------------------------------------------------------------------
  // Reminders
  // -------------------------------------------------------------------

  const fetchReminderStatus = useCallback(async () => {
    try {
      const result = await adminApi.fetchReminderStatus();
      if (result.success) {
        setReminderStatus((prev) => ({
          ...prev,
          pending: result.pendingReminders ?? 0,
          reminded: result.alreadyReminded ?? 0,
        }));
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchReminderStatus();
  }, [fetchReminderStatus]);

  const handleSendReminders = useCallback(async () => {
    setReminderStatus((prev) => ({ ...prev, loading: true }));
    try {
      const result = await adminApi.sendReminders(token);
      if (result.success) {
        showToast(t('admin.toast.remindersSent', { count: result.processed ?? 0 }), 'success');
        fetchReminderStatus();
      } else {
        showToast(t('admin.toast.sendFailed'), 'error');
      }
    } catch {
      showToast(t('admin.toast.sendFailed'), 'error');
    } finally {
      setReminderStatus((prev) => ({ ...prev, loading: false }));
    }
  }, [token, showToast, t, fetchReminderStatus]);

  // -------------------------------------------------------------------
  // Time Slots
  // -------------------------------------------------------------------

  const addTimeSlot = useCallback(() => {
    const newSlot: TimeSlot = {
      id: `custom_${Date.now()}`,
      label: 'New slot',
      startTime: '12:00',
      endTime: '14:00',
      enabled: true,
    };
    const newTimeSlots = [...settings.timeSlots, newSlot];
    saveSettings({ timeSlots: newTimeSlots });
  }, [settings.timeSlots, saveSettings]);

  const toggleTimeSlot = useCallback(
    (slotId: string) => {
      const newTimeSlots = settings.timeSlots.map((slot) =>
        slot.id === slotId ? { ...slot, enabled: !slot.enabled } : slot
      );
      saveSettings({ timeSlots: newTimeSlots });
    },
    [settings.timeSlots, saveSettings]
  );

  const updateTimeSlotLabel = useCallback(
    (slotId: string, label: string) => {
      const newTimeSlots = settings.timeSlots.map((slot) =>
        slot.id === slotId ? { ...slot, label } : slot
      );
      setSettings((prev) => ({ ...prev, timeSlots: newTimeSlots }));
    },
    [settings.timeSlots, setSettings]
  );

  const updateTimeSlotTime = useCallback(
    (slotId: string, field: 'startTime' | 'endTime', value: string) => {
      const newTimeSlots = settings.timeSlots.map((slot) =>
        slot.id === slotId ? { ...slot, [field]: value } : slot
      );
      setSettings((prev) => ({ ...prev, timeSlots: newTimeSlots }));
    },
    [settings.timeSlots, setSettings]
  );

  const confirmDeleteTimeSlot = useCallback(() => {
    if (!deleteSlotId) return;
    const newTimeSlots = settings.timeSlots.filter((slot) => slot.id !== deleteSlotId);
    saveSettings({ timeSlots: newTimeSlots });
    setDeleteSlotId(null);
  }, [deleteSlotId, settings.timeSlots, saveSettings]);

  // -------------------------------------------------------------------
  // Feature Toggles
  // -------------------------------------------------------------------

  const handleFeatureToggle = useCallback(
    (key: keyof FeatureToggles, checked: boolean) => {
      const newToggles = {
        ...DEFAULT_FEATURE_TOGGLES,
        ...settings.featureToggles,
        [key]: checked,
      };
      setSettings((s) => ({ ...s, featureToggles: newToggles }));
      saveSettings({ featureToggles: newToggles });
    },
    [settings.featureToggles, setSettings, saveSettings]
  );

  // -------------------------------------------------------------------
  // Export: CSV
  // -------------------------------------------------------------------

  const exportBookingsCSV = useCallback(() => {
    if (bookings.length === 0) {
      showToast(t('admin.toast.noDataExport'), 'error');
      return;
    }

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

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bookings_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(t('admin.toast.exported', { count: bookings.length }), 'success');
  }, [bookings, showToast, t]);

  // -------------------------------------------------------------------
  // Export: Clipboard
  // -------------------------------------------------------------------

  const copyBookingsToClipboard = useCallback(async () => {
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
      .join('\n\n' + '\u2500'.repeat(30) + '\n\n');

    const header = `${settings.brandInfo?.name || 'Family Friends Hibachi'} Booking Export\nExport time: ${new Date().toLocaleString()}\nTotal: ${bookings.length} records\n\n${'='.repeat(30)}\n\n`;

    try {
      await navigator.clipboard.writeText(header + textContent);
      showToast(t('admin.toast.copied', { count: bookings.length }), 'success');
    } catch {
      showToast(t('admin.toast.copyFailed'), 'error');
    }
  }, [bookings, settings.brandInfo?.name, showToast, t]);

  // -------------------------------------------------------------------
  // Export: Image
  // -------------------------------------------------------------------

  const exportBookingsAsImage = useCallback(async () => {
    if (bookings.length === 0) {
      showToast(t('admin.toast.noDataExport'), 'error');
      return;
    }

    const statusMap: Record<string, string> = {
      pending: '\u23F3 Pending',
      confirmed: '\u2705 Confirmed',
      completed: '🎉 Completed',
      cancelled: '\u274C Cancelled',
    };

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      showToast(t('admin.toast.browserNotSupported'), 'error');
      return;
    }

    const padding = 40;
    const headerHeight = 80;
    const itemPadding = 20;
    const itemHeight = 220;
    const cols = Math.min(2, Math.ceil(bookings.length / 5));
    const rows = Math.ceil(bookings.length / cols);

    canvas.width = Math.max(800, cols * 380 + padding * 2);
    canvas.height = headerHeight + rows * itemHeight + padding * 2;

    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#FF6B35';
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.fillText(
      `🍱 ${settings.brandInfo?.name || 'Family Friends Hibachi'} Booking Data`,
      padding,
      padding + 30
    );

    ctx.fillStyle = '#888';
    ctx.font = '14px system-ui, -apple-system, sans-serif';
    ctx.fillText(
      `Export time: ${new Date().toLocaleString()} | Total ${bookings.length} records`,
      padding,
      padding + 55
    );

    bookings.forEach((b, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = padding + col * 380;
      const y = headerHeight + padding + row * itemHeight;

      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.roundRect(x, y, 360, itemHeight - 20, 8);
      ctx.fill();

      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.stroke();

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
      showToast(t('admin.toast.imageSaved', { count: bookings.length }), 'success');
    }, 'image/png');
  }, [bookings, settings.brandInfo?.name, showToast, t]);

  // -------------------------------------------------------------------
  // Stats
  // -------------------------------------------------------------------

  const totalBookings = bookings.length;
  const enabledSlots = settings.timeSlots.filter((s) => s.enabled).length;
  const totalSlots = settings.timeSlots.length;

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------

  return (
    <div className="settings-page">
      {/* Time Slots */}
      <div className="card">
        <div className="card-header">
          <h2>{t('admin.settings.timeSlots')}</h2>
          <button className="btn-sm-success" onClick={addTimeSlot} type="button">
            {t('admin.settings.addSlot')}
          </button>
        </div>
        <div className="time-slots-list">
          {settings.timeSlots.map((slot) => (
            <div key={slot.id} className={`time-slot-item${!slot.enabled ? ' disabled' : ''}`}>
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
                  placeholder={t('admin.settings.slotNamePlaceholder')}
                />
              </div>
              <div className="slot-times">
                <input
                  type="time"
                  value={slot.startTime}
                  onChange={(e) => updateTimeSlotTime(slot.id, 'startTime', e.target.value)}
                  onBlur={() => saveSettings({ timeSlots: settings.timeSlots })}
                />
                <span>&mdash;</span>
                <input
                  type="time"
                  value={slot.endTime}
                  onChange={(e) => updateTimeSlotTime(slot.id, 'endTime', e.target.value)}
                  onBlur={() => saveSettings({ timeSlots: settings.timeSlots })}
                />
              </div>
              <button
                className="btn-icon-sm"
                onClick={() => setDeleteSlotId(slot.id)}
                title={t('admin.settings.deleteSlot')}
                type="button"
              >
                &#128465;
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Event Reminders */}
      <div className="card">
        <div className="card-header">
          <h2>{t('admin.settings.reminders')}</h2>
        </div>
        <div className="detail-info">
          <div className="info-row">
            <span className="info-label">{t('admin.settings.tomorrowEvents')}</span>
            <span className="info-value">
              {reminderStatus.pending > 0 ? (
                <span style={{ color: 'var(--admin-warning)' }}>
                  {reminderStatus.pending} {t('admin.settings.pendingLabel')}
                </span>
              ) : (
                <span style={{ color: 'var(--admin-text-muted)' }}>
                  {t('admin.settings.noneLabel')}
                </span>
              )}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">{t('admin.settings.remindersSent')}</span>
            <span className="info-value">{reminderStatus.reminded}</span>
          </div>
        </div>
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--admin-border)' }}>
          <button
            className="btn-primary"
            onClick={handleSendReminders}
            disabled={reminderStatus.loading || reminderStatus.pending === 0}
            style={{ width: '100%' }}
            type="button"
          >
            {reminderStatus.loading
              ? t('admin.settings.sending')
              : t('admin.settings.sendRemindersButton', { count: reminderStatus.pending })}
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
            {t('admin.settings.reminderNote')}
          </p>
        </div>
      </div>

      {/* Promo Banner */}
      <div className="card">
        <div className="card-header">
          <h2>{t('admin.settings.promoBanner')}</h2>
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
          <label>{t('admin.settings.promoEmoji')}</label>
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
          <label>{t('admin.settings.promoText')}</label>
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

      {/* Contact Info */}
      <div className="card">
        <div className="card-header">
          <h2>{t('admin.settings.contactInfo')}</h2>
        </div>
        <div className="form-group">
          <label>{t('admin.settings.contactName')}</label>
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
          <label>{t('admin.settings.phone')}</label>
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
          <label>{t('admin.settings.email')}</label>
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

      {/* Feature Toggles */}
      <div className="card">
        <div className="card-header">
          <h2>{t('admin.settings.featureToggles')}</h2>
        </div>
        <div className="feature-toggles">
          {FEATURE_TOGGLE_ITEMS.map((feature) => (
            <div key={feature.key} className="feature-toggle-item">
              <div className="feature-info">
                <span className="feature-label">{t(feature.labelKey)}</span>
                <span className="feature-desc">{t(feature.descKey)}</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.featureToggles?.[feature.key] ?? true}
                  onChange={(e) => handleFeatureToggle(feature.key, e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Social Media Links */}
      <div className="card">
        <div className="card-header">
          <h2>{t('admin.settings.socialLinks')}</h2>
        </div>
        <div className="form-group">
          <label>{t('admin.settings.instagramUrl')}</label>
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
          <label>{t('admin.settings.facebookUrl')}</label>
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
          <label>{t('admin.settings.tiktokUrl')}</label>
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

      {/* Data Export */}
      <div className="card">
        <div className="card-header">
          <h2>{t('admin.settings.dataExport')}</h2>
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
            type="button"
          >
            {t('admin.settings.exportCsv')}
          </button>
          <button
            className="btn-secondary"
            onClick={copyBookingsToClipboard}
            style={{ width: '100%' }}
            type="button"
          >
            {t('admin.settings.copyAllData')}
          </button>
          <button
            className="btn-secondary"
            onClick={exportBookingsAsImage}
            style={{ width: '100%' }}
            type="button"
          >
            {t('admin.settings.saveAsImage')}
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
            {t('admin.settings.totalBookingsLabel', { count: bookings.length })}
          </p>
        </div>
      </div>

      {/* Brand Info */}
      <div className="card">
        <div className="card-header">
          <h2>{t('admin.settings.brandInfo')}</h2>
        </div>
        <div className="form-group">
          <label>{t('admin.settings.brandName')}</label>
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
          <label>{t('admin.settings.websiteUrl')}</label>
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
          <label>{t('admin.settings.brandTagline')}</label>
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
            label={t('admin.settings.logoLabel')}
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
            label={t('admin.settings.heroLabel')}
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

      {/* SEO Settings */}
      <div className="card">
        <div className="card-header">
          <h2>{t('admin.settings.seoSettings')}</h2>
        </div>
        <div className="form-group">
          <label>{t('admin.settings.pageTitle')}</label>
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
          <label>{t('admin.settings.seoDescription')}</label>
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
          <label>{t('admin.settings.seoKeywords')}</label>
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

      {/* System Info */}
      <div className="card">
        <div className="card-header">
          <h2>{t('admin.settings.systemInfo')}</h2>
        </div>
        <div className="detail-info">
          <div className="info-row">
            <span className="info-label">{t('admin.settings.version')}</span>
            <span className="info-value">1.0.0</span>
          </div>
          <div className="info-row">
            <span className="info-label">{t('admin.settings.totalBookings')}</span>
            <span className="info-value">{totalBookings}</span>
          </div>
          <div className="info-row">
            <span className="info-label">{t('admin.settings.blockedDates')}</span>
            <span className="info-value">{blockedDates.length}</span>
          </div>
          <div className="info-row">
            <span className="info-label">{t('admin.settings.enabledSlots')}</span>
            <span className="info-value">
              {enabledSlots} / {totalSlots}
            </span>
          </div>
        </div>
      </div>

      {/* Delete time slot confirm */}
      <ConfirmDialog
        open={deleteSlotId !== null}
        title={t('admin.settings.confirmDeleteSlotTitle')}
        message={t('admin.settings.confirmDeleteSlotMessage')}
        variant="danger"
        onConfirm={confirmDeleteTimeSlot}
        onCancel={() => setDeleteSlotId(null)}
      />
    </div>
  );
};

export default SettingsPage;
