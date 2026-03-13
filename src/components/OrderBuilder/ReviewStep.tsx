import React from 'react';
import { useTranslation } from 'react-i18next';
import type { MenuData, MenuPackage, TranslatableText } from '../../types';
import { Icon } from '../ui';

interface ReviewAddon {
  name: string;
  quantity: number;
  unitPrice: number;
}

interface ReviewStepProps {
  pkg: MenuPackage;
  menu: MenuData;
  guestCount: number;
  kidsCount: number;
  proteinSelections: string[];
  addons?: ReviewAddon[];
  total: number;
  getLocalizedText: (text: TranslatableText) => string;
  onEditParty?: () => void;
  onEditCustomize?: () => void;
}

const ReviewStep: React.FC<ReviewStepProps> = ({
  pkg,
  menu,
  guestCount,
  kidsCount,
  proteinSelections,
  addons,
  total,
  getLocalizedText,
  onEditParty,
  onEditCustomize,
}) => {
  const { t } = useTranslation();

  const kidsRate = pkg.kidsPrice ?? menu.pricing.kidsPrice;

  const proteinDetails = proteinSelections
    .map((id) => {
      const item = menu.items.find((i) => i.id === id);
      if (!item) return null;
      return {
        name: getLocalizedText(item.name),
        isUpgrade: item.priceType === 'upgrade',
        price: item.price,
      };
    })
    .filter(Boolean);

  return (
    <div className="step-section">
      <div className="step-title-row">
        <h3 className="step-title">{t('order.step3.title')}</h3>
      </div>

      <div className="review-card">
        {/* Package + Edit */}
        <div className="review-row">
          <span className="review-label">{t('order.review.package')}</span>
          <span className="review-value">
            {getLocalizedText(pkg.name)}
            {onEditParty && (
              <button
                type="button"
                className="review-edit-btn"
                onClick={onEditParty}
                aria-label={t('order.editParty')}
              >
                <Icon name="chevron-left" size={12} /> {t('order.edit')}
              </button>
            )}
          </span>
        </div>

        {/* Guests */}
        <div className="review-row">
          <span className="review-label">{t('order.review.guests')}</span>
          <span className="review-value">
            {guestCount} {t('order.adults')}
            {kidsCount > 0 && ` + ${kidsCount} ${t('order.kids')}`}
          </span>
        </div>

        {/* Service */}
        <div className="review-row">
          <span className="review-label">{t('order.review.service')}</span>
          <span className="review-value">
            {pkg.serviceType} · {pkg.serviceDuration} min
          </span>
        </div>

        <div className="review-divider" />

        {/* Pricing breakdown */}
        {pkg.flatPrice != null ? (
          <div className="review-row">
            <span className="review-label">{getLocalizedText(pkg.name)}</span>
            <span className="review-value">${pkg.flatPrice}</span>
          </div>
        ) : (
          <>
            <div className="review-row">
              <span className="review-label">
                {guestCount} {t('order.adults')} × ${pkg.pricePerPerson}
              </span>
              <span className="review-value">${pkg.pricePerPerson * guestCount}</span>
            </div>
            {kidsCount > 0 && (
              <div className="review-row">
                <span className="review-label">
                  {kidsCount} {t('order.kids')} × ${kidsRate}
                </span>
                <span className="review-value">${kidsRate * kidsCount}</span>
              </div>
            )}
          </>
        )}

        {/* Proteins */}
        {proteinDetails.length > 0 && (
          <>
            <div className="review-row review-section-title">
              <span className="review-label">{t('order.review.proteins')}</span>
              {onEditCustomize && (
                <button
                  type="button"
                  className="review-edit-btn"
                  onClick={onEditCustomize}
                  aria-label={t('order.editCustomize')}
                >
                  <Icon name="chevron-left" size={12} /> {t('order.edit')}
                </button>
              )}
            </div>
            {proteinDetails.map(
              (p, i) =>
                p && (
                  <div key={i} className="review-row review-subrow">
                    <span className="review-label">{p.name}</span>
                    <span className="review-value">
                      {p.isUpgrade ? `+$${p.price * guestCount}` : t('menu.protein.included')}
                    </span>
                  </div>
                )
            )}
          </>
        )}

        {/* Add-ons */}
        {addons && addons.length > 0 && (
          <>
            <div className="review-row review-section-title">
              <span className="review-label">{t('order.review.addons')}</span>
              {onEditCustomize && (
                <button
                  type="button"
                  className="review-edit-btn"
                  onClick={onEditCustomize}
                  aria-label={t('order.editCustomize')}
                >
                  <Icon name="chevron-left" size={12} /> {t('order.edit')}
                </button>
              )}
            </div>
            {addons.map((addon, i) => (
              <div key={i} className="review-row review-subrow">
                <span className="review-label">
                  {addon.name} {t('order.review.quantity', { count: addon.quantity })}
                </span>
                <span className="review-value">
                  +${(addon.unitPrice * addon.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </>
        )}

        <div className="review-divider" />

        {/* Total */}
        <div className="review-row review-total">
          <span className="review-label">{t('order.review.estimatedTotal')}</span>
          <span className="review-value">${total.toLocaleString()}</span>
        </div>
      </div>

      <p className="review-note">{t('order.reviewNote')}</p>
    </div>
  );
};

export default ReviewStep;
