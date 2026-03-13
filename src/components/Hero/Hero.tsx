import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppNavigation, useSettings, useMagnetic } from '../../hooks';
import { Button, Icon } from '../ui';
import './Hero.css';

/**
 * Hero section component
 * Main landing section with animated gradient background, grain overlay,
 * blob decorations, enhanced particles, and CTA buttons
 */
const Hero: React.FC = () => {
  const { t } = useTranslation();
  const { goToFreeEstimate, goToBookNow } = useAppNavigation();
  const { settings } = useSettings();
  const { brandInfo } = settings;
  const magneticRef = useMagnetic<HTMLDivElement>({ strength: 0.2, radius: 120 });

  return (
    <section className="hero grain-overlay" aria-label={t('hero.tagline')}>
      {/* Background: video > image > animated gradient */}
      {brandInfo.heroVideo ? (
        <video className="hero-video-bg" autoPlay muted loop playsInline aria-hidden="true">
          <source src={brandInfo.heroVideo} type="video/mp4" />
        </video>
      ) : (
        <div
          className="hero-bg visible"
          aria-hidden="true"
          style={
            brandInfo.heroImage
              ? {
                  backgroundImage: `url(${brandInfo.heroImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : undefined
          }
        />
      )}

      {/* Overlay */}
      <div className="hero-overlay" aria-hidden="true" />

      {/* Fire particles effect (enhanced) */}
      <div className="fire-particles" aria-hidden="true" />

      {/* Blob decorations */}
      <div className="blob blob--primary hero-blob-1" aria-hidden="true" />
      <div className="blob blob--secondary hero-blob-2" aria-hidden="true" />

      <div className="hero-content">
        {/* Tagline */}
        <div className="hero-tagline">
          <h2>
            <Icon name="fire" size={18} /> {t('hero.tagline')} <Icon name="fire" size={18} />
          </h2>
        </div>

        {/* Main Title with fire gradient + kinetic effect */}
        <h1 className="kinetic-heading">
          <span>{brandInfo.name.toUpperCase()}</span>
        </h1>

        {/* Description */}
        <p>{t('hero.description')}</p>

        {/* Service Areas Badge */}
        <div className="service-areas">
          <Icon name="map-pin" size={16} /> {t('booking.california')} • {t('booking.texas')} •{' '}
          {t('booking.florida')}
        </div>

        {/* CTA Buttons with magnetic effect */}
        <div className="hero-buttons">
          <div ref={magneticRef} className="btn-magnetic" style={{ display: 'inline-block' }}>
            <Button variant="primary" size="lg" onClick={goToBookNow} className="hero-btn">
              <Icon name="party" size={16} /> {t('hero.bookNow')}
            </Button>
          </div>
          <Button variant="secondary" size="lg" onClick={goToFreeEstimate} className="hero-btn">
            {t('hero.freeEstimate')}
          </Button>
        </div>

        {/* Trust Indicators */}
        <p className="hero-trust-indicators">{t('hero.trustIndicators')}</p>

        {/* Slogan */}
        <p className="hero-slogan">{t('hero.slogan', brandInfo.hashtag)}</p>
      </div>
    </section>
  );
};

export default Hero;
