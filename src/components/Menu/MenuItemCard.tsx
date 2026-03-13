import React from 'react';
import { useTranslation } from 'react-i18next';
import type { MenuItem, TranslatableText } from '../../types';
import './MenuItemCard.css';

interface MenuItemCardProps {
  item: MenuItem;
  getLocalizedText: (text: TranslatableText) => string;
  mode?: 'addon' | 'protein';
  // Addon mode (existing behavior)
  onAddToOrder?: (itemId: string) => void;
  orderQuantity?: number;
  // Protein mode
  isSelected?: boolean;
  onToggle?: () => void;
  isDimmed?: boolean;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({
  item,
  getLocalizedText,
  mode = 'addon',
  onAddToOrder,
  orderQuantity = 0,
  isSelected = false,
  onToggle,
  isDimmed = false,
}) => {
  const { t } = useTranslation();

  const isProteinMode = mode === 'protein';

  const priceLabel =
    item.priceType === 'included'
      ? t('menu.protein.included')
      : item.priceType === 'upgrade'
        ? `+$${item.price}/${t('pricing.perPerson')}`
        : item.priceType === 'per_person'
          ? `+$${item.price}/${t('pricing.perPerson')}`
          : `$${item.price}`;

  const cardClassName = [
    'menu-item-card',
    isProteinMode ? 'menu-item-card--protein' : '',
    isProteinMode && isSelected ? 'menu-item-card--selected' : '',
    isProteinMode && isDimmed && !isSelected ? 'menu-item-card--dimmed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const handleClick = () => {
    if (isProteinMode && onToggle) {
      onToggle();
    }
  };

  const itemName = getLocalizedText(item.name);

  return (
    <div
      className={cardClassName}
      onClick={isProteinMode ? handleClick : undefined}
      role={isProteinMode ? 'button' : undefined}
      aria-pressed={isProteinMode ? isSelected : undefined}
      aria-label={isProteinMode ? `${itemName}, ${priceLabel}` : undefined}
      tabIndex={isProteinMode ? 0 : undefined}
      onKeyDown={
        isProteinMode
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick();
              }
            }
          : undefined
      }
    >
      <div className="menu-item-image">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={getLocalizedText(item.name)}
            loading="lazy"
            width={400}
            height={300}
          />
        ) : (
          <div className="menu-item-placeholder" />
        )}
        {item.tags.includes('popular') && (
          <span className="menu-item-badge">{t('menu.popular')}</span>
        )}
        {isProteinMode && isSelected && (
          <span className="menu-item-check" aria-hidden="true">
            ✓
          </span>
        )}
      </div>
      <div className="menu-item-info">
        <h4 className="menu-item-name">{getLocalizedText(item.name)}</h4>
        <p className="menu-item-desc">{getLocalizedText(item.description)}</p>
        <div className="menu-item-footer">
          <span className={`menu-item-price ${item.priceType === 'included' ? 'included' : ''}`}>
            {priceLabel}
          </span>
          {!isProteinMode && item.orderable && onAddToOrder && (
            <button
              className={`menu-item-add ${orderQuantity > 0 ? 'added' : ''}`}
              onClick={() => onAddToOrder(item.id)}
              type="button"
            >
              {orderQuantity > 0
                ? `${t('menu.addToOrder')} (${orderQuantity})`
                : t('menu.addToOrder')}
            </button>
          )}
          {isProteinMode && (
            <span className={`menu-item-select-label ${isSelected ? 'selected' : ''}`}>
              {isSelected ? t('menu.protein.selected') : t('menu.protein.select')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuItemCard;
