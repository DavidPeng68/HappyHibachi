import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { MenuItem, MenuCategory, MenuPackage, TranslatableText, AddonItem } from '../../types';
import { MenuItemCard } from '../Menu';

interface CustomizeStepProps {
  pkg: MenuPackage;
  categories: MenuCategory[];
  items: MenuItem[];
  proteinSelections: string[];
  addons: AddonItem[];
  onToggleProtein: (menuItemId: string, maxCount: number) => void;
  onAddAddon: (menuItemId: string) => void;
  onRemoveAddon: (menuItemId: string) => void;
  getLocalizedText: (text: TranslatableText) => string;
  onBack?: () => void;
}

const CustomizeStep: React.FC<CustomizeStepProps> = ({
  pkg,
  categories,
  items,
  proteinSelections,
  addons,
  onToggleProtein,
  onAddAddon,
  onRemoveAddon,
  getLocalizedText,
  onBack,
}) => {
  const { t } = useTranslation();
  const [chefsChoice, setChefsChoice] = useState(false);
  const isBuffet = pkg.serviceType === 'buffet';

  // Filter protein items by package's categoryIds (excluding addons)
  const proteinCategories = useMemo(
    () => categories.filter((c) => pkg.categoryIds.includes(c.id) && c.slug !== 'sides-addons'),
    [categories, pkg.categoryIds]
  );

  const proteinItems = useMemo(
    () =>
      items
        .filter((item) => proteinCategories.some((c) => c.id === item.categoryId) && item.available)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [items, proteinCategories]
  );

  // Filter addon items
  const addonCategory = categories.find((c) => c.slug === 'sides-addons');
  const addonItems = useMemo(
    () =>
      items
        .filter((item) => addonCategory && item.categoryId === addonCategory.id && item.available)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [items, addonCategory]
  );

  const getAddonQty = (itemId: string): number => {
    const found = addons.find((a) => a.menuItemId === itemId);
    return found?.quantity ?? 0;
  };

  return (
    <div className="step-section">
      {onBack && (
        <button type="button" className="step-back-btn" onClick={onBack}>
          ← {t('order.back')}
        </button>
      )}
      <h3 className="step-title">{t('order.step2.title')}</h3>

      {/* Protein Selection */}
      {pkg.proteinCount > 0 && (
        <div className="customize-proteins">
          <div className="customize-header">
            <h4 className="step-subtitle">
              {isBuffet ? t('order.selectBuffetProteins') : t('order.selectProteins')}
            </h4>
            <span className="protein-counter">
              {proteinSelections.length}/{pkg.proteinCount}
            </span>
          </div>

          {/* Chef's Choice toggle */}
          <label className="chefs-choice-toggle">
            <input
              type="checkbox"
              checked={chefsChoice}
              onChange={(e) => setChefsChoice(e.target.checked)}
            />
            <span className="chefs-choice-label">{t('order.chefsChoice')}</span>
            <span className="chefs-choice-hint">{t('order.chefsChoiceHint')}</span>
          </label>

          {!chefsChoice && (
            <div className="menu-items-grid">
              {proteinItems.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  mode="protein"
                  isSelected={proteinSelections.includes(item.id)}
                  isDimmed={
                    proteinSelections.length >= pkg.proteinCount &&
                    !proteinSelections.includes(item.id)
                  }
                  onToggle={() => onToggleProtein(item.id, pkg.proteinCount)}
                  getLocalizedText={getLocalizedText}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add-ons */}
      {addonItems.length > 0 && (
        <div className="customize-addons">
          <h4 className="step-subtitle">{t('order.addons')}</h4>
          <div className="menu-items-grid">
            {addonItems.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                mode="addon"
                orderQuantity={getAddonQty(item.id)}
                onAddToOrder={() => {
                  if (getAddonQty(item.id) > 0) {
                    onRemoveAddon(item.id);
                  } else {
                    onAddAddon(item.id);
                  }
                }}
                getLocalizedText={getLocalizedText}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomizeStep;
