import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { MenuData, MenuPackage, MenuItem, MenuSpotlight } from '../../../types/menu';
import { fetchMenu, updateMenu, uploadMenuImage } from '../../../services/menuApi';
import { usePersistedTab } from '../../../hooks/usePersistedTab';
import PackagesTab from './MenuPackages';
import CategoriesTab from './MenuCategories';
import ItemsTab from './MenuItems';
import SpotlightsTab from './MenuSpotlights';
import PricingTab from './MenuPricing';
import { TAB_KEYS, TAB_I18N, getToken } from './menuHelpers';
import type { TabKey } from './menuHelpers';
import './MenuManagement.css';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const MenuManagement: React.FC = () => {
  const { t } = useTranslation();
  // --- state -----------------------------------------------------------------
  const [data, setData] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [tabIndex, setTabIndex] = usePersistedTab('admin:menu-tab', 0);
  const tab: TabKey = TAB_KEYS[tabIndex] ?? TAB_KEYS[0];

  // modal state shared by multiple tabs
  const [editingPackage, setEditingPackage] = useState<MenuPackage | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingSpotlight, setEditingSpotlight] = useState<MenuSpotlight | null>(null);
  // inline-editing category id
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  // --- data loading ----------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchMenu()
      .then((menu) => {
        if (!cancelled) {
          setData(menu);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t('admin.menu.failedToLoad'));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // helper to mutate data & mark dirty
  const patch = useCallback((fn: (d: MenuData) => MenuData) => {
    setData((prev) => {
      if (!prev) return prev;
      const next = fn(prev);
      return next;
    });
    setDirty(true);
  }, []);

  // --- save ------------------------------------------------------------------
  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const saved = await updateMenu({ ...data, updatedAt: new Date().toISOString() }, getToken());
      setData(saved);
      setDirty(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : t('admin.menu.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  // --- reset -----------------------------------------------------------------
  const handleReset = async () => {
    if (!window.confirm(t('admin.menu.resetConfirm'))) return;
    setLoading(true);
    setDirty(false);
    try {
      const menu = await fetchMenu();
      setData(menu);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.menu.failedToReload'));
    } finally {
      setLoading(false);
    }
  };

  // --- image upload helper ---------------------------------------------------
  const handleImageUpload = async (base64: string, itemId: string): Promise<string> => {
    // Convert base64 to File then upload via API
    const res = await fetch(base64);
    const blob = await res.blob();
    const file = new File([blob], `menu-${itemId}.webp`, { type: blob.type });
    const url = await uploadMenuImage(file, itemId, getToken());
    return url;
  };

  // =======================================================================
  // RENDER
  // =======================================================================

  if (loading) {
    return (
      <div className="menu-mgmt__loading">
        <div className="menu-mgmt__spinner" />
        <p>{t('admin.menu.loading')}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="menu-mgmt__error">
        <p>{error ?? t('admin.menu.unknownError')}</p>
        <button
          className="menu-mgmt__btn menu-mgmt__btn--primary"
          onClick={() => window.location.reload()}
        >
          {t('admin.menu.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="menu-mgmt">
      {/* Header */}
      <div className="menu-mgmt__header">
        <h2 className="menu-mgmt__title">{t('admin.menu.title')}</h2>
        <div className="menu-mgmt__header-actions">
          <button
            className="menu-mgmt__btn menu-mgmt__btn--danger"
            onClick={handleReset}
            disabled={saving}
          >
            {t('admin.menu.resetToDefault')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="menu-mgmt__tabs">
        {TAB_KEYS.map((key, index) => (
          <button
            key={key}
            className={`menu-mgmt__tab ${tab === key ? 'menu-mgmt__tab--active' : ''}`}
            onClick={() => setTabIndex(index)}
          >
            {t(TAB_I18N[key])}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'packages' && (
        <PackagesTab
          packages={data.packages}
          categories={data.categories}
          onChange={(pkgs) => patch((d) => ({ ...d, packages: pkgs }))}
          editing={editingPackage}
          setEditing={setEditingPackage}
        />
      )}
      {tab === 'categories' && (
        <CategoriesTab
          categories={data.categories}
          onChange={(cats) => patch((d) => ({ ...d, categories: cats }))}
          editingId={editingCategoryId}
          setEditingId={setEditingCategoryId}
        />
      )}
      {tab === 'items' && (
        <ItemsTab
          items={data.items}
          categories={data.categories}
          onChange={(items) => patch((d) => ({ ...d, items }))}
          editing={editingItem}
          setEditing={setEditingItem}
          onImageUpload={handleImageUpload}
        />
      )}
      {tab === 'spotlights' && (
        <SpotlightsTab
          spotlights={data.spotlights}
          items={data.items}
          onChange={(spots) => patch((d) => ({ ...d, spotlights: spots }))}
          editing={editingSpotlight}
          setEditing={setEditingSpotlight}
          onImageUpload={handleImageUpload}
        />
      )}
      {tab === 'pricing' && (
        <PricingTab
          pricing={data.pricing}
          couponTiers={data.couponTiers}
          onPricingChange={(p) => patch((d) => ({ ...d, pricing: p }))}
          onTiersChange={(t) => patch((d) => ({ ...d, couponTiers: t }))}
        />
      )}

      {/* Sticky save bar */}
      {dirty && (
        <div className="menu-mgmt__save-bar">
          <p>{t('admin.menu.unsavedChanges')}</p>
          <div className="menu-mgmt__save-bar-actions">
            <button
              className="menu-mgmt__btn menu-mgmt__btn--secondary"
              onClick={handleReset}
              disabled={saving}
            >
              {t('admin.menu.discard')}
            </button>
            <button
              className="menu-mgmt__btn menu-mgmt__btn--primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? t('admin.menu.saving') : t('admin.menu.saveAll')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuManagement;
