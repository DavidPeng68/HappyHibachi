import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePersistedTab } from '../../../hooks/usePersistedTab';
import SettingsTimeSlots from './SettingsTimeSlots';
import SettingsBrand from './SettingsBrand';
import SettingsContact from './SettingsContact';
import SettingsFeatures from './SettingsFeatures';
import SettingsSEO from './SettingsSEO';
import SettingsExport from './SettingsExport';

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

type SettingsTab = 'timeSlots' | 'brand' | 'contact' | 'features' | 'seo' | 'export';

const TAB_KEYS: SettingsTab[] = ['timeSlots', 'brand', 'contact', 'features', 'seo', 'export'];

const TAB_I18N: Record<SettingsTab, string> = {
  timeSlots: 'admin.settings.timeSlots',
  brand: 'admin.settings.brandInfo',
  contact: 'admin.settings.contactInfo',
  features: 'admin.settings.featureToggles',
  seo: 'admin.settings.seoSettings',
  export: 'admin.settings.dataExport',
};

const TAB_COMPONENTS: Record<SettingsTab, React.FC> = {
  timeSlots: SettingsTimeSlots,
  brand: SettingsBrand,
  contact: SettingsContact,
  features: SettingsFeatures,
  seo: SettingsSEO,
  export: SettingsExport,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTabIndex, setActiveTabIndex] = usePersistedTab('admin:settings-tab', 0);
  const activeTab = TAB_KEYS[activeTabIndex] ?? TAB_KEYS[0];

  const ActiveComponent = TAB_COMPONENTS[activeTab];

  return (
    <div className="settings-page">
      <div className="settings-tabs">
        {TAB_KEYS.map((key, index) => (
          <button
            key={key}
            type="button"
            className={`settings-tab${activeTab === key ? ' active' : ''}`}
            onClick={() => setActiveTabIndex(index)}
          >
            {t(TAB_I18N[key])}
          </button>
        ))}
      </div>

      <ActiveComponent />
    </div>
  );
};

export default SettingsPage;
