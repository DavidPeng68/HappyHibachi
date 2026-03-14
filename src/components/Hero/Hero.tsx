import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppNavigation, useSettings, useMagnetic, useSlider } from '../../hooks';
import { Button, Icon } from '../ui';
import heroBg from '../../images/hero-bg.jpg';
import chefCooking from '../../images/chef-cooking.jpg';
import food1 from '../../images/food-1.jpg';
import food2 from '../../images/food-2.jpg';
import gallery1 from '../../images/gallery-1.jpg';
import gallery2 from '../../images/gallery-2.jpg';
import gallery3 from '../../images/gallery-3.jpg';
import './Hero.css';

const HERO_SLIDES = [
  { src: heroBg, altKey: 'hero.slides.heroBg' },
  { src: chefCooking, altKey: 'hero.slides.chefCooking' },
  { src: food1, altKey: 'hero.slides.food1' },
  { src: food2, altKey: 'hero.slides.food2' },
  { src: gallery1, altKey: 'hero.slides.gallery1' },
  { src: gallery2, altKey: 'hero.slides.gallery2' },
  { src: gallery3, altKey: 'hero.slides.gallery3' },
];

/**
 * Hero section component
 * Main landing section with image carousel background, grain overlay,
 * blob decorations, enhanced particles, and CTA buttons
 */
const Hero: React.FC = () => {
  const { t } = useTranslation();
  const { goToFreeEstimate, goToBookNow } = useAppNavigation();
  const { settings } = useSettings();
  const { brandInfo } = settings;
  const magneticRef = useMagnetic<HTMLDivElement>({ strength: 0.2, radius: 120 });
  const { currentSlide } = useSlider({
    totalSlides: HERO_SLIDES.length,
    autoPlay: true,
    intervalMs: 5000,
  });

  return (
    <section className="hero grain-overlay" aria-label={t('hero.tagline')}>
      {/* Gradient fallback (visible while images load) */}
      <div className="hero-bg visible" aria-hidden="true" />

      {/* Carousel background images */}
      {HERO_SLIDES.map((slide, index) => (
        <img
          key={index}
          className={`hero-carousel-img ${index === currentSlide ? 'active' : ''}`}
          src={slide.src}
          alt={t(slide.altKey)}
          loading={index === 0 ? 'eager' : 'lazy'}
          fetchPriority={index === 0 ? 'high' : undefined}
        />
      ))}

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

      {/* Slide indicators */}
      <div className="hero-slide-indicators" aria-hidden="true">
        {HERO_SLIDES.map((_, i) => (
          <span key={i} className={`hero-dot ${i === currentSlide ? 'active' : ''}`} />
        ))}
      </div>
    </section>
  );
};

export default Hero;
