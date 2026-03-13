import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppNavigation, useSlider, useScrollReveal } from '../../hooks';
import { getTranslatedReviews } from '../../constants';
import { Button, Icon } from '../ui';
import './CustomerReviews.css';

interface Review {
  id: string | number;
  name: string;
  location: string;
  rating: number;
  review: string;
  event?: string;
}

/**
 * Customer reviews carousel component
 * Fetches reviews from API, falls back to constants
 */
const CustomerReviews: React.FC = () => {
  const { t } = useTranslation();
  const { goToBookNow } = useAppNavigation();
  const defaultReviews = getTranslatedReviews(t);
  const [reviews, setReviews] = useState<Review[]>(defaultReviews);
  const { ref: sectionRef, isVisible } = useScrollReveal({ threshold: 0.1 });

  // Fetch reviews from API
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch('/api/reviews');
        const result = await response.json();
        if (result.success && result.reviews?.length > 0) {
          setReviews(result.reviews);
        }
      } catch {
        // Keep using default reviews
      }
    };
    fetchReviews();
  }, []);

  const { currentSlide, nextSlide, prevSlide, goToSlide } = useSlider({
    totalSlides: reviews.length,
    autoPlay: true,
    intervalMs: 8000,
  });

  const review = reviews[currentSlide] || reviews[0];

  return (
    <section
      className="customer-reviews"
      id="reviews"
      ref={sectionRef as React.RefObject<HTMLElement>}
    >
      <div className={`reviews-container ${isVisible ? 'visible' : ''}`}>
        {/* Header */}
        <div className="section-header">
          <h2>{t('reviews.title')}</h2>
          <p className="section-subtitle">{t('reviews.subtitle')}</p>
        </div>

        {/* Review Card */}
        <div className="review-card" key={review.id}>
          {/* Stars */}
          <div className="review-stars">
            {[...Array(5)].map((_, i) => (
              <span key={i} className={`star ${i < review.rating ? 'filled' : ''}`}>
                ★
              </span>
            ))}
          </div>

          {/* Review Text */}
          <p className="review-text">&ldquo;{review.review}&rdquo;</p>

          {/* Reviewer Info */}
          <div className="reviewer-info">
            <div className="reviewer-avatar">{review.name.charAt(0)}</div>
            <div className="reviewer-details">
              <span className="reviewer-name">{review.name}</span>
              <span className="reviewer-location">{review.location}</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="review-nav">
          <button
            className="review-btn"
            onClick={prevSlide}
            type="button"
            aria-label={t('common.previous')}
          >
            <Icon name="chevron-left" size={20} />
          </button>
          <button
            className="review-btn"
            onClick={nextSlide}
            type="button"
            aria-label={t('common.next')}
          >
            <Icon name="chevron-right" size={20} />
          </button>
        </div>

        {/* Dots */}
        <div className="review-dots" role="tablist" aria-label="Review slides">
          {reviews.map((_, index) => (
            <button
              key={index}
              className={`review-dot ${index === currentSlide ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
              type="button"
              role="tab"
              aria-selected={index === currentSlide}
              aria-label={`${t('common.goTo')} ${index + 1}`}
            />
          ))}
        </div>

        {/* Trust Badge */}
        <div className="trust-badge">
          <div className="trust-badge-item">
            <span className="icon">
              <Icon name="star-filled" size={16} />
            </span>
            <span>{t('reviews.rating')}</span>
          </div>
          <div className="trust-badge-item">
            <span className="icon">
              <Icon name="check" size={16} />
            </span>
            <span>{t('reviews.verified')}</span>
          </div>
          <div className="trust-badge-item">
            <span className="icon">
              <Icon name="trophy" size={16} />
            </span>
            <span>{t('reviews.topRated')}</span>
          </div>
        </div>

        {/* CTA */}
        <div className="reviews-cta">
          <h3>{t('reviews.ctaTitle')}</h3>
          <p>{t('reviews.ctaText')}</p>
          <Button variant="primary" size="lg" onClick={goToBookNow} className="animate-glow">
            {t('nav.bookNow')}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CustomerReviews;
