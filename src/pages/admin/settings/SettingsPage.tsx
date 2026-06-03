import React, { useCallback } from 'react';
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

function tabId(key: SettingsTab): string {
  return `admin-settings-tab-${key}`;
}

function panelId(key: SettingsTab): string {
  return `admin-settings-panel-${key}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTabIndex, setActiveTabIndex] = usePersistedTab('admin:settings-tab', 0);
  const activeTab = TAB_KEYS[activeTabIndex] ?? TAB_KEYS[0];

  const handleTabListKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const target = e.target as HTMLElement;
      if (target.getAttribute('role') !== 'tab') return;
      e.preventDefault();
      const currentKey = TAB_KEYS.find((k) => target.id === tabId(k));
      if (!currentKey) return;
      const currentIndex = TAB_KEYS.indexOf(currentKey);
      const delta = e.key === 'ArrowRight' ? 1 : -1;
      const nextIndex = (currentIndex + delta + TAB_KEYS.length) % TAB_KEYS.length;
      setActiveTabIndex(nextIndex);
      requestAnimationFrame(() => {
        document.getElementById(tabId(TAB_KEYS[nextIndex]))?.focus();
      });
    },
    [setActiveTabIndex]
  );

  return (
    <div className="settings-page">
      <div
        className="admin-tabs"
        role="tablist"
        aria-orientation="horizontal"
        onKeyDown={handleTabListKeyDown}
      >
        {TAB_KEYS.map((key, index) => (
          <button
            key={key}
            type="button"
            id={tabId(key)}
            role="tab"
            aria-selected={activeTab === key}
            aria-controls={panelId(key)}
            tabIndex={activeTabIndex === index ? 0 : -1}
            className={`admin-tab${activeTab === key ? ' active' : ''}`}
            onClick={() => setActiveTabIndex(index)}
          >
            {t(TAB_I18N[key])}
          </button>
        ))}
      </div>

      {TAB_KEYS.map((key) => {
        const Panel = TAB_COMPONENTS[key];
        const isActive = activeTab === key;
        return (
          <div
            key={key}
            role="tabpanel"
            id={panelId(key)}
            aria-labelledby={tabId(key)}
            hidden={!isActive}
          >
            {isActive ? <Panel /> : null}
          </div>
        );
      })}
    </div>
  );
};

export default SettingsPage;
