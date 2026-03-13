import React from 'react';
import { useTranslation } from 'react-i18next';
import type { MenuPackage, TranslatableText } from '../../types';
import './MenuPackageCard.css';

interface MenuPackageCardProps {
  pkg: MenuPackage;
  isSelected: boolean;
  getLocalizedText: (text: TranslatableText) => string;
  onSelect: (packageId: string) => void;
}

const MenuPackageCard: React.FC<MenuPackageCardProps> = ({
  pkg,
  isSelected,
  getLocalizedText,
  onSelect,
}) => {
  const { t } = useTranslation();

  return (
    <div
      className={`package-card ${pkg.highlighted ? 'highlighted' : ''} ${isSelected ? 'selected' : ''}`}
    >
      {pkg.highlighted && <div className="package-badge">{t('menu.popular')}</div>}
      <h3 className="package-name">{getLocalizedText(pkg.name)}</h3>
      <div className="package-price">
        {pkg.pricePerPerson > 0 ? (
          <>
            <span className="currency">$</span>
            <span className="amount">{pkg.pricePerPerson}</span>
            <span className="unit">/{t('pricing.perPerson')}</span>
          </>
        ) : (
          <span className="package-flat-price">
            {getLocalizedText(pkg.features[pkg.features.length - 1] || { en: '' })}
          </span>
        )}
      </div>
      {pkg.minGuests > 0 && (
        <p className="package-guests">
          {pkg.maxGuests
            ? `${pkg.minGuests}-${pkg.maxGuests} ${t('menu.guests')}`
            : `${pkg.minGuests}+ ${t('menu.guests')}`}
        </p>
      )}
      <ul className="package-features">
        {pkg.features.map((feature, i) => (
          <li key={i}>{getLocalizedText(feature)}</li>
        ))}
      </ul>
      <button
        className={`package-select-btn ${isSelected ? 'selected' : ''}`}
        onClick={() => onSelect(pkg.id)}
        type="button"
      >
        {isSelected ? t('menu.selected') : t('menu.selectPackage')}
      </button>
    </div>
  );
};

export default MenuPackageCard;
