import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppNavigation, useSettings, useMagnetic, useSlider } from '../../hooks';
import { Button, Icon } from '../ui';
import { REGIONS } from '../../constants';
import heroBg from '../../images/hero-bg.webp';
import chefCooking from '../../images/chef-cooking.webp';
import food1 from '../../images/food-1.webp';
import food2 from '../../images/food-2.webp';
import gallery1 from '../../images/gallery-1.webp';
import gallery2 from '../../images/gallery-2.webp';
import gallery3 from '../../images/gallery-3.webp';
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
  const navigate = useNavigate();
  const { goToFreeEstimate, goToBookNow } = useAppNavigation();
  const { settings } = useSettings();
  const { brandInfo } = settings;

  // Quick-quote form state
  const [quoteGuests, setQuoteGuests] = useState('');
  const [quoteDate, setQuoteDate] = useState('');
  const [quoteRegion, setQuoteRegion] = useState('');

  const handleQuickQuote = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const params = new URLSearchParams();
      if (quoteGuests) params.set('guests', quoteGuests);
      if (quoteDate) params.set('date', quoteDate);
      if (quoteRegion) params.set('region', quoteRegion);
      navigate(`/free-estimate?${params.toString()}`);
    },
    [quoteGuests, quoteDate, quoteRegion, navigate]
  );

  // Animated counter
  const counterRef = useRef<HTMLDivElement>(null);
  const [countersVisible, setCountersVisible] = useState(false);
  const [counts, setCounts] = useState({ events: 0, cities: 0, rating: 0 });

  useEffect(() => {
    const el = counterRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCountersVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!countersVisible) return;
    const targets = { events: 1200, cities: 48, rating: 5 };
    const duration = 1500;
    const steps = 40;
    const interval = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      setCounts({
        events: Math.round(targets.events * eased),
        cities: Math.round(targets.cities * eased),
        rating: Math.round(targets.rating * eased * 10) / 10,
      });
      if (step >= steps) clearInterval(timer);
    }, interval);
    return () => clearInterval(timer);
  }, [countersVisible]);

  // Minimum date = tomorrow
  const minDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const magneticRef = useMagnetic<HTMLDivElement>({ strength: 0.2, radius: 120 });
  const { currentSlide } = useSlider({
    totalSlides: HERO_SLIDES.length,
    autoPlay: true,
    intervalMs: 5000,
  });

  // Track which slides have been loaded — always load current and preload next
  const [loadedSlides, setLoadedSlides] = useState<Set<number>>(() => new Set([0, 1]));

  useEffect(() => {
    const next = (currentSlide + 1) % HERO_SLIDES.length;
    setLoadedSlides((prev) => {
      if (prev.has(currentSlide) && prev.has(next)) return prev;
      const updated = new Set(prev);
      updated.add(currentSlide);
      updated.add(next);
      return updated;
    });
  }, [currentSlide]);

  return (
    <section className="hero grain-overlay" aria-label={t('hero.tagline')}>
      {/* Gradient fallback (visible while images load) */}
      <div className="hero-bg visible" aria-hidden="true" />

      {/* Carousel background images — only render loaded slides */}
      {HERO_SLIDES.map((slide, index) =>
        loadedSlides.has(index) ? (
          <img
            key={index}
            className={`hero-carousel-img ${index === currentSlide ? 'active' : ''}`}
            src={slide.src}
            alt={t(slide.altKey)}
            loading={index === 0 ? 'eager' : 'lazy'}
            fetchPriority={index === 0 ? 'high' : undefined}
          />
        ) : null
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

        {/* Animated Stats Counter */}
        <div className="hero-stats" ref={counterRef}>
          <div className="hero-stat">
            <span className="hero-stat-number">{counts.events.toLocaleString()}+</span>
            <span className="hero-stat-label">{t('hero.stats.events')}</span>
          </div>
          <div className="hero-stat-divider" />
          <div className="hero-stat">
            <span className="hero-stat-number">{counts.cities}+</span>
            <span className="hero-stat-label">{t('hero.stats.cities')}</span>
          </div>
          <div className="hero-stat-divider" />
          <div className="hero-stat">
            <span className="hero-stat-number">{counts.rating}</span>
            <span className="hero-stat-label">{t('hero.stats.rating')}</span>
          </div>
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

        {/* Quick Quote Form */}
        <form className="hero-quick-quote" onSubmit={handleQuickQuote}>
          <div className="quick-quote-fields">
            <div className="quick-quote-field">
              <Icon name="user" size={14} />
              <input
                type="number"
                min="10"
                max="200"
                placeholder={t('hero.quickQuote.guests')}
                value={quoteGuests}
                onChange={(e) => setQuoteGuests(e.target.value)}
                aria-label={t('hero.quickQuote.guests')}
              />
            </div>
            <div className="quick-quote-field">
              <Icon name="calendar" size={14} />
              <input
                type="date"
                min={minDate}
                value={quoteDate}
                onChange={(e) => setQuoteDate(e.target.value)}
                aria-label={t('hero.quickQuote.date')}
              />
            </div>
            <div className="quick-quote-field">
              <Icon name="map-pin" size={14} />
              <select
                value={quoteRegion}
                onChange={(e) => setQuoteRegion(e.target.value)}
                aria-label={t('hero.quickQuote.region')}
              >
                <option value="">{t('hero.quickQuote.region')}</option>
                {REGIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {t(`nav.${r.id}`, r.name)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button type="submit" variant="primary" size="md" className="quick-quote-btn">
            {t('hero.quickQuote.submit')}
          </Button>
        </form>

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
