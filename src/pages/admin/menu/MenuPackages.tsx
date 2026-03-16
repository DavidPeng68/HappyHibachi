import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MenuPackage, MenuCategory, TranslatableText } from '../../../types/menu';
import TranslatableField from '../TranslatableField';
import { uid, emptyText } from './menuHelpers';

// ---------------------------------------------------------------------------
// PackagesTab
// ---------------------------------------------------------------------------

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
              <button
                type="button"
                className={`menu-mgmt__toggle ${pkg.visible ? 'menu-mgmt__toggle--on' : 'menu-mgmt__toggle--off'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(
                    packages.map((p) => (p.id === pkg.id ? { ...p, visible: !p.visible } : p))
                  );
                }}
                title={pkg.visible ? t('admin.menu.clickToHide') : t('admin.menu.clickToShow')}
              >
                {pkg.visible ? t('admin.menu.visible') : t('admin.menu.hidden')}
              </button>
              <button
                type="button"
                className={`menu-mgmt__toggle ${pkg.highlighted ? 'menu-mgmt__toggle--on' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(
                    packages.map((p) =>
                      p.id === pkg.id ? { ...p, highlighted: !p.highlighted } : p
                    )
                  );
                }}
                title={
                  pkg.highlighted ? t('admin.menu.removeHighlight') : t('admin.menu.addHighlight')
                }
              >
                {pkg.highlighted ? t('admin.menu.highlighted') : t('admin.menu.notHighlighted')}
              </button>
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

// ---------------------------------------------------------------------------
// PackageModal
// ---------------------------------------------------------------------------

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

export default PackagesTab;
