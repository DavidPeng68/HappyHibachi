import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  MenuData,
  MenuPackage,
  MenuCategory,
  MenuItem,
  MenuSpotlight,
  CouponTier,
  PricingConfig,
  TranslatableText,
} from '../../types/menu';
import { fetchMenu, updateMenu, uploadMenuImage } from '../../services/menuApi';
import { MENU_ITEM_PRESET } from '../../utils/imageCompression';
import ImageUploader from '../../components/ui/ImageUploader';
import TranslatableField from './TranslatableField';
import './MenuManagement.css';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TabKey = 'packages' | 'categories' | 'items' | 'spotlights' | 'pricing';

const TAB_KEYS: TabKey[] = ['packages', 'categories', 'items', 'spotlights', 'pricing'];

const TAB_I18N: Record<TabKey, string> = {
  packages: 'admin.menu.tabPackages',
  categories: 'admin.menu.tabCategories',
  items: 'admin.menu.tabItems',
  spotlights: 'admin.menu.tabSpotlights',
  pricing: 'admin.menu.tabPricing',
};

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function emptyText(en = ''): TranslatableText {
  return { en };
}

function getToken(): string {
  return sessionStorage.getItem('admin_token') ?? '';
}

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
  const [tab, setTab] = useState<TabKey>('packages');

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
        {TAB_KEYS.map((key) => (
          <button
            key={key}
            className={`menu-mgmt__tab ${tab === key ? 'menu-mgmt__tab--active' : ''}`}
            onClick={() => setTab(key)}
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

// ===========================================================================
// TAB: Packages
// ===========================================================================

interface PackagesTabProps {
  packages: MenuPackage[];
  categories: MenuCategory[];
  onChange: (pkgs: MenuPackage[]) => void;
  editing: MenuPackage | null;
  setEditing: (p: MenuPackage | null) => void;
}

const PackagesTab: React.FC<PackagesTabProps> = ({
  packages,
  categories,
  onChange,
  editing,
  setEditing,
}) => {
  const { t } = useTranslation();
  const sorted = [...packages].sort((a, b) => a.sortOrder - b.sortOrder);

  const handleNew = () => {
    setEditing({
      id: uid(),
      name: emptyText(),
      description: emptyText(),
      pricePerPerson: 0,
      minGuests: 1,
      maxGuests: null,
      features: [],
      categoryIds: [],
      highlighted: false,
      sortOrder: packages.length,
      visible: true,
      proteinCount: 2,
      kidsPrice: null,
      flatPrice: null,
      serviceDuration: 90,
      serviceType: 'hibachi',
    });
  };

  const handleSave = (pkg: MenuPackage) => {
    const exists = packages.find((p) => p.id === pkg.id);
    if (exists) {
      onChange(packages.map((p) => (p.id === pkg.id ? pkg : p)));
    } else {
      onChange([...packages, pkg]);
    }
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm(t('admin.menu.deletePackageConfirm'))) return;
    onChange(packages.filter((p) => p.id !== id));
  };

  return (
    <>
      <div className="menu-mgmt__section-header">
        <h3 className="menu-mgmt__section-title">
          {t('admin.menu.packagesCount', { count: packages.length })}
        </h3>
        <button className="menu-mgmt__btn menu-mgmt__btn--primary" onClick={handleNew}>
          {t('admin.menu.addPackage')}
        </button>
      </div>

      {sorted.length === 0 && (
        <div className="menu-mgmt__empty">
          <p>{t('admin.menu.noPackages')}</p>
        </div>
      )}

      <div className="menu-mgmt__card-list">
        {sorted.map((pkg) => (
          <div
            key={pkg.id}
            className={`menu-mgmt__card ${pkg.highlighted ? 'menu-mgmt__card--highlighted' : ''}`}
          >
            <h4 className="menu-mgmt__card-title">{pkg.name.en || t('admin.menu.untitled')}</h4>
            <p className="menu-mgmt__card-subtitle">{pkg.description.en}</p>
            <span className="menu-mgmt__card-price">
              ${pkg.pricePerPerson}
              {t('admin.menu.perPerson')}
            </span>
            <div className="menu-mgmt__card-meta">
              <span className="menu-mgmt__card-badge">
                {pkg.minGuests}-{pkg.maxGuests ?? '...'} {t('admin.menu.guests')}
              </span>
              <span
                className={`menu-mgmt__card-badge ${pkg.visible ? 'menu-mgmt__card-badge--on' : 'menu-mgmt__card-badge--off'}`}
              >
                {pkg.visible ? t('admin.menu.visible') : t('admin.menu.hidden')}
              </span>
              {pkg.highlighted && (
                <span className="menu-mgmt__card-badge menu-mgmt__card-badge--on">
                  {t('admin.menu.highlighted')}
                </span>
              )}
            </div>
            <div className="menu-mgmt__card-actions">
              <button
                className="menu-mgmt__btn menu-mgmt__btn--secondary menu-mgmt__btn--small"
                onClick={() => setEditing({ ...pkg })}
              >
                {t('admin.menu.edit')}
              </button>
              <button
                className="menu-mgmt__btn menu-mgmt__btn--danger menu-mgmt__btn--small"
                onClick={() => handleDelete(pkg.id)}
              >
                {t('admin.menu.delete')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Package edit modal */}
      {editing && (
        <PackageModal
          pkg={editing}
          categories={categories}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}
    </>
  );
};

// --- Package Modal ---

const PackageModal: React.FC<{
  pkg: MenuPackage;
  categories: MenuCategory[];
  onSave: (p: MenuPackage) => void;
  onCancel: () => void;
}> = ({ pkg: initial, categories, onSave, onCancel }) => {
  const { t } = useTranslation();
  const defaults = {
    proteinCount: 2,
    kidsPrice: null as number | null,
    flatPrice: null as number | null,
    serviceDuration: 90,
    serviceType: 'hibachi',
  };
  const [pkg, setPkg] = useState<MenuPackage>({ ...defaults, ...initial });

  const up = (partial: Partial<MenuPackage>) => setPkg((p) => ({ ...p, ...partial }));

  const toggleCategory = (catId: string) => {
    const ids = pkg.categoryIds.includes(catId)
      ? pkg.categoryIds.filter((c) => c !== catId)
      : [...pkg.categoryIds, catId];
    up({ categoryIds: ids });
  };

  const addFeature = () => up({ features: [...pkg.features, emptyText()] });
  const removeFeature = (idx: number) => up({ features: pkg.features.filter((_, i) => i !== idx) });
  const updateFeature = (idx: number, val: TranslatableText) => {
    const next = [...pkg.features];
    next[idx] = val;
    up({ features: next });
  };

  return (
    <div className="menu-mgmt__overlay" onClick={onCancel}>
      <div className="menu-mgmt__modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="menu-mgmt__modal-title">
          {initial.name.en ? t('admin.menu.editPackage') : t('admin.menu.newPackage')}
        </h3>

        <TranslatableField
          label={t('admin.menu.name')}
          value={pkg.name}
          onChange={(v) => up({ name: v })}
        />
        <TranslatableField
          label={t('admin.menu.description')}
          value={pkg.description}
          onChange={(v) => up({ description: v })}
          mode="textarea"
        />

        <div className="menu-mgmt__field-row">
          <div className="menu-mgmt__field">
            <label className="menu-mgmt__field-label">{t('admin.menu.pricePerPerson')}</label>
            <input
              type="number"
              className="menu-mgmt__field-input"
              value={pkg.pricePerPerson}
              onChange={(e) => up({ pricePerPerson: Number(e.target.value) })}
              min={0}
              step={0.01}
            />
          </div>
          <div className="menu-mgmt__field">
            <label className="menu-mgmt__field-label">{t('admin.menu.sortOrder')}</label>
            <input
              type="number"
              className="menu-mgmt__field-input"
              value={pkg.sortOrder}
              onChange={(e) => up({ sortOrder: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="menu-mgmt__field-row">
          <div className="menu-mgmt__field">
            <label className="menu-mgmt__field-label">{t('admin.menu.minGuests')}</label>
            <input
              type="number"
              className="menu-mgmt__field-input"
              value={pkg.minGuests}
              onChange={(e) => up({ minGuests: Number(e.target.value) })}
              min={1}
            />
          </div>
          <div className="menu-mgmt__field">
            <label className="menu-mgmt__field-label">{t('admin.menu.maxGuests')}</label>
            <input
              type="number"
              className="menu-mgmt__field-input"
              value={pkg.maxGuests ?? ''}
              onChange={(e) => up({ maxGuests: e.target.value ? Number(e.target.value) : null })}
              min={1}
            />
          </div>
        </div>

        <div className="menu-mgmt__field-row">
          <div className="menu-mgmt__field">
            <label className="menu-mgmt__field-label">{t('admin.menu.proteinsPerPerson')}</label>
            <input
              type="number"
              className="menu-mgmt__field-input"
              value={pkg.proteinCount}
              onChange={(e) => up({ proteinCount: Number(e.target.value) })}
              min={0}
              max={10}
            />
          </div>
          <div className="menu-mgmt__field">
            <label className="menu-mgmt__field-label">{t('admin.menu.kidsPrice')}</label>
            <input
              type="number"
              className="menu-mgmt__field-input"
              value={pkg.kidsPrice ?? ''}
              onChange={(e) => up({ kidsPrice: e.target.value ? Number(e.target.value) : null })}
              min={0}
              step={0.01}
            />
          </div>
        </div>

        <div className="menu-mgmt__field-row">
          <div className="menu-mgmt__field">
            <label className="menu-mgmt__field-label">{t('admin.menu.flatPrice')}</label>
            <input
              type="number"
              className="menu-mgmt__field-input"
              value={pkg.flatPrice ?? ''}
              onChange={(e) => up({ flatPrice: e.target.value ? Number(e.target.value) : null })}
              min={0}
              step={0.01}
            />
          </div>
          <div className="menu-mgmt__field">
            <label className="menu-mgmt__field-label">{t('admin.menu.serviceDuration')}</label>
            <input
              type="number"
              className="menu-mgmt__field-input"
              value={pkg.serviceDuration}
              onChange={(e) => up({ serviceDuration: Number(e.target.value) })}
              min={30}
              step={30}
            />
          </div>
        </div>

        <div className="menu-mgmt__field">
          <label className="menu-mgmt__field-label">{t('admin.menu.serviceType')}</label>
          <input
            type="text"
            className="menu-mgmt__field-input"
            value={pkg.serviceType}
            onChange={(e) => up({ serviceType: e.target.value })}
            placeholder={t('admin.menu.serviceTypePlaceholder')}
          />
        </div>

        <div className="menu-mgmt__field">
          <label className="menu-mgmt__field-label">{t('admin.menu.includedCategories')}</label>
          {categories.map((cat) => (
            <label key={cat.id} className="menu-mgmt__field-checkbox">
              <input
                type="checkbox"
                checked={pkg.categoryIds.includes(cat.id)}
                onChange={() => toggleCategory(cat.id)}
              />
              {cat.name.en}
            </label>
          ))}
        </div>

        <div className="menu-mgmt__field">
          <label className="menu-mgmt__field-checkbox">
            <input
              type="checkbox"
              checked={pkg.highlighted}
              onChange={(e) => up({ highlighted: e.target.checked })}
            />
            {t('admin.menu.highlightedFeatured')}
          </label>
        </div>
        <div className="menu-mgmt__field">
          <label className="menu-mgmt__field-checkbox">
            <input
              type="checkbox"
              checked={pkg.visible}
              onChange={(e) => up({ visible: e.target.checked })}
            />
            {t('admin.menu.visibleOnSite')}
          </label>
        </div>

        {/* Features */}
        <div className="menu-mgmt__features-list">
          <div className="menu-mgmt__section-header">
            <label className="menu-mgmt__field-label">{t('admin.menu.features')}</label>
            <button
              className="menu-mgmt__btn menu-mgmt__btn--secondary menu-mgmt__btn--small"
              onClick={addFeature}
              type="button"
            >
              {t('admin.menu.addFeature')}
            </button>
          </div>
          {pkg.features.map((feat, idx) => (
            <div key={idx} className="menu-mgmt__feature-row">
              <TranslatableField
                value={feat}
                onChange={(v) => updateFeature(idx, v)}
                placeholder={t('admin.menu.featurePlaceholder')}
              />
              <button
                className="menu-mgmt__btn menu-mgmt__btn--danger menu-mgmt__btn--small"
                onClick={() => removeFeature(idx)}
                type="button"
              >
                X
              </button>
            </div>
          ))}
        </div>

        <div className="menu-mgmt__modal-footer">
          <button
            className="menu-mgmt__btn menu-mgmt__btn--secondary"
            onClick={onCancel}
            type="button"
          >
            {t('admin.menu.cancel')}
          </button>
          <button
            className="menu-mgmt__btn menu-mgmt__btn--primary"
            onClick={() => onSave(pkg)}
            type="button"
          >
            {t('admin.menu.save')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ===========================================================================
// TAB: Categories
// ===========================================================================

interface CategoriesTabProps {
  categories: MenuCategory[];
  onChange: (cats: MenuCategory[]) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
}

const CategoriesTab: React.FC<CategoriesTabProps> = ({
  categories,
  onChange,
  editingId,
  setEditingId,
}) => {
  const { t } = useTranslation();
  const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

  const [draft, setDraft] = useState<MenuCategory | null>(null);

  useEffect(() => {
    if (editingId) {
      const cat = categories.find((c) => c.id === editingId);
      if (cat) setDraft({ ...cat });
    } else {
      setDraft(null);
    }
  }, [editingId, categories]);

  const handleNew = () => {
    const newCat: MenuCategory = {
      id: uid(),
      name: emptyText(),
      description: emptyText(),
      slug: '',
      sortOrder: categories.length,
      visible: true,
    };
    setDraft(newCat);
    setEditingId(newCat.id);
  };

  const handleSave = () => {
    if (!draft) return;
    const exists = categories.find((c) => c.id === draft.id);
    if (exists) {
      onChange(categories.map((c) => (c.id === draft.id ? draft : c)));
    } else {
      onChange([...categories, draft]);
    }
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm(t('admin.menu.deleteCategoryConfirm'))) return;
    onChange(categories.filter((c) => c.id !== id));
    if (editingId === id) setEditingId(null);
  };

  return (
    <>
      <div className="menu-mgmt__section-header">
        <h3 className="menu-mgmt__section-title">
          {t('admin.menu.categoriesCount', { count: categories.length })}
        </h3>
        <button className="menu-mgmt__btn menu-mgmt__btn--primary" onClick={handleNew}>
          {t('admin.menu.addCategory')}
        </button>
      </div>

      {sorted.length === 0 && (
        <div className="menu-mgmt__empty">
          <p>{t('admin.menu.noCategories')}</p>
        </div>
      )}

      <div className="menu-mgmt__list">
        {sorted.map((cat) => {
          const isEditing = editingId === cat.id && draft;
          return (
            <div key={cat.id} className="menu-mgmt__list-row">
              {isEditing && draft ? (
                <>
                  <div style={{ flex: 1 }}>
                    <TranslatableField
                      label={t('admin.menu.name')}
                      value={draft.name}
                      onChange={(v) => setDraft({ ...draft, name: v })}
                    />
                    <TranslatableField
                      label={t('admin.menu.description')}
                      value={draft.description}
                      onChange={(v) => setDraft({ ...draft, description: v })}
                      mode="textarea"
                    />
                    <div className="menu-mgmt__field-row">
                      <div className="menu-mgmt__field">
                        <label className="menu-mgmt__field-label">{t('admin.menu.slug')}</label>
                        <input
                          className="menu-mgmt__field-input"
                          value={draft.slug}
                          onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                        />
                      </div>
                      <div className="menu-mgmt__field">
                        <label className="menu-mgmt__field-label">
                          {t('admin.menu.sortOrder')}
                        </label>
                        <input
                          type="number"
                          className="menu-mgmt__field-input"
                          value={draft.sortOrder}
                          onChange={(e) =>
                            setDraft({ ...draft, sortOrder: Number(e.target.value) })
                          }
                        />
                      </div>
                    </div>
                    <label className="menu-mgmt__field-checkbox">
                      <input
                        type="checkbox"
                        checked={draft.visible}
                        onChange={(e) => setDraft({ ...draft, visible: e.target.checked })}
                      />
                      {t('admin.menu.visible')}
                    </label>
                  </div>
                  <div className="menu-mgmt__list-row-actions">
                    <button
                      className="menu-mgmt__btn menu-mgmt__btn--primary menu-mgmt__btn--small"
                      onClick={handleSave}
                    >
                      {t('admin.menu.save')}
                    </button>
                    <button
                      className="menu-mgmt__btn menu-mgmt__btn--secondary menu-mgmt__btn--small"
                      onClick={() => setEditingId(null)}
                    >
                      {t('admin.menu.cancel')}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span className="menu-mgmt__list-row-order">{cat.sortOrder}</span>
                  <span className="menu-mgmt__list-row-name">
                    {cat.name.en || t('admin.menu.untitled')}
                  </span>
                  <span className="menu-mgmt__list-row-slug">{cat.slug}</span>
                  <span
                    className={`menu-mgmt__card-badge ${cat.visible ? 'menu-mgmt__card-badge--on' : 'menu-mgmt__card-badge--off'}`}
                  >
                    {cat.visible ? t('admin.menu.visible') : t('admin.menu.hidden')}
                  </span>
                  <div className="menu-mgmt__list-row-actions">
                    <button
                      className="menu-mgmt__btn menu-mgmt__btn--secondary menu-mgmt__btn--small"
                      onClick={() => setEditingId(cat.id)}
                    >
                      {t('admin.menu.edit')}
                    </button>
                    <button
                      className="menu-mgmt__btn menu-mgmt__btn--danger menu-mgmt__btn--small"
                      onClick={() => handleDelete(cat.id)}
                    >
                      {t('admin.menu.delete')}
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};

// ===========================================================================
// TAB: Items
// ===========================================================================

interface ItemsTabProps {
  items: MenuItem[];
  categories: MenuCategory[];
  onChange: (items: MenuItem[]) => void;
  editing: MenuItem | null;
  setEditing: (item: MenuItem | null) => void;
  onImageUpload: (base64: string, itemId: string) => Promise<string>;
}

const ItemsTab: React.FC<ItemsTabProps> = ({
  items,
  categories,
  onChange,
  editing,
  setEditing,
  onImageUpload,
}) => {
  const { t } = useTranslation();
  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);

  const handleNew = () => {
    setEditing({
      id: uid(),
      categoryId: categories[0]?.id ?? '',
      name: emptyText(),
      description: emptyText(),
      price: 0,
      priceType: 'included',
      imageUrl: '',
      tags: [],
      available: true,
      orderable: true,
      sortOrder: items.length,
    });
  };

  const handleSave = (item: MenuItem) => {
    const exists = items.find((i) => i.id === item.id);
    if (exists) {
      onChange(items.map((i) => (i.id === item.id ? item : i)));
    } else {
      onChange([...items, item]);
    }
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm(t('admin.menu.deleteItemConfirm'))) return;
    onChange(items.filter((i) => i.id !== id));
  };

  return (
    <>
      <div className="menu-mgmt__section-header">
        <h3 className="menu-mgmt__section-title">
          {t('admin.menu.itemsCount', { count: items.length })}
        </h3>
        <button className="menu-mgmt__btn menu-mgmt__btn--primary" onClick={handleNew}>
          {t('admin.menu.addItem')}
        </button>
      </div>

      {sorted.length === 0 && (
        <div className="menu-mgmt__empty">
          <p>{t('admin.menu.noItems')}</p>
        </div>
      )}

      <div className="menu-mgmt__item-grid">
        {sorted.map((item) => (
          <div key={item.id} className="menu-mgmt__item-card">
            {item.imageUrl ? (
              <img className="menu-mgmt__item-thumb" src={item.imageUrl} alt={item.name.en} />
            ) : (
              <div className="menu-mgmt__item-thumb-placeholder">{t('admin.menu.noImage')}</div>
            )}
            <div className="menu-mgmt__item-info">
              <h4 className="menu-mgmt__item-name">{item.name.en || t('admin.menu.untitled')}</h4>
              <span className="menu-mgmt__item-price">${item.price.toFixed(2)}</span>
              <span
                className={`menu-mgmt__item-status ${item.available ? 'menu-mgmt__item-status--available' : 'menu-mgmt__item-status--unavailable'}`}
              >
                {item.available ? t('admin.menu.available') : t('admin.menu.unavailable')}
              </span>
              <div className="menu-mgmt__item-actions">
                <button
                  className="menu-mgmt__btn menu-mgmt__btn--secondary menu-mgmt__btn--small"
                  onClick={() => setEditing({ ...item })}
                >
                  {t('admin.menu.edit')}
                </button>
                <button
                  className="menu-mgmt__btn menu-mgmt__btn--danger menu-mgmt__btn--small"
                  onClick={() => handleDelete(item.id)}
                >
                  {t('admin.menu.delete')}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <ItemModal
          item={editing}
          categories={categories}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
          onImageUpload={onImageUpload}
        />
      )}
    </>
  );
};

// --- Item Modal ---

const ItemModal: React.FC<{
  item: MenuItem;
  categories: MenuCategory[];
  onSave: (item: MenuItem) => void;
  onCancel: () => void;
  onImageUpload: (base64: string, itemId: string) => Promise<string>;
}> = ({ item: initial, categories, onSave, onCancel, onImageUpload }) => {
  const { t } = useTranslation();
  const [item, setItem] = useState<MenuItem>(initial);
  const [uploading, setUploading] = useState(false);
  const [tagsStr, setTagsStr] = useState(initial.tags.join(', '));

  const up = (partial: Partial<MenuItem>) => setItem((i) => ({ ...i, ...partial }));

  const handleImageChange = async (base64: string) => {
    setUploading(true);
    try {
      const url = await onImageUpload(base64, item.id);
      up({ imageUrl: url });
    } catch {
      alert(t('admin.menu.imageUploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const handleTagsBlur = () => {
    up({
      tags: tagsStr
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });
  };

  return (
    <div className="menu-mgmt__overlay" onClick={onCancel}>
      <div className="menu-mgmt__modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="menu-mgmt__modal-title">
          {initial.name.en ? t('admin.menu.editItem') : t('admin.menu.newItem')}
        </h3>

        <TranslatableField
          label={t('admin.menu.name')}
          value={item.name}
          onChange={(v) => up({ name: v })}
        />
        <TranslatableField
          label={t('admin.menu.description')}
          value={item.description}
          onChange={(v) => up({ description: v })}
          mode="textarea"
        />

        <div className="menu-mgmt__field-row">
          <div className="menu-mgmt__field">
            <label className="menu-mgmt__field-label">{t('admin.menu.price')}</label>
            <input
              type="number"
              className="menu-mgmt__field-input"
              value={item.price}
              onChange={(e) => up({ price: Number(e.target.value) })}
              min={0}
              step={0.01}
            />
          </div>
          <div className="menu-mgmt__field">
            <label className="menu-mgmt__field-label">{t('admin.menu.priceType')}</label>
            <select
              className="menu-mgmt__field-select"
              value={item.priceType}
              onChange={(e) => up({ priceType: e.target.value as MenuItem['priceType'] })}
            >
              <option value="included">{t('admin.menu.priceIncluded')}</option>
              <option value="per_person">{t('admin.menu.pricePerPersonItem')}</option>
              <option value="per_item">{t('admin.menu.pricePerItem')}</option>
              <option value="upgrade">{t('admin.menu.priceUpgrade')}</option>
            </select>
          </div>
        </div>

        <div className="menu-mgmt__field-row">
          <div className="menu-mgmt__field">
            <label className="menu-mgmt__field-label">{t('admin.menu.category')}</label>
            <select
              className="menu-mgmt__field-select"
              value={item.categoryId}
              onChange={(e) => up({ categoryId: e.target.value })}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name.en}
                </option>
              ))}
            </select>
          </div>
          <div className="menu-mgmt__field">
            <label className="menu-mgmt__field-label">{t('admin.menu.sortOrder')}</label>
            <input
              type="number"
              className="menu-mgmt__field-input"
              value={item.sortOrder}
              onChange={(e) => up({ sortOrder: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="menu-mgmt__field">
          <label className="menu-mgmt__field-label">{t('admin.menu.tags')}</label>
          <input
            className="menu-mgmt__field-input"
            value={tagsStr}
            onChange={(e) => setTagsStr(e.target.value)}
            onBlur={handleTagsBlur}
            placeholder={t('admin.menu.tagsPlaceholder')}
          />
        </div>

        <div className="menu-mgmt__field">
          <label className="menu-mgmt__field-checkbox">
            <input
              type="checkbox"
              checked={item.available}
              onChange={(e) => up({ available: e.target.checked })}
            />
            {t('admin.menu.available')}
          </label>
        </div>
        <div className="menu-mgmt__field">
          <label className="menu-mgmt__field-checkbox">
            <input
              type="checkbox"
              checked={item.orderable}
              onChange={(e) => up({ orderable: e.target.checked })}
            />
            {t('admin.menu.orderable')}
          </label>
        </div>

        <div className="menu-mgmt__field">
          <label className="menu-mgmt__field-label">{t('admin.menu.image')}</label>
          <ImageUploader
            value={item.imageUrl}
            onChange={handleImageChange}
            onRemove={() => up({ imageUrl: '' })}
            preset={MENU_ITEM_PRESET}
            aspectRatio={4 / 3}
            label={uploading ? t('admin.menu.uploading') : undefined}
          />
        </div>

        <div className="menu-mgmt__modal-footer">
          <button
            className="menu-mgmt__btn menu-mgmt__btn--secondary"
            onClick={onCancel}
            type="button"
          >
            {t('admin.menu.cancel')}
          </button>
          <button
            className="menu-mgmt__btn menu-mgmt__btn--primary"
            onClick={() => onSave(item)}
            type="button"
            disabled={uploading}
          >
            {t('admin.menu.save')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ===========================================================================
// TAB: Spotlights
// ===========================================================================

interface SpotlightsTabProps {
  spotlights: MenuSpotlight[];
  items: MenuItem[];
  onChange: (spots: MenuSpotlight[]) => void;
  editing: MenuSpotlight | null;
  setEditing: (s: MenuSpotlight | null) => void;
  onImageUpload: (base64: string, itemId: string) => Promise<string>;
}

const SpotlightsTab: React.FC<SpotlightsTabProps> = ({
  spotlights,
  items,
  onChange,
  editing,
  setEditing,
  onImageUpload,
}) => {
  const { t } = useTranslation();
  const sorted = [...spotlights].sort((a, b) => a.sortOrder - b.sortOrder);

  const handleNew = () => {
    setEditing({
      id: uid(),
      menuItemId: items[0]?.id ?? '',
      title: emptyText(),
      subtitle: emptyText(),
      imageUrl: '',
      videoUrl: '',
      sortOrder: spotlights.length,
      visible: true,
    });
  };

  const handleSave = (spot: MenuSpotlight) => {
    const exists = spotlights.find((s) => s.id === spot.id);
    if (exists) {
      onChange(spotlights.map((s) => (s.id === spot.id ? spot : s)));
    } else {
      onChange([...spotlights, spot]);
    }
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm(t('admin.menu.deleteSpotlightConfirm'))) return;
    onChange(spotlights.filter((s) => s.id !== id));
  };

  const getItemName = (itemId: string) =>
    items.find((i) => i.id === itemId)?.name.en ?? t('admin.menu.unknownItem');

  return (
    <>
      <div className="menu-mgmt__section-header">
        <h3 className="menu-mgmt__section-title">
          {t('admin.menu.spotlightsCount', { count: spotlights.length })}
        </h3>
        <button className="menu-mgmt__btn menu-mgmt__btn--primary" onClick={handleNew}>
          {t('admin.menu.addSpotlight')}
        </button>
      </div>

      {sorted.length === 0 && (
        <div className="menu-mgmt__empty">
          <p>{t('admin.menu.noSpotlights')}</p>
        </div>
      )}

      <div className="menu-mgmt__card-list">
        {sorted.map((spot) => (
          <div key={spot.id} className="menu-mgmt__card">
            {spot.imageUrl && (
              <img className="menu-mgmt__spotlight-img" src={spot.imageUrl} alt={spot.title.en} />
            )}
            <h4 className="menu-mgmt__card-title">{spot.title.en || t('admin.menu.untitled')}</h4>
            <p className="menu-mgmt__card-subtitle">{spot.subtitle.en}</p>
            <div className="menu-mgmt__card-meta">
              <span className="menu-mgmt__card-badge">
                {t('admin.menu.itemLabel', { name: getItemName(spot.menuItemId) })}
              </span>
              <span
                className={`menu-mgmt__card-badge ${spot.visible ? 'menu-mgmt__card-badge--on' : 'menu-mgmt__card-badge--off'}`}
              >
                {spot.visible ? t('admin.menu.visible') : t('admin.menu.hidden')}
              </span>
              {spot.videoUrl && (
                <span className="menu-mgmt__card-badge">{t('admin.menu.hasVideo')}</span>
              )}
            </div>
            <div className="menu-mgmt__card-actions">
              <button
                className="menu-mgmt__btn menu-mgmt__btn--secondary menu-mgmt__btn--small"
                onClick={() => setEditing({ ...spot })}
              >
                {t('admin.menu.edit')}
              </button>
              <button
                className="menu-mgmt__btn menu-mgmt__btn--danger menu-mgmt__btn--small"
                onClick={() => handleDelete(spot.id)}
              >
                {t('admin.menu.delete')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <SpotlightModal
          spotlight={editing}
          items={items}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
          onImageUpload={onImageUpload}
        />
      )}
    </>
  );
};

// --- Spotlight Modal ---

const SpotlightModal: React.FC<{
  spotlight: MenuSpotlight;
  items: MenuItem[];
  onSave: (s: MenuSpotlight) => void;
  onCancel: () => void;
  onImageUpload: (base64: string, itemId: string) => Promise<string>;
}> = ({ spotlight: initial, items, onSave, onCancel, onImageUpload }) => {
  const { t } = useTranslation();
  const [spot, setSpot] = useState<MenuSpotlight>(initial);
  const [uploading, setUploading] = useState(false);

  const up = (partial: Partial<MenuSpotlight>) => setSpot((s) => ({ ...s, ...partial }));

  const handleImageChange = async (base64: string) => {
    setUploading(true);
    try {
      const url = await onImageUpload(base64, spot.id);
      up({ imageUrl: url });
    } catch {
      alert(t('admin.menu.imageUploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="menu-mgmt__overlay" onClick={onCancel}>
      <div className="menu-mgmt__modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="menu-mgmt__modal-title">
          {initial.title.en ? t('admin.menu.editSpotlight') : t('admin.menu.newSpotlight')}
        </h3>

        <TranslatableField
          label={t('admin.menu.spotlightTitle')}
          value={spot.title}
          onChange={(v) => up({ title: v })}
        />
        <TranslatableField
          label={t('admin.menu.subtitle')}
          value={spot.subtitle}
          onChange={(v) => up({ subtitle: v })}
          mode="textarea"
        />

        <div className="menu-mgmt__field">
          <label className="menu-mgmt__field-label">{t('admin.menu.menuItem')}</label>
          <select
            className="menu-mgmt__field-select"
            value={spot.menuItemId}
            onChange={(e) => up({ menuItemId: e.target.value })}
          >
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name.en}
              </option>
            ))}
          </select>
        </div>

        <div className="menu-mgmt__field">
          <label className="menu-mgmt__field-label">{t('admin.menu.videoUrl')}</label>
          <input
            className="menu-mgmt__field-input"
            value={spot.videoUrl ?? ''}
            onChange={(e) => up({ videoUrl: e.target.value || undefined })}
            placeholder={t('admin.menu.videoUrlPlaceholder')}
          />
        </div>

        <div className="menu-mgmt__field-row">
          <div className="menu-mgmt__field">
            <label className="menu-mgmt__field-label">{t('admin.menu.sortOrder')}</label>
            <input
              type="number"
              className="menu-mgmt__field-input"
              value={spot.sortOrder}
              onChange={(e) => up({ sortOrder: Number(e.target.value) })}
            />
          </div>
          <div className="menu-mgmt__field">
            <label className="menu-mgmt__field-checkbox" style={{ marginTop: '1.5rem' }}>
              <input
                type="checkbox"
                checked={spot.visible}
                onChange={(e) => up({ visible: e.target.checked })}
              />
              {t('admin.menu.visible')}
            </label>
          </div>
        </div>

        <div className="menu-mgmt__field">
          <label className="menu-mgmt__field-label">{t('admin.menu.image')}</label>
          <ImageUploader
            value={spot.imageUrl}
            onChange={handleImageChange}
            onRemove={() => up({ imageUrl: '' })}
            preset={MENU_ITEM_PRESET}
            aspectRatio={16 / 9}
            label={uploading ? t('admin.menu.uploading') : undefined}
          />
        </div>

        <div className="menu-mgmt__modal-footer">
          <button
            className="menu-mgmt__btn menu-mgmt__btn--secondary"
            onClick={onCancel}
            type="button"
          >
            {t('admin.menu.cancel')}
          </button>
          <button
            className="menu-mgmt__btn menu-mgmt__btn--primary"
            onClick={() => onSave(spot)}
            type="button"
            disabled={uploading}
          >
            {t('admin.menu.save')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ===========================================================================
// TAB: Pricing
// ===========================================================================

interface PricingTabProps {
  pricing: PricingConfig;
  couponTiers: CouponTier[];
  onPricingChange: (p: PricingConfig) => void;
  onTiersChange: (t: CouponTier[]) => void;
}

const PricingTab: React.FC<PricingTabProps> = ({
  pricing,
  couponTiers,
  onPricingChange,
  onTiersChange,
}) => {
  const { t } = useTranslation();
  const upP = (partial: Partial<PricingConfig>) => onPricingChange({ ...pricing, ...partial });

  const sorted = [...couponTiers].sort((a, b) => a.sortOrder - b.sortOrder);

  const addTier = () => {
    onTiersChange([
      ...couponTiers,
      {
        id: uid(),
        guestRange: emptyText(),
        discount: 0,
        sortOrder: couponTiers.length,
      },
    ]);
  };

  const updateTier = (id: string, partial: Partial<CouponTier>) => {
    onTiersChange(couponTiers.map((t) => (t.id === id ? { ...t, ...partial } : t)));
  };

  const removeTier = (id: string) => {
    if (!window.confirm(t('admin.menu.removeTierConfirm'))) return;
    onTiersChange(couponTiers.filter((t) => t.id !== id));
  };

  return (
    <>
      <div className="menu-mgmt__section-header">
        <h3 className="menu-mgmt__section-title">{t('admin.menu.pricingConfig')}</h3>
      </div>

      <div className="menu-mgmt__pricing-grid">
        <div className="menu-mgmt__field">
          <label className="menu-mgmt__field-label">{t('admin.menu.kidsPriceLabel')}</label>
          <input
            type="number"
            className="menu-mgmt__field-input"
            value={pricing.kidsPrice}
            onChange={(e) => upP({ kidsPrice: Number(e.target.value) })}
            min={0}
            step={0.01}
          />
        </div>
        <div className="menu-mgmt__field">
          <label className="menu-mgmt__field-label">{t('admin.menu.creditCardFee')}</label>
          <input
            type="number"
            className="menu-mgmt__field-input"
            value={pricing.creditCardFee}
            onChange={(e) => upP({ creditCardFee: Number(e.target.value) })}
            min={0}
            step={0.1}
          />
        </div>
        <div className="menu-mgmt__field">
          <label className="menu-mgmt__field-label">{t('admin.menu.suggestedGratuity')}</label>
          <input
            type="number"
            className="menu-mgmt__field-input"
            value={pricing.gratuitySuggested}
            onChange={(e) => upP({ gratuitySuggested: Number(e.target.value) })}
            min={0}
            step={1}
          />
        </div>
        <div className="menu-mgmt__field">
          <label className="menu-mgmt__field-label">{t('admin.menu.cancellationFee')}</label>
          <input
            type="number"
            className="menu-mgmt__field-input"
            value={pricing.cancellationFee}
            onChange={(e) => upP({ cancellationFee: Number(e.target.value) })}
            min={0}
            step={0.01}
          />
        </div>
        <div className="menu-mgmt__field">
          <label className="menu-mgmt__field-label">{t('admin.menu.minimumOrder')}</label>
          <input
            type="number"
            className="menu-mgmt__field-input"
            value={pricing.minimumOrder}
            onChange={(e) => upP({ minimumOrder: Number(e.target.value) })}
            min={0}
            step={0.01}
          />
        </div>
      </div>

      <TranslatableField
        label={t('admin.menu.outdoorNote')}
        value={pricing.outdoorNote}
        onChange={(v) => upP({ outdoorNote: v })}
        mode="textarea"
      />
      <TranslatableField
        label={t('admin.menu.weatherNote')}
        value={pricing.weatherNote}
        onChange={(v) => upP({ weatherNote: v })}
        mode="textarea"
      />

      {/* Coupon Tiers */}
      <div className="menu-mgmt__tier-list">
        <div className="menu-mgmt__section-header">
          <h3 className="menu-mgmt__section-title">
            {t('admin.menu.couponTiersCount', { count: couponTiers.length })}
          </h3>
          <button className="menu-mgmt__btn menu-mgmt__btn--primary" onClick={addTier}>
            {t('admin.menu.addTier')}
          </button>
        </div>

        {sorted.length === 0 && (
          <div className="menu-mgmt__empty">
            <p>{t('admin.menu.noCouponTiers')}</p>
          </div>
        )}

        {sorted.map((tier) => (
          <div key={tier.id} className="menu-mgmt__tier-row">
            <div>
              <TranslatableField
                label={t('admin.menu.guestRange')}
                value={tier.guestRange}
                onChange={(v) => updateTier(tier.id, { guestRange: v })}
                placeholder={t('admin.menu.guestRangePlaceholder')}
              />
            </div>
            <div className="menu-mgmt__field">
              <label className="menu-mgmt__field-label">{t('admin.menu.discount')}</label>
              <input
                type="number"
                className="menu-mgmt__field-input"
                value={tier.discount}
                onChange={(e) => updateTier(tier.id, { discount: Number(e.target.value) })}
                min={0}
                max={100}
                step={1}
              />
            </div>
            <div className="menu-mgmt__field">
              <label className="menu-mgmt__field-label">{t('admin.menu.order')}</label>
              <input
                type="number"
                className="menu-mgmt__field-input"
                value={tier.sortOrder}
                onChange={(e) => updateTier(tier.id, { sortOrder: Number(e.target.value) })}
              />
            </div>
            <div style={{ alignSelf: 'end' }}>
              <button
                className="menu-mgmt__btn menu-mgmt__btn--danger menu-mgmt__btn--small"
                onClick={() => removeTier(tier.id)}
              >
                {t('admin.menu.remove')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default MenuManagement;
