import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdmin } from '../AdminLayout';
import * as adminApi from '../../../services/adminApi';
import { useSettings } from '../../../hooks/useSettings';
import type { AppSettings } from '../../../types';

const SettingsContact: React.FC = () => {
  const { t } = useTranslation();
  const { token, showToast, settings, setSettings } = useAdmin();
  const { refreshSettings: refreshGlobalSettings } = useSettings();

  const [reminderStatus, setReminderStatus] = useState<{
    pending: number;
    reminded: number;
    loading: boolean;
  }>({ pending: 0, reminded: 0, loading: false });

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

  return (
    <>
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
                <span className="text-warning">
                  {reminderStatus.pending} {t('admin.settings.pendingLabel')}
                </span>
              ) : (
                <span className="text-muted">{t('admin.settings.noneLabel')}</span>
              )}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">{t('admin.settings.remindersSent')}</span>
            <span className="info-value">{reminderStatus.reminded}</span>
          </div>
        </div>
        <div className="settings-section">
          <button
            className="btn-primary w-full"
            onClick={handleSendReminders}
            disabled={reminderStatus.loading || reminderStatus.pending === 0}
            type="button"
          >
            {reminderStatus.loading
              ? t('admin.settings.sending')
              : t('admin.settings.sendRemindersButton', { count: reminderStatus.pending })}
          </button>
          <p className="settings-hint">{t('admin.settings.reminderNote')}</p>
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
            className="input settings-emoji-input"
            value={settings.promoBanner?.emoji ?? '\uD83D\uDD25'}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                promoBanner: { ...s.promoBanner, emoji: e.target.value },
              }))
            }
            onBlur={() => saveSettings({ promoBanner: settings.promoBanner })}
            placeholder="\uD83D\uDD25"
          />
        </div>
        <div className="form-group">
          <label>{t('admin.settings.promoText')}</label>
          <input
            type="text"
            className="input"
            value={settings.promoBanner?.text ?? t('admin.settings.defaults.promoText')}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                promoBanner: { ...s.promoBanner, text: e.target.value },
              }))
            }
            onBlur={() => saveSettings({ promoBanner: settings.promoBanner })}
            placeholder={t('admin.settings.defaults.promoText')}
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
            value={settings.contactInfo?.contactPerson ?? t('admin.settings.defaults.contactName')}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                contactInfo: { ...s.contactInfo, contactPerson: e.target.value },
              }))
            }
            onBlur={() => saveSettings({ contactInfo: settings.contactInfo })}
            placeholder={t('admin.settings.defaults.contactName')}
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
            placeholder={t('admin.settings.defaults.phone')}
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
            placeholder={t('admin.settings.defaults.email')}
          />
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
            placeholder={t('admin.settings.defaults.instagramUrl')}
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
            placeholder={t('admin.settings.defaults.facebookUrl')}
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
            placeholder={t('admin.settings.defaults.tiktokUrl')}
          />
        </div>
      </div>
    </>
  );
};

export default SettingsContact;
