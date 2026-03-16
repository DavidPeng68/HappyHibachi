import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdmin } from '../AdminLayout';
import { ImageUploader } from '../../../components/ui';
import { LOGO_PRESET, HERO_PRESET } from '../../../utils/imageCompression';
import * as adminApi from '../../../services/adminApi';
import { useSettings } from '../../../hooks/useSettings';
import type { AppSettings } from '../../../types';

const SettingsBrand: React.FC = () => {
  const { t } = useTranslation();
  const { token, showToast, settings, setSettings } = useAdmin();
  const { refreshSettings: refreshGlobalSettings } = useSettings();

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

  return (
    <div className="card">
      <div className="card-header">
        <h2>{t('admin.settings.brandInfo')}</h2>
      </div>
      <div className="form-group">
        <label>{t('admin.settings.brandName')}</label>
        <input
          type="text"
          className="input"
          value={settings.brandInfo?.name ?? t('admin.settings.defaults.brandName')}
          onChange={(e) =>
            setSettings((s) => ({
              ...s,
              brandInfo: { ...s.brandInfo, name: e.target.value },
            }))
          }
          onBlur={() => saveSettings({ brandInfo: settings.brandInfo })}
          placeholder={t('admin.settings.defaults.brandName')}
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
          placeholder={t('admin.settings.defaults.websiteUrl')}
        />
      </div>
      <div className="form-group">
        <label>{t('admin.settings.brandTagline')}</label>
        <input
          type="text"
          className="input"
          value={settings.brandInfo?.hashtag ?? t('admin.settings.defaults.brandTagline')}
          onChange={(e) =>
            setSettings((s) => ({
              ...s,
              brandInfo: { ...s.brandInfo, hashtag: e.target.value },
            }))
          }
          onBlur={() => saveSettings({ brandInfo: settings.brandInfo })}
          placeholder={t('admin.settings.defaults.brandTagline')}
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
  );
};

export default SettingsBrand;
