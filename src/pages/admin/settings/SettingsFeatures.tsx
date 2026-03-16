import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdmin } from '../AdminLayout';
import * as adminApi from '../../../services/adminApi';
import { useSettings } from '../../../hooks/useSettings';
import type { AppSettings, FeatureToggles } from '../../../types';

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

const SettingsFeatures: React.FC = () => {
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

  return (
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
  );
};

export default SettingsFeatures;
