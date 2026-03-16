import React from 'react';
import { useTranslation } from 'react-i18next';
import type { PricingConfig, CouponTier } from '../../../types/menu';
import TranslatableField from '../TranslatableField';
import { uid, emptyText } from './menuHelpers';

// ---------------------------------------------------------------------------
// PricingTab
// ---------------------------------------------------------------------------

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
  const { t } = useTranslation();
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
    if (!window.confirm(t('admin.menu.removeTierConfirm'))) return;
    onTiersChange(couponTiers.filter((t) => t.id !== id));
  };

  return (
    <>
      <div className="menu-mgmt__section-header">
        <h3 className="menu-mgmt__section-title">{t('admin.menu.pricingConfig')}</h3>
      </div>

      <div className="menu-mgmt__pricing-grid">
        <div className="menu-mgmt__field">
          <label className="menu-mgmt__field-label">{t('admin.menu.kidsPriceLabel')}</label>
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
          <label className="menu-mgmt__field-label">{t('admin.menu.creditCardFee')}</label>
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
          <label className="menu-mgmt__field-label">{t('admin.menu.suggestedGratuity')}</label>
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
          <label className="menu-mgmt__field-label">{t('admin.menu.cancellationFee')}</label>
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
          <label className="menu-mgmt__field-label">{t('admin.menu.minimumOrder')}</label>
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
        label={t('admin.menu.outdoorNote')}
        value={pricing.outdoorNote}
        onChange={(v) => upP({ outdoorNote: v })}
        mode="textarea"
      />
      <TranslatableField
        label={t('admin.menu.weatherNote')}
        value={pricing.weatherNote}
        onChange={(v) => upP({ weatherNote: v })}
        mode="textarea"
      />

      {/* Coupon Tiers */}
      <div className="menu-mgmt__tier-list">
        <div className="menu-mgmt__section-header">
          <h3 className="menu-mgmt__section-title">
            {t('admin.menu.couponTiersCount', { count: couponTiers.length })}
          </h3>
          <button className="menu-mgmt__btn menu-mgmt__btn--primary" onClick={addTier}>
            {t('admin.menu.addTier')}
          </button>
        </div>

        {sorted.length === 0 && (
          <div className="menu-mgmt__empty">
            <p>{t('admin.menu.noCouponTiers')}</p>
          </div>
        )}

        {sorted.map((tier) => (
          <div key={tier.id} className="menu-mgmt__tier-row">
            <div>
              <TranslatableField
                label={t('admin.menu.guestRange')}
                value={tier.guestRange}
                onChange={(v) => updateTier(tier.id, { guestRange: v })}
                placeholder={t('admin.menu.guestRangePlaceholder')}
              />
            </div>
            <div className="menu-mgmt__field">
              <label className="menu-mgmt__field-label">{t('admin.menu.discount')}</label>
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
              <label className="menu-mgmt__field-label">{t('admin.menu.order')}</label>
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
                {t('admin.menu.remove')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default PricingTab;
