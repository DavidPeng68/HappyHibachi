import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, Button, Icon } from '../ui';
import { useScrollReveal, useAppNavigation } from '../../hooks';
import { PRICING, UPGRADES, COUPON_TIERS } from '../../constants';
import './PriceCalculator.css';

interface Upgrades {
  filetMignon: number;
  lobster: number;
  thirdProtein: number;
  noodles: number;
}

/**
 * Interactive calculator for estimating event costs
 * Note: This is for estimation only, not payment
 * Interactive calculator for estimating event costs
 */
const PriceCalculator: React.FC = () => {
  const { t } = useTranslation();
  const { ref, isVisible } = useScrollReveal({ threshold: 0.2 });
  const { goToBookNow } = useAppNavigation();

  const [adults, setAdults] = useState<number>(10);
  const [kids, setKids] = useState<number>(0);
  const [upgrades, setUpgrades] = useState<Upgrades>({
    filetMignon: 0,
    lobster: 0,
    thirdProtein: 0,
    noodles: 0,
  });

  // Calculate pricing
  const pricing = useMemo(() => {
    const totalGuests = adults + kids;

    // Find applicable discount
    let discount = 0;
    for (const tier of COUPON_TIERS) {
      const [min] = tier.guestRange.match(/\d+/) || [0];
      if (totalGuests >= Number(min)) {
        discount = tier.discount;
      }
    }

    // Base cost
    const adultCost = adults * PRICING.PER_PERSON;
    const kidsCost = kids * PRICING.KIDS_PRICE;
    const baseCost = adultCost + kidsCost;

    // Upgrade costs
    const upgradesCost =
      upgrades.filetMignon * UPGRADES.FILET_MIGNON +
      upgrades.lobster * UPGRADES.LOBSTER +
      upgrades.thirdProtein * UPGRADES.THIRD_PROTEIN +
      upgrades.noodles * UPGRADES.NOODLES;

    // Subtotal before discount
    const subtotal = baseCost + upgradesCost;

    // Apply discount
    const discountedTotal = subtotal - discount;

    // Calculate minimums
    const meetsMinimum = discountedTotal >= PRICING.MINIMUM_ORDER;
    const finalTotal = meetsMinimum ? discountedTotal : PRICING.MINIMUM_ORDER;
    // Suggested gratuity
    const suggestedGratuity = finalTotal * PRICING.GRATUITY_SUGGESTED;

    return {
      adults: adultCost,
      kids: kidsCost,
      upgrades: upgradesCost,
      discount,
      subtotal,
      total: finalTotal,
      gratuity: suggestedGratuity,
      grandTotal: finalTotal + suggestedGratuity,
      meetsMinimum,
      totalGuests,
    };
  }, [adults, kids, upgrades]);

  const handleUpgradeChange = (key: keyof Upgrades, value: number) => {
    const maxValue = adults + kids;
    setUpgrades((prev) => ({
      ...prev,
      [key]: Math.min(Math.max(0, value), maxValue),
    }));
  };

  return (
    <section className="price-calculator" id="calculator" ref={ref as React.RefObject<HTMLElement>}>
      <div className={`calculator-container ${isVisible ? 'visible' : ''}`}>
        <div className="calculator-header">
          <h2>{t('calculator.title')}</h2>
          <p>{t('calculator.subtitle')}</p>
        </div>

        <div className="calculator-content">
          {/* Guest Input Section */}
          <div className="calculator-inputs">
            <h3>{t('calculator.guests')}</h3>

            <div className="input-row">
              <div className="input-group">
                <label>
                  {t('calculator.adults')} (${PRICING.PER_PERSON}/{t('pricing.perPerson')})
                </label>
                <div className="stepper">
                  <button
                    type="button"
                    onClick={() => setAdults(Math.max(0, adults - 1))}
                    disabled={adults <= 0}
                  >
                    −
                  </button>
                  <Input
                    type="number"
                    value={adults}
                    onChange={(e) => setAdults(Math.max(0, parseInt(e.target.value) || 0))}
                    min={0}
                  />
                  <button type="button" onClick={() => setAdults(adults + 1)}>
                    +
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label>
                  {t('calculator.kids')} (${PRICING.KIDS_PRICE}/{t('pricing.perPerson')})
                </label>
                <div className="stepper">
                  <button
                    type="button"
                    onClick={() => setKids(Math.max(0, kids - 1))}
                    disabled={kids <= 0}
                  >
                    −
                  </button>
                  <Input
                    type="number"
                    value={kids}
                    onChange={(e) => setKids(Math.max(0, parseInt(e.target.value) || 0))}
                    min={0}
                  />
                  <button type="button" onClick={() => setKids(kids + 1)}>
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Upgrades */}
            <h3>{t('calculator.upgrades')}</h3>

            <div className="upgrades-grid">
              <div className="upgrade-item">
                <div className="upgrade-info">
                  <span className="upgrade-name">{t('menu.steak')}</span>
                  <span className="upgrade-price">
                    +${UPGRADES.FILET_MIGNON}/{t('pricing.perPerson')}
                  </span>
                </div>
                <div className="stepper small">
                  <button
                    type="button"
                    onClick={() => handleUpgradeChange('filetMignon', upgrades.filetMignon - 1)}
                  >
                    −
                  </button>
                  <span>{upgrades.filetMignon}</span>
                  <button
                    type="button"
                    onClick={() => handleUpgradeChange('filetMignon', upgrades.filetMignon + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="upgrade-item">
                <div className="upgrade-info">
                  <span className="upgrade-name">{t('menu.lobster')}</span>
                  <span className="upgrade-price">
                    +${UPGRADES.LOBSTER}/{t('pricing.perPerson')}
                  </span>
                </div>
                <div className="stepper small">
                  <button
                    type="button"
                    onClick={() => handleUpgradeChange('lobster', upgrades.lobster - 1)}
                  >
                    −
                  </button>
                  <span>{upgrades.lobster}</span>
                  <button
                    type="button"
                    onClick={() => handleUpgradeChange('lobster', upgrades.lobster + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="upgrade-item">
                <div className="upgrade-info">
                  <span className="upgrade-name">{t('calculator.thirdProtein')}</span>
                  <span className="upgrade-price">
                    +${UPGRADES.THIRD_PROTEIN}/{t('pricing.perPerson')}
                  </span>
                </div>
                <div className="stepper small">
                  <button
                    type="button"
                    onClick={() => handleUpgradeChange('thirdProtein', upgrades.thirdProtein - 1)}
                  >
                    −
                  </button>
                  <span>{upgrades.thirdProtein}</span>
                  <button
                    type="button"
                    onClick={() => handleUpgradeChange('thirdProtein', upgrades.thirdProtein + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="upgrade-item">
                <div className="upgrade-info">
                  <span className="upgrade-name">{t('calculator.noodles')}</span>
                  <span className="upgrade-price">
                    +${UPGRADES.NOODLES}/{t('pricing.perPerson')}
                  </span>
                </div>
                <div className="stepper small">
                  <button
                    type="button"
                    onClick={() => handleUpgradeChange('noodles', upgrades.noodles - 1)}
                  >
                    −
                  </button>
                  <span>{upgrades.noodles}</span>
                  <button
                    type="button"
                    onClick={() => handleUpgradeChange('noodles', upgrades.noodles + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Price Summary */}
          <div className="calculator-summary">
            <div className="summary-card">
              <h3>{t('calculator.summary')}</h3>

              <div className="summary-row">
                <span>
                  {adults} {t('calculator.adults')}
                </span>
                <span>${pricing.adults.toFixed(2)}</span>
              </div>

              {kids > 0 && (
                <div className="summary-row">
                  <span>
                    {kids} {t('calculator.kids')}
                  </span>
                  <span>${pricing.kids.toFixed(2)}</span>
                </div>
              )}

              {pricing.upgrades > 0 && (
                <div className="summary-row">
                  <span>{t('calculator.upgrades')}</span>
                  <span>${pricing.upgrades.toFixed(2)}</span>
                </div>
              )}

              <div className="summary-divider"></div>

              <div className="summary-row subtotal">
                <span>{t('calculator.subtotal')}</span>
                <span>${pricing.subtotal.toFixed(2)}</span>
              </div>

              {pricing.discount > 0 && (
                <div className="summary-row discount">
                  <span>
                    <Icon name="party" size={14} /> {t('calculator.discount')}
                  </span>
                  <span>-${pricing.discount.toFixed(2)}</span>
                </div>
              )}

              {!pricing.meetsMinimum && (
                <div className="summary-row minimum">
                  <span>{t('calculator.minimum')}</span>
                  <span>${PRICING.MINIMUM_ORDER.toFixed(2)}</span>
                </div>
              )}

              <div className="summary-divider"></div>
              <div className="summary-row total">
                <span>{t('calculator.total')}</span>
                <span>${pricing.total.toFixed(2)}</span>
              </div>

              <div className="summary-row gratuity">
                <span>{t('calculator.gratuity')} (20%)</span>
                <span>${pricing.gratuity.toFixed(2)}</span>
              </div>

              <div className="summary-row grand-total">
                <span>{t('calculator.grandTotal')}</span>
                <span>${pricing.grandTotal.toFixed(2)}</span>
              </div>

              <Button variant="primary" size="lg" onClick={goToBookNow} className="book-btn">
                {t('calculator.bookNow')}
              </Button>

              <p className="calculator-note">{t('calculator.note')}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PriceCalculator;
