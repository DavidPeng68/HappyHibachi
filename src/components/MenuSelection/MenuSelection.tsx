import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useMenu } from '../../hooks';
import { PRICING } from '../../constants';
import { MenuPackageCard, MenuSpotlight } from '../Menu';
import './MenuSelection.css';

/**
 * Menu selection section — simplified overview on homepage.
 * Full ordering experience is at /order (OrderBuilder).
 */
const MenuSelection: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { menu, loading, error, getLocalizedText } = useMenu();

  const visiblePackages = useMemo(() => {
    if (!menu) return [];
    return menu.packages.filter((p) => p.visible).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [menu]);

  const visibleSpotlights = useMemo(() => {
    if (!menu) return [];
    return menu.spotlights.filter((s) => s.visible).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [menu]);

  // Skeleton loading state
  if (loading) {
    return (
      <section className="menu-selection" id="menu">
        <h2>{t('menuSelection.title')}</h2>
        <p>{t('menuSelection.subtitle')}</p>
        <div className="menu-options">
          {[1, 2, 3, 4].map((i) => (
            <div className="menu-option skeleton-card" key={i}>
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-text" />
              <div className="skeleton skeleton-text short" />
              <div className="skeleton skeleton-price" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Error or no data — static fallback
  if (error || !menu) {
    const baseProteins = [
      t('menu.chicken'),
      t('menu.steak'),
      t('menu.shrimp'),
      t('menu.salmon'),
      t('menu.tofu'),
    ].join(', ');

    return (
      <section className="menu-selection" id="menu">
        <h2>{t('menuSelection.title')}</h2>
        <p>{t('menuSelection.subtitle')}</p>
        {error && <div className="menu-error-banner">{t('menu.loadError')}</div>}
        <div className="menu-options">
          <div className="menu-option">
            <h3>{t('menuSelection.regular.title')}</h3>
            <p>
              {t('menuSelection.regular.proteins')}: {baseProteins}
            </p>
            <p>{t('menuSelection.regular.service')}</p>
            <p className="price">
              ${PRICING.PER_PERSON}/{t('pricing.perPerson')}
            </p>
          </div>
          <div className="menu-option premium">
            <h3>{t('menuSelection.premium.title')}</h3>
            <p>{t('menuSelection.premium.proteins')}</p>
            <p>{t('menuSelection.premium.service')}</p>
            <p className="price">
              {t('menuSelection.premium.price')}/{t('pricing.perPerson')}
            </p>
          </div>
          <div className="menu-option">
            <h3>{t('menuSelection.catering.title')}</h3>
            <p>{t('menuSelection.catering.note')}</p>
            <p>
              {t('menuSelection.catering.proteins')}: {baseProteins}
            </p>
            <p>{t('menuSelection.catering.service')}</p>
            <p className="price">
              {t('menuSelection.catering.price')}/{t('pricing.perPerson')}
            </p>
          </div>
          <div className="menu-option">
            <h3>{t('menuSelection.intimate.title')}</h3>
            <p>{t('menuSelection.intimate.note')}</p>
            <p>{t('menuSelection.intimate.includes')}</p>
            <p>{t('menuSelection.intimate.substitution')}</p>
            <p className="price">
              ${PRICING.MINIMUM_ORDER} {t('common.total')}
            </p>
          </div>
        </div>
        <div className="menu-cta-wrapper">
          <Link to="/order" className="menu-cta-btn">
            {t('order.buildYourOrder')}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="menu-selection menu-selection--dynamic" id="menu">
      <h2>{t('menu.choosePackage')}</h2>
      <p>{t('menu.allMealsInclude')}</p>

      {/* Package Comparison Grid */}
      <div className="menu-packages-grid">
        {visiblePackages.map((pkg) => (
          <div
            key={pkg.id}
            className={`menu-package-compare ${pkg.highlighted ? 'menu-package-compare--popular' : ''}`}
          >
            <MenuPackageCard
              pkg={pkg}
              isSelected={false}
              onSelect={() => navigate(`/order?package=${pkg.id}`)}
              getLocalizedText={getLocalizedText}
            />
            {pkg.proteinCount > 0 && (
              <div className="menu-package-protein-count">
                {t('menuSelection.proteinsPerPerson', { count: pkg.proteinCount })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* CTA to /order */}
      <div className="menu-cta-wrapper">
        <Link to="/order" className="menu-cta-btn">
          {t('order.buildYourOrder')}
        </Link>
      </div>

      {/* Spotlight Sections */}
      {visibleSpotlights.length > 0 && (
        <div className="menu-spotlights">
          <h3 className="menu-spotlights-title">{t('menu.signatureDishes')}</h3>
          <MenuSpotlight spotlights={visibleSpotlights} getLocalizedText={getLocalizedText} />
        </div>
      )}
    </section>
  );
};

export default MenuSelection;
