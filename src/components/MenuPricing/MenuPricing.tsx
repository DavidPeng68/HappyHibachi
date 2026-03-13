import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useScrollReveal, useSettings, useMenu } from '../../hooks';
import { PRICING, UPGRADES } from '../../constants';
import { Icon } from '../ui';
import './MenuPricing.css';

/**
 * Menu pricing section component
 * Uses dynamic data from useMenu, falls back to constants
 */
const MenuPricing: React.FC = () => {
  const { t } = useTranslation();
  const { ref: sectionRef, isVisible } = useScrollReveal({ threshold: 0.1 });
  const { settings } = useSettings();
  const { contactInfo } = settings;
  const { menu, getLocalizedText } = useMenu();

  // Dynamic pricing or fallback to constants
  const pricing = useMemo(() => {
    if (menu?.pricing) {
      return {
        perPerson:
          menu.packages.find((p) => p.highlighted)?.pricePerPerson ??
          menu.packages[0]?.pricePerPerson ??
          PRICING.PER_PERSON,
        minimum: menu.pricing.minimumOrder,
        kidsPrice: menu.pricing.kidsPrice,
        creditCardFee: menu.pricing.creditCardFee,
        gratuitySuggested: menu.pricing.gratuitySuggested,
        cancellationFee: menu.pricing.cancellationFee,
      };
    }
    return {
      perPerson: PRICING.PER_PERSON,
      minimum: PRICING.MINIMUM_ORDER,
      kidsPrice: PRICING.KIDS_PRICE,
      creditCardFee: PRICING.CREDIT_CARD_FEE,
      gratuitySuggested: PRICING.GRATUITY_SUGGESTED,
      cancellationFee: PRICING.CANCELLATION_FEE,
    };
  }, [menu]);

  // Compute the lowest per-person price across all visible packages
  const lowestPrice = useMemo(() => {
    if (menu?.packages?.length) {
      const prices = menu.packages
        .filter((p) => p.visible && p.pricePerPerson > 0)
        .map((p) => p.pricePerPerson);
      return prices.length > 0 ? Math.min(...prices) : PRICING.PER_PERSON;
    }
    return PRICING.PER_PERSON;
  }, [menu]);

  // Dynamic proteins (regular category) or fallback
  const regularProteins = useMemo(() => {
    if (menu) {
      const regularCat = menu.categories.find((c) => c.slug === 'regular-proteins');
      if (regularCat) {
        return menu.items
          .filter((i) => i.categoryId === regularCat.id && i.available)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((i) => ({ name: getLocalizedText(i.name), price: i.price }));
      }
    }
    return [
      { name: t('menu.chicken'), price: 0 },
      { name: t('menu.steak'), price: 0 },
      { name: t('menu.shrimp'), price: 0 },
      { name: t('menu.salmon'), price: 0 },
      { name: t('menu.tofu'), price: 0 },
    ];
  }, [menu, getLocalizedText, t]);

  // Dynamic premium upgrades or fallback
  const premiumUpgrades = useMemo(() => {
    if (menu) {
      const premiumCat = menu.categories.find((c) => c.slug === 'premium');
      if (premiumCat) {
        return menu.items
          .filter((i) => i.categoryId === premiumCat.id && i.available)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((i) => ({ name: getLocalizedText(i.name), price: i.price }));
      }
    }
    return [
      { name: t('menu.upgrades.filet'), price: UPGRADES.FILET_MIGNON },
      { name: t('menu.upgrades.lobster'), price: UPGRADES.LOBSTER },
      { name: t('menu.upgrades.ribeye'), price: UPGRADES.PREMIUM_RIBEYE },
      { name: t('menu.upgrades.shrimp'), price: UPGRADES.JUMBO_SHRIMP },
      { name: t('menu.upgrades.salmon'), price: UPGRADES.SALMON },
      { name: t('menu.upgrades.scallops'), price: UPGRADES.LARGE_SCALLOPS },
    ];
  }, [menu, getLocalizedText, t]);

  // Dynamic add-ons or fallback
  const addons = useMemo(() => {
    if (menu) {
      const addonCat = menu.categories.find((c) => c.slug === 'add-ons');
      if (addonCat) {
        return menu.items
          .filter((i) => i.categoryId === addonCat.id && i.available)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((i) => ({ name: getLocalizedText(i.name), price: i.price }));
      }
    }
    return [
      { name: t('menu.addons.gyoza'), price: UPGRADES.GYOZA_12PCS },
      { name: t('menu.addons.edamame'), price: UPGRADES.EDAMAME },
      { name: t('menu.addons.noodles'), price: UPGRADES.NOODLES },
      { name: t('menu.addons.thirdProtein'), price: UPGRADES.THIRD_PROTEIN },
    ];
  }, [menu, getLocalizedText, t]);

  // Dynamic coupons or fallback
  const coupons = useMemo(() => {
    if (menu?.couponTiers?.length) {
      return menu.couponTiers
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((tier) => ({
          discount: tier.discount,
          range: getLocalizedText(tier.guestRange),
        }));
    }
    return [
      { discount: 30, range: t('coupon.under15') },
      { discount: 60, range: t('coupon.range15to25') },
      { discount: 90, range: t('coupon.range25to35') },
      { discount: 120, range: t('coupon.over35') },
    ];
  }, [menu, getLocalizedText, t]);

  return (
    <section className="menu-pricing" ref={sectionRef as React.RefObject<HTMLElement>}>
      <div className={`pricing-container ${isVisible ? 'visible' : ''}`}>
        {/* Header */}
        <div className="section-header">
          <h2>{t('menu.title')}</h2>
          <p className="starting-from-badge">{t('pricing.startingFrom', { price: lowestPrice })}</p>
        </div>

        {/* Main Pricing Card */}
        <div className="pricing-main animate-fade-in-up">
          <div className="price-display">
            <div className="price-tag">
              <span className="currency">$</span>
              <span className="amount">{pricing.perPerson}</span>
              <span className="unit">/{t('pricing.perPerson')}</span>
            </div>
            <p className="minimum">
              <strong>${pricing.minimum}</strong> {t('pricing.minimum')}
            </p>
          </div>

          <div className="pricing-includes">
            <div className="include-item">
              <span className="icon">
                <Icon name="salad" size={20} />
              </span>
              <span>{t('menu.includes.salad')}</span>
            </div>
            <div className="include-item">
              <span className="icon">
                <Icon name="rice" size={20} />
              </span>
              <span>{t('menu.includes.rice')}</span>
            </div>
            <div className="include-item">
              <span className="icon">
                <Icon name="vegetable" size={20} />
              </span>
              <span>{t('menu.includes.vegetables')}</span>
            </div>
            <div className="include-item">
              <span className="icon">
                <Icon name="mask" size={20} />
              </span>
              <span>{t('menu.includes.show')}</span>
            </div>
          </div>

          <p className="kids-note">
            <Icon name="money" size={16} /> ${pricing.kidsPrice} {t('pricing.kids')}
          </p>
        </div>

        {/* Protein Section */}
        <div className="protein-section">
          <h3>
            <Icon name="steak" size={18} /> {t('menu.protein.title')} (2 {t('pricing.perPerson')})
          </h3>
          <div className="protein-grid">
            {regularProteins.map((protein, idx) => (
              <div className="protein-item" key={idx}>
                <span className="name">{protein.name}</span>
                <span className="badge">{t('menu.protein.included')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Premium Upgrades */}
        <div className="upgrades-section">
          <h3>
            <Icon name="star-filled" size={18} /> {t('menu.upgrades.title')}
          </h3>
          <div className="upgrade-grid">
            {premiumUpgrades.map((upgrade, idx) => (
              <div className="upgrade-item" key={idx}>
                <span className="name">{upgrade.name}</span>
                <span className="price">+${upgrade.price}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Add-ons */}
        <div className="addons-section">
          <h3>
            <Icon name="plus" size={18} /> {t('menu.addons.title')}
          </h3>
          <div className="addon-grid">
            {addons.map((addon, idx) => (
              <div className="addon-item" key={idx}>
                <span>{addon.name}</span>
                <span className="price">${addon.price}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Coupon Section */}
        <div className="coupon-section">
          <h3>
            <Icon name="gift" size={18} /> {t('menu.coupon.title')}
          </h3>
          <p className="coupon-subtitle">{t('menu.coupon.subtitle')}</p>
          <div className="coupon-grid">
            {coupons.map((coupon, idx) => (
              <div className="coupon-item" key={idx}>
                <span className="discount">${coupon.discount}</span>
                <span className="range">{coupon.range}</span>
              </div>
            ))}
          </div>
          <p className="coupon-note">
            <Icon name="email" size={14} /> {t('menu.coupon.email')}{' '}
            <a href={`mailto:${contactInfo.email}`}>{contactInfo.email}</a>
          </p>
        </div>

        {/* Note */}
        <div className="pricing-note">
          <p>
            <Icon name="warning" size={16} /> <strong>{t('menu.note.outdoor')}</strong>
          </p>
          <p>{t('menu.note.weather')}</p>
        </div>
      </div>
    </section>
  );
};

export default MenuPricing;
