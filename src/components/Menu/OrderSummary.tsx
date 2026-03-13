import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useOrder } from '../../hooks';
import type { MenuData, TranslatableText } from '../../types';
import './OrderSummary.css';

interface OrderSummaryProps {
  menu: MenuData | null;
  getLocalizedText: (text: TranslatableText) => string;
  onGoToBooking?: () => void;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({ menu, getLocalizedText, onGoToBooking }) => {
  const { t } = useTranslation();
  const { order, removeAddon, updateAddonQuantity, getTotal, itemCount } = useOrder();
  const [mobileExpanded, setMobileExpanded] = useState(false);

  if (!menu || !order.packageId) return null;

  const selectedPackage = menu.packages.find((p) => p.id === order.packageId);
  const total = getTotal(menu);

  if (!selectedPackage) return null;

  const kidsRate = selectedPackage.kidsPrice ?? menu.pricing.kidsPrice;

  const handleGoToBooking = () => {
    onGoToBooking?.();
  };

  const summaryContent = (
    <>
      <h3 className="order-title">{t('menu.orderSummary')}</h3>

      {/* Package + Guests */}
      <div className="order-package">
        <span className="order-package-name">{getLocalizedText(selectedPackage.name)}</span>
        <span className="order-package-price">
          {selectedPackage.flatPrice != null
            ? `$${selectedPackage.flatPrice}`
            : `$${selectedPackage.pricePerPerson}/${t('pricing.perPerson')}`}
        </span>
      </div>

      <div className="order-guests">
        <span>
          {order.guestCount} {t('order.adults')}
        </span>
        {order.kidsCount > 0 && (
          <span>
            {' '}
            + {order.kidsCount} {t('order.kids')} (${kidsRate}/{t('pricing.perPerson')})
          </span>
        )}
      </div>

      {/* Proteins */}
      {order.proteinSelections.length > 0 && (
        <div className="order-section">
          <span className="order-section-label">{t('order.review.proteins')}</span>
          <ul className="order-proteins">
            {order.proteinSelections.map((proteinId) => {
              const item = menu.items.find((i) => i.id === proteinId);
              if (!item) return null;
              return (
                <li key={proteinId} className="order-protein-item">
                  <span>{getLocalizedText(item.name)}</span>
                  <span className="order-protein-price">
                    {item.priceType === 'upgrade'
                      ? `+$${item.price}/${t('pricing.perPerson')}`
                      : t('menu.protein.included')}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Add-ons */}
      {order.addons.length > 0 && (
        <div className="order-section">
          <span className="order-section-label">{t('order.addons')}</span>
          <ul className="order-items">
            {order.addons.map((addon) => {
              const menuItem = menu.items.find((i) => i.id === addon.menuItemId);
              if (!menuItem) return null;
              return (
                <li key={addon.menuItemId} className="order-item">
                  <div className="order-item-info">
                    <span className="order-item-name">{getLocalizedText(menuItem.name)}</span>
                    <span className="order-item-price">${menuItem.price * addon.quantity}</span>
                  </div>
                  <div className="order-item-controls">
                    <button
                      className="qty-btn"
                      onClick={() => updateAddonQuantity(addon.menuItemId, addon.quantity - 1)}
                      type="button"
                      aria-label="Decrease"
                    >
                      -
                    </button>
                    <span className="qty-value">{addon.quantity}</span>
                    <button
                      className="qty-btn"
                      onClick={() => updateAddonQuantity(addon.menuItemId, addon.quantity + 1)}
                      type="button"
                      aria-label="Increase"
                    >
                      +
                    </button>
                    <button
                      className="remove-btn"
                      onClick={() => removeAddon(addon.menuItemId)}
                      type="button"
                      aria-label="Remove"
                    >
                      &times;
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {total > 0 && (
        <div className="order-total">
          <span>{t('order.review.estimatedTotal')}</span>
          <span className="order-total-price">${total.toLocaleString()}</span>
        </div>
      )}

      <button className="order-cta" onClick={handleGoToBooking} type="button">
        {t('menu.goToBooking')}
      </button>
    </>
  );

  return (
    <>
      {/* Desktop: sticky sidebar */}
      <div className="order-summary-desktop">{summaryContent}</div>

      {/* Mobile: bottom bar + drawer */}
      <div className="order-summary-mobile">
        <button
          className="order-mobile-bar"
          onClick={() => setMobileExpanded(!mobileExpanded)}
          type="button"
        >
          <span>
            {itemCount} {t('menu.itemsSelected')} &middot; ${total.toLocaleString()}
          </span>
          <span className="order-mobile-toggle">
            {mobileExpanded ? '\u25BC' : t('menu.viewOrder')}
          </span>
        </button>

        {mobileExpanded && (
          <>
            <div className="order-mobile-overlay" onClick={() => setMobileExpanded(false)} />
            <div className="order-mobile-drawer">{summaryContent}</div>
          </>
        )}
      </div>
    </>
  );
};

export default OrderSummary;
