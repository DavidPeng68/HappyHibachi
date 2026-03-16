import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MenuSpotlight, MenuItem } from '../../../types/menu';
import { MENU_ITEM_PRESET } from '../../../utils/imageCompression';
import ImageUploader from '../../../components/ui/ImageUploader';
import TranslatableField from '../TranslatableField';
import { uid, emptyText } from './menuHelpers';

// ---------------------------------------------------------------------------
// SpotlightsTab
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// SpotlightModal
// ---------------------------------------------------------------------------

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

export default SpotlightsTab;
