import React, { useState, useEffect, useCallback } from 'react';
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

const TABS: { key: TabKey; label: string }[] = [
  { key: 'packages', label: 'Packages' },
  { key: 'categories', label: 'Categories' },
  { key: 'items', label: 'Items' },
  { key: 'spotlights', label: 'Spotlight' },
  { key: 'pricing', label: 'Pricing' },
];

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
          setError(err instanceof Error ? err.message : 'Failed to load menu');
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
      alert(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // --- reset -----------------------------------------------------------------
  const handleReset = async () => {
    if (
      !window.confirm(
        'Are you sure you want to reset? All unsaved changes will be lost and data will be reloaded from the server.'
      )
    )
      return;
    setLoading(true);
    setDirty(false);
    try {
      const menu = await fetchMenu();
      setData(menu);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reload');
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
        <p>Loading menu data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="menu-mgmt__error">
        <p>{error ?? 'Unknown error'}</p>
        <button
          className="menu-mgmt__btn menu-mgmt__btn--primary"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="menu-mgmt">
      {/* Header */}
      <div className="menu-mgmt__header">
        <h2 className="menu-mgmt__title">Menu Management</h2>
        <div className="menu-mgmt__header-actions">
          <button
            className="menu-mgmt__btn menu-mgmt__btn--danger"
            onClick={handleReset}
            disabled={saving}
          >
            Reset to Default
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="menu-mgmt__tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`menu-mgmt__tab ${tab === t.key ? 'menu-mgmt__tab--active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
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
          <p>You have unsaved changes.</p>
          <div className="menu-mgmt__save-bar-actions">
            <button
              className="menu-mgmt__btn menu-mgmt__btn--secondary"
              onClick={handleReset}
              disabled={saving}
            >
              Discard
            </button>
            <button
              className="menu-mgmt__btn menu-mgmt__btn--primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save All Changes'}
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
    if (!window.confirm('Delete this package?')) return;
    onChange(packages.filter((p) => p.id !== id));
  };

  return (
    <>
      <div className="menu-mgmt__section-header">
        <h3 className="menu-mgmt__section-title">Packages ({packages.length})</h3>
        <button className="menu-mgmt__btn menu-mgmt__btn--primary" onClick={handleNew}>
          + Add Package
        </button>
      </div>

      {sorted.length === 0 && (
        <div className="menu-mgmt__empty">
          <p>No packages yet. Add one to get started.</p>
        </div>
      )}

      <div className="menu-mgmt__card-list">
        {sorted.map((pkg) => (
          <div
            key={pkg.id}
            className={`menu-mgmt__card ${pkg.highlighted ? 'menu-mgmt__card--highlighted' : ''}`}
          >
            <h4 className="menu-mgmt__card-title">{pkg.name.en || 'Untitled'}</h4>
            <p className="menu-mgmt__card-subtitle">{pkg.description.en}</p>
            <span className="menu-mgmt__card-price">${pkg.pricePerPerson}/person</span>
            <div className="menu-mgmt__card-meta">
              <span className="menu-mgmt__card-badge">
                {pkg.minGuests}-{pkg.maxGuests ?? '...'} guests
              </span>
              <span
                className={`menu-mgmt__card-badge ${pkg.visible ? 'menu-mgmt__card-badge--on' : 'menu-mgmt__card-badge--off'}`}
              >
                {pkg.visible ? 'Visible' : 'Hidden'}
              </span>
              {pkg.highlighted && (
                <span className="menu-mgmt__card-badge menu-mgmt__card-badge--on">Highlighted</span>
              )}
            </div>
            <div className="menu-mgmt__card-actions">
              <button
                className="menu-mgmt__btn menu-mgmt__btn--secondary menu-mgmt__btn--small"
                onClick={() => setEditing({ ...pkg })}
              >
                Edit
              </button>
              <button
                className="menu-mgmt__btn menu-mgmt__btn--danger menu-mgmt__btn--small"
                onClick={() => handleDelete(pkg.id)}
              >
                Delete
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
          {initial.name.en ? 'Edit Package' : 'New Package'}
        </h3>

        <TranslatableField label="Name" value={pkg.name} onChange={(v) => up({ name: v })} />
        <TranslatableField
          label="Description"
          value={pkg.description}
          onChange={(v) => up({ description: v })}
          mode="textarea"
        />

        <div className="menu-mgmt__field-row">
          <div className="menu-mgmt__field">
            <label className="menu-mgmt__field-label">Price Per Person ($)</label>
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
            <label className="menu-mgmt__field-label">Sort Order</label>
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
            <label className="menu-mgmt__field-label">Min Guests</label>
            <input
              type="number"
              className="menu-mgmt__field-input"
              value={pkg.minGuests}
              onChange={(e) => up({ minGuests: Number(e.target.value) })}
              min={1}
            />
          </div>
          <div className="menu-mgmt__field">
            <label className="menu-mgmt__field-label">Max Guests (blank = unlimited)</label>
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
            <label className="menu-mgmt__field-label">Proteins per person</label>
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
            <label className="menu-mgmt__field-label">Kids price (blank = global)</label>
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
            <label className="menu-mgmt__field-label">Flat price (blank = per person)</label>
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
            <label className="menu-mgmt__field-label">Service duration (min)</label>
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
          <label className="menu-mgmt__field-label">Service type</label>
          <input
            type="text"
            className="menu-mgmt__field-input"
            value={pkg.serviceType}
            onChange={(e) => up({ serviceType: e.target.value })}
            placeholder="hibachi, buffet, plated..."
          />
        </div>

        <div className="menu-mgmt__field">
          <label className="menu-mgmt__field-label">Included Categories</label>
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
            Highlighted (featured)
          </label>
        </div>
        <div className="menu-mgmt__field">
          <label className="menu-mgmt__field-checkbox">
            <input
              type="checkbox"
              checked={pkg.visible}
              onChange={(e) => up({ visible: e.target.checked })}
            />
            Visible on site
          </label>
        </div>

        {/* Features */}
        <div className="menu-mgmt__features-list">
          <div className="menu-mgmt__section-header">
            <label className="menu-mgmt__field-label">Features</label>
            <button
              className="menu-mgmt__btn menu-mgmt__btn--secondary menu-mgmt__btn--small"
              onClick={addFeature}
              type="button"
            >
              + Feature
            </button>
          </div>
          {pkg.features.map((feat, idx) => (
            <div key={idx} className="menu-mgmt__feature-row">
              <TranslatableField
                value={feat}
                onChange={(v) => updateFeature(idx, v)}
                placeholder="Feature text"
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
            Cancel
          </button>
          <button
            className="menu-mgmt__btn menu-mgmt__btn--primary"
            onClick={() => onSave(pkg)}
            type="button"
          >
            Save
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
    if (!window.confirm('Delete this category?')) return;
    onChange(categories.filter((c) => c.id !== id));
    if (editingId === id) setEditingId(null);
  };

  return (
    <>
      <div className="menu-mgmt__section-header">
        <h3 className="menu-mgmt__section-title">Categories ({categories.length})</h3>
        <button className="menu-mgmt__btn menu-mgmt__btn--primary" onClick={handleNew}>
          + Add Category
        </button>
      </div>

      {sorted.length === 0 && (
        <div className="menu-mgmt__empty">
          <p>No categories yet.</p>
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
                      label="Name"
                      value={draft.name}
                      onChange={(v) => setDraft({ ...draft, name: v })}
                    />
                    <TranslatableField
                      label="Description"
                      value={draft.description}
                      onChange={(v) => setDraft({ ...draft, description: v })}
                      mode="textarea"
                    />
                    <div className="menu-mgmt__field-row">
                      <div className="menu-mgmt__field">
                        <label className="menu-mgmt__field-label">Slug</label>
                        <input
                          className="menu-mgmt__field-input"
                          value={draft.slug}
                          onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                        />
                      </div>
                      <div className="menu-mgmt__field">
                        <label className="menu-mgmt__field-label">Sort Order</label>
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
                      Visible
                    </label>
                  </div>
                  <div className="menu-mgmt__list-row-actions">
                    <button
                      className="menu-mgmt__btn menu-mgmt__btn--primary menu-mgmt__btn--small"
                      onClick={handleSave}
                    >
                      Save
                    </button>
                    <button
                      className="menu-mgmt__btn menu-mgmt__btn--secondary menu-mgmt__btn--small"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span className="menu-mgmt__list-row-order">{cat.sortOrder}</span>
                  <span className="menu-mgmt__list-row-name">{cat.name.en || 'Untitled'}</span>
                  <span className="menu-mgmt__list-row-slug">{cat.slug}</span>
                  <span
                    className={`menu-mgmt__card-badge ${cat.visible ? 'menu-mgmt__card-badge--on' : 'menu-mgmt__card-badge--off'}`}
                  >
                    {cat.visible ? 'Visible' : 'Hidden'}
                  </span>
                  <div className="menu-mgmt__list-row-actions">
                    <button
                      className="menu-mgmt__btn menu-mgmt__btn--secondary menu-mgmt__btn--small"
                      onClick={() => setEditingId(cat.id)}
                    >
                      Edit
                    </button>
                    <button
                      className="menu-mgmt__btn menu-mgmt__btn--danger menu-mgmt__btn--small"
                      onClick={() => handleDelete(cat.id)}
                    >
                      Delete
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
    if (!window.confirm('Delete this item?')) return;
    onChange(items.filter((i) => i.id !== id));
  };

  return (
    <>
      <div className="menu-mgmt__section-header">
        <h3 className="menu-mgmt__section-title">Items ({items.length})</h3>
        <button className="menu-mgmt__btn menu-mgmt__btn--primary" onClick={handleNew}>
          + Add Item
        </button>
      </div>

      {sorted.length === 0 && (
        <div className="menu-mgmt__empty">
          <p>No items yet.</p>
        </div>
      )}

      <div className="menu-mgmt__item-grid">
        {sorted.map((item) => (
          <div key={item.id} className="menu-mgmt__item-card">
            {item.imageUrl ? (
              <img className="menu-mgmt__item-thumb" src={item.imageUrl} alt={item.name.en} />
            ) : (
              <div className="menu-mgmt__item-thumb-placeholder">No image</div>
            )}
            <div className="menu-mgmt__item-info">
              <h4 className="menu-mgmt__item-name">{item.name.en || 'Untitled'}</h4>
              <span className="menu-mgmt__item-price">${item.price.toFixed(2)}</span>
              <span
                className={`menu-mgmt__item-status ${item.available ? 'menu-mgmt__item-status--available' : 'menu-mgmt__item-status--unavailable'}`}
              >
                {item.available ? 'Available' : 'Unavailable'}
              </span>
              <div className="menu-mgmt__item-actions">
                <button
                  className="menu-mgmt__btn menu-mgmt__btn--secondary menu-mgmt__btn--small"
                  onClick={() => setEditing({ ...item })}
                >
                  Edit
                </button>
                <button
                  className="menu-mgmt__btn menu-mgmt__btn--danger menu-mgmt__btn--small"
                  onClick={() => handleDelete(item.id)}
                >
                  Delete
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
      alert('Image upload failed');
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
        <h3 className="menu-mgmt__modal-title">{initial.name.en ? 'Edit Item' : 'New Item'}</h3>

        <TranslatableField label="Name" value={item.name} onChange={(v) => up({ name: v })} />
        <TranslatableField
          label="Description"
          value={item.description}
          onChange={(v) => up({ description: v })}
          mode="textarea"
        />

        <div className="menu-mgmt__field-row">
          <div className="menu-mgmt__field">
            <label className="menu-mgmt__field-label">Price ($)</label>
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
            <label className="menu-mgmt__field-label">Price Type</label>
            <select
              className="menu-mgmt__field-select"
              value={item.priceType}
              onChange={(e) => up({ priceType: e.target.value as MenuItem['priceType'] })}
            >
              <option value="included">Included</option>
              <option value="per_person">Per Person</option>
              <option value="per_item">Per Item</option>
              <option value="upgrade">Upgrade</option>
            </select>
          </div>
        </div>

        <div className="menu-mgmt__field-row">
          <div className="menu-mgmt__field">
            <label className="menu-mgmt__field-label">Category</label>
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
            <label className="menu-mgmt__field-label">Sort Order</label>
            <input
              type="number"
              className="menu-mgmt__field-input"
              value={item.sortOrder}
              onChange={(e) => up({ sortOrder: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="menu-mgmt__field">
          <label className="menu-mgmt__field-label">Tags (comma-separated)</label>
          <input
            className="menu-mgmt__field-input"
            value={tagsStr}
            onChange={(e) => setTagsStr(e.target.value)}
            onBlur={handleTagsBlur}
            placeholder="e.g. popular, spicy, vegetarian"
          />
        </div>

        <div className="menu-mgmt__field">
          <label className="menu-mgmt__field-checkbox">
            <input
              type="checkbox"
              checked={item.available}
              onChange={(e) => up({ available: e.target.checked })}
            />
            Available
          </label>
        </div>
        <div className="menu-mgmt__field">
          <label className="menu-mgmt__field-checkbox">
            <input
              type="checkbox"
              checked={item.orderable}
              onChange={(e) => up({ orderable: e.target.checked })}
            />
            Orderable
          </label>
        </div>

        <div className="menu-mgmt__field">
          <label className="menu-mgmt__field-label">Image</label>
          <ImageUploader
            value={item.imageUrl}
            onChange={handleImageChange}
            onRemove={() => up({ imageUrl: '' })}
            preset={MENU_ITEM_PRESET}
            aspectRatio={4 / 3}
            label={uploading ? 'Uploading...' : undefined}
          />
        </div>

        <div className="menu-mgmt__modal-footer">
          <button
            className="menu-mgmt__btn menu-mgmt__btn--secondary"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="menu-mgmt__btn menu-mgmt__btn--primary"
            onClick={() => onSave(item)}
            type="button"
            disabled={uploading}
          >
            Save
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
    if (!window.confirm('Delete this spotlight?')) return;
    onChange(spotlights.filter((s) => s.id !== id));
  };

  const getItemName = (itemId: string) => items.find((i) => i.id === itemId)?.name.en ?? 'Unknown';

  return (
    <>
      <div className="menu-mgmt__section-header">
        <h3 className="menu-mgmt__section-title">Spotlights ({spotlights.length})</h3>
        <button className="menu-mgmt__btn menu-mgmt__btn--primary" onClick={handleNew}>
          + Add Spotlight
        </button>
      </div>

      {sorted.length === 0 && (
        <div className="menu-mgmt__empty">
          <p>No spotlights yet.</p>
        </div>
      )}

      <div className="menu-mgmt__card-list">
        {sorted.map((spot) => (
          <div key={spot.id} className="menu-mgmt__card">
            {spot.imageUrl && (
              <img className="menu-mgmt__spotlight-img" src={spot.imageUrl} alt={spot.title.en} />
            )}
            <h4 className="menu-mgmt__card-title">{spot.title.en || 'Untitled'}</h4>
            <p className="menu-mgmt__card-subtitle">{spot.subtitle.en}</p>
            <div className="menu-mgmt__card-meta">
              <span className="menu-mgmt__card-badge">Item: {getItemName(spot.menuItemId)}</span>
              <span
                className={`menu-mgmt__card-badge ${spot.visible ? 'menu-mgmt__card-badge--on' : 'menu-mgmt__card-badge--off'}`}
              >
                {spot.visible ? 'Visible' : 'Hidden'}
              </span>
              {spot.videoUrl && <span className="menu-mgmt__card-badge">Has Video</span>}
            </div>
            <div className="menu-mgmt__card-actions">
              <button
                className="menu-mgmt__btn menu-mgmt__btn--secondary menu-mgmt__btn--small"
                onClick={() => setEditing({ ...spot })}
              >
                Edit
              </button>
              <button
                className="menu-mgmt__btn menu-mgmt__btn--danger menu-mgmt__btn--small"
                onClick={() => handleDelete(spot.id)}
              >
                Delete
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
  const [spot, setSpot] = useState<MenuSpotlight>(initial);
  const [uploading, setUploading] = useState(false);

  const up = (partial: Partial<MenuSpotlight>) => setSpot((s) => ({ ...s, ...partial }));

  const handleImageChange = async (base64: string) => {
    setUploading(true);
    try {
      const url = await onImageUpload(base64, spot.id);
      up({ imageUrl: url });
    } catch {
      alert('Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="menu-mgmt__overlay" onClick={onCancel}>
      <div className="menu-mgmt__modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="menu-mgmt__modal-title">
          {initial.title.en ? 'Edit Spotlight' : 'New Spotlight'}
        </h3>

        <TranslatableField label="Title" value={spot.title} onChange={(v) => up({ title: v })} />
        <TranslatableField
          label="Subtitle"
          value={spot.subtitle}
          onChange={(v) => up({ subtitle: v })}
          mode="textarea"
        />

        <div className="menu-mgmt__field">
          <label className="menu-mgmt__field-label">Menu Item</label>
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
          <label className="menu-mgmt__field-label">Video URL (optional)</label>
          <input
            className="menu-mgmt__field-input"
            value={spot.videoUrl ?? ''}
            onChange={(e) => up({ videoUrl: e.target.value || undefined })}
            placeholder="https://youtube.com/..."
          />
        </div>

        <div className="menu-mgmt__field-row">
          <div className="menu-mgmt__field">
            <label className="menu-mgmt__field-label">Sort Order</label>
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
              Visible
            </label>
          </div>
        </div>

        <div className="menu-mgmt__field">
          <label className="menu-mgmt__field-label">Image</label>
          <ImageUploader
            value={spot.imageUrl}
            onChange={handleImageChange}
            onRemove={() => up({ imageUrl: '' })}
            preset={MENU_ITEM_PRESET}
            aspectRatio={16 / 9}
            label={uploading ? 'Uploading...' : undefined}
          />
        </div>

        <div className="menu-mgmt__modal-footer">
          <button
            className="menu-mgmt__btn menu-mgmt__btn--secondary"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="menu-mgmt__btn menu-mgmt__btn--primary"
            onClick={() => onSave(spot)}
            type="button"
            disabled={uploading}
          >
            Save
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
    if (!window.confirm('Remove this coupon tier?')) return;
    onTiersChange(couponTiers.filter((t) => t.id !== id));
  };

  return (
    <>
      <div className="menu-mgmt__section-header">
        <h3 className="menu-mgmt__section-title">Pricing Configuration</h3>
      </div>

      <div className="menu-mgmt__pricing-grid">
        <div className="menu-mgmt__field">
          <label className="menu-mgmt__field-label">Kids Price ($)</label>
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
          <label className="menu-mgmt__field-label">Credit Card Fee (%)</label>
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
          <label className="menu-mgmt__field-label">Suggested Gratuity (%)</label>
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
          <label className="menu-mgmt__field-label">Cancellation Fee ($)</label>
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
          <label className="menu-mgmt__field-label">Minimum Order ($)</label>
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
        label="Outdoor Note"
        value={pricing.outdoorNote}
        onChange={(v) => upP({ outdoorNote: v })}
        mode="textarea"
      />
      <TranslatableField
        label="Weather Note"
        value={pricing.weatherNote}
        onChange={(v) => upP({ weatherNote: v })}
        mode="textarea"
      />

      {/* Coupon Tiers */}
      <div className="menu-mgmt__tier-list">
        <div className="menu-mgmt__section-header">
          <h3 className="menu-mgmt__section-title">Coupon Tiers ({couponTiers.length})</h3>
          <button className="menu-mgmt__btn menu-mgmt__btn--primary" onClick={addTier}>
            + Add Tier
          </button>
        </div>

        {sorted.length === 0 && (
          <div className="menu-mgmt__empty">
            <p>No coupon tiers configured.</p>
          </div>
        )}

        {sorted.map((tier) => (
          <div key={tier.id} className="menu-mgmt__tier-row">
            <div>
              <TranslatableField
                label="Guest Range"
                value={tier.guestRange}
                onChange={(v) => updateTier(tier.id, { guestRange: v })}
                placeholder="e.g. 10-20 guests"
              />
            </div>
            <div className="menu-mgmt__field">
              <label className="menu-mgmt__field-label">Discount (%)</label>
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
              <label className="menu-mgmt__field-label">Order</label>
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
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default MenuManagement;
