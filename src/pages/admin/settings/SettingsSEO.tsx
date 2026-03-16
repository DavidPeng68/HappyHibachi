import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdmin } from '../AdminLayout';
import * as adminApi from '../../../services/adminApi';
import { useSettings } from '../../../hooks/useSettings';
import type { AppSettings } from '../../../types';

const SettingsSEO: React.FC = () => {
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
  );
};

export default SettingsSEO;
