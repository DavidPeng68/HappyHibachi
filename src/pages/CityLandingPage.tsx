import React, { lazy, Suspense, useMemo } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/common';
import { HowItWorks, MenuPricing } from '../components';
import { REGIONS, findBySlug, FAQ_ITEMS, PRICING } from '../constants';
import { useSettings } from '../hooks';
import './CityLandingPage.css';

const CustomerReviews = lazy(() => import('../components/CustomerReviews/CustomerReviews'));
const FAQ = lazy(() => import('../components/FAQ/FAQ'));
const Contact = lazy(() => import('../components/Contact/Contact'));

const LazySection: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense
    fallback={
      <div className="section-loading">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-text" />
      </div>
    }
  >
    {children}
  </Suspense>
);

const CityLandingPage: React.FC = () => {
  const { stateSlug, citySlug } = useParams<{ stateSlug: string; citySlug: string }>();
  const { t } = useTranslation();
  const { settings } = useSettings();

  const result = useMemo(
    () => (stateSlug ? findBySlug(stateSlug, citySlug) : null),
    [stateSlug, citySlug]
  );

  const faqItems = useMemo(
    () =>
      FAQ_ITEMS.map((item) => ({
        question: t(`faq.items.q${item.id}.question`),
        answer: t(`faq.items.q${item.id}.answer`),
      })),
    [t]
  );

  if (!result) {
    return <Navigate to="/" replace />;
  }

  const { region, city } = result;
  const cityName = city?.name ?? region.name;
  const stateName = region.name.charAt(0) + region.name.slice(1).toLowerCase();
  const displayName = city ? `${cityName}, ${stateName}` : stateName;

  const pageTitle = t('cityLanding.title', { city: cityName });
  const pageDescription = t('cityLanding.description', {
    city: cityName,
    state: stateName,
    price: PRICING.PER_PERSON,
  });

  return (
    <>
      <SEO
        title={pageTitle}
        description={pageDescription}
        type="local_business"
        keywords={`hibachi at home ${cityName}, hibachi catering ${cityName}, private chef ${cityName}, ${stateName} hibachi`}
        ogUrl={`${settings.brandInfo.url}/hibachi-catering/${region.slug}${city ? `/${city.slug}` : ''}`}
        faqItems={faqItems}
        reviewStats={undefined}
        cityName={cityName}
        stateName={stateName}
      />

      {/* Hero Section */}
      <section className="city-hero">
        <div className="city-hero-overlay" />
        <div className="city-hero-content">
          <nav className="city-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">{t('nav.home')}</Link>
            <span>/</span>
            <Link to={`/hibachi-catering/${region.slug}`}>{stateName}</Link>
            {city && (
              <>
                <span>/</span>
                <span>{cityName}</span>
              </>
            )}
          </nav>
          <h1 className="city-hero-title">{t('cityLanding.heroTitle', { city: cityName })}</h1>
          <p className="city-hero-subtitle">
            {t('cityLanding.heroSubtitle', { city: displayName, price: PRICING.PER_PERSON })}
          </p>
          <div className="city-hero-ctas">
            <Link to={`/order#${region.id}`} className="btn btn-primary btn-lg">
              {t('cityLanding.bookNow', { city: cityName })}
            </Link>
            <Link to="/free-estimate" className="btn btn-outline btn-lg">
              {t('hero.freeEstimate')}
            </Link>
          </div>
          <div className="city-hero-trust">
            <span>&#11088; {t('cityLanding.trustRated')}</span>
            <span>&#128737; {t('cityLanding.trustInsured')}</span>
            <span>&#127881; {t('cityLanding.trustEvents')}</span>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <HowItWorks />

      {/* Menu & Pricing */}
      <MenuPricing />

      {/* City-specific info for state pages */}
      {!city && (
        <section className="city-areas-section">
          <div className="container">
            <h2>{t('cityLanding.areasTitle', { state: stateName })}</h2>
            <p className="city-areas-subtitle">
              {t('cityLanding.areasSubtitle', { state: stateName })}
            </p>
            <div className="city-areas-grid">
              {region.cities.map((c) => (
                <Link
                  key={c.slug}
                  to={`/hibachi-catering/${region.slug}/${c.slug}`}
                  className="city-area-card"
                >
                  <h3>{c.name}</h3>
                  <span className="city-area-link">{t('cityLanding.viewCity')} &rarr;</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Nearby cities for city pages */}
      {city && (
        <section className="city-nearby-section">
          <div className="container">
            <h2>{t('cityLanding.nearbyTitle', { city: cityName })}</h2>
            <div className="city-nearby-grid">
              {region.cities
                .filter((c) => c.slug !== city.slug)
                .slice(0, 8)
                .map((c) => (
                  <Link
                    key={c.slug}
                    to={`/hibachi-catering/${region.slug}/${c.slug}`}
                    className="city-nearby-tag"
                  >
                    {c.name}
                  </Link>
                ))}
            </div>
          </div>
        </section>
      )}

      {/* Reviews */}
      <LazySection>
        <CustomerReviews />
      </LazySection>

      {/* FAQ */}
      <LazySection>
        <FAQ />
      </LazySection>

      {/* CTA */}
      <section className="city-cta-section">
        <div className="container">
          <h2>{t('cityLanding.ctaTitle', { city: cityName })}</h2>
          <p>{t('cityLanding.ctaSubtitle', { price: PRICING.PER_PERSON })}</p>
          <div className="city-cta-buttons">
            <Link to={`/order#${region.id}`} className="btn btn-primary btn-lg">
              {t('cityLanding.bookNow', { city: cityName })}
            </Link>
            <Link to="/free-estimate" className="btn btn-outline btn-lg">
              {t('hero.freeEstimate')}
            </Link>
          </div>
        </div>
      </section>

      {/* Contact */}
      <LazySection>
        <Contact />
      </LazySection>
    </>
  );
};

export default CityLandingPage;
