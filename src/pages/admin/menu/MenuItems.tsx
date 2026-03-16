import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MenuItem, MenuCategory } from '../../../types/menu';
import { MENU_ITEM_PRESET } from '../../../utils/imageCompression';
import ImageUploader from '../../../components/ui/ImageUploader';
import TranslatableField from '../TranslatableField';
import { uid, emptyText } from './menuHelpers';

// ---------------------------------------------------------------------------
// ItemsTab
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// ItemModal
// ---------------------------------------------------------------------------

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

export default ItemsTab;
