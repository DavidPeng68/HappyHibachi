import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { MenuCategory } from '../../../types/menu';
import TranslatableField from '../TranslatableField';
import { uid, emptyText } from './menuHelpers';

// ---------------------------------------------------------------------------
// CategoriesTab
// ---------------------------------------------------------------------------

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

export default CategoriesTab;
