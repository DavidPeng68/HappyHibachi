import React, { useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import gallery1 from '../../images/gallery-1.jpg';
import gallery2 from '../../images/gallery-2.jpg';
import gallery3 from '../../images/gallery-3.jpg';
import food1 from '../../images/food-1.jpg';
import food2 from '../../images/food-2.jpg';
import chefCooking from '../../images/chef-cooking.jpg';
import { useSlider, useScrollReveal, useSettings } from '../../hooks';
import { Icon } from '../ui';
import type { GalleryImage, GalleryImageApi } from '../../types';
import './Gallery.css';

const Gallery: React.FC = () => {
  const { t } = useTranslation();
  const { ref: sectionRef, isVisible } = useScrollReveal({ threshold: 0.1 });
  const { settings } = useSettings();
  const apiImages = settings.galleryImages;

  // 默认图片
  const defaultItems: GalleryImage[] = useMemo(
    () => [
      { src: chefCooking, alt: t('gallery.items.chef'), description: t('gallery.items.chefDesc') },
      { src: gallery1, alt: t('gallery.items.grill'), description: t('gallery.items.grillDesc') },
      { src: food1, alt: t('gallery.items.steak'), description: t('gallery.items.steakDesc') },
      {
        src: gallery2,
        alt: t('gallery.items.vegetables'),
        description: t('gallery.items.vegetablesDesc'),
      },
      { src: food2, alt: t('gallery.items.shrimp'), description: t('gallery.items.shrimpDesc') },
      { src: gallery3, alt: t('gallery.items.food'), description: t('gallery.items.foodDesc') },
    ],
    [t]
  );

  const sortedApiImages = useMemo(
    () => [...apiImages].sort((a: GalleryImageApi, b: GalleryImageApi) => a.order - b.order),
    [apiImages]
  );

  const galleryItems: GalleryImage[] = useMemo(() => {
    if (sortedApiImages.length > 0) {
      return sortedApiImages.map((img, idx) => ({
        src: img.url,
        alt: img.caption || `Gallery Image ${idx + 1}`,
        description: img.caption || `Gallery Image ${idx + 1}`,
      }));
    }
    return defaultItems;
  }, [sortedApiImages, defaultItems]);

  const { currentSlide, nextSlide, prevSlide, goToSlide } = useSlider({
    totalSlides: galleryItems.length,
    autoPlay: true,
    intervalMs: 4000,
  });

  const currentImage = galleryItems[currentSlide];

  // Keyboard navigation for gallery
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        prevSlide();
      } else if (e.key === 'ArrowRight') {
        nextSlide();
      }
    },
    [prevSlide, nextSlide]
  );

  useEffect(() => {
    const section = (sectionRef as React.RefObject<HTMLElement>).current;
    if (!section) return;
    section.addEventListener('keydown', handleKeyDown);
    return () => section.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, sectionRef]);

  return (
    <section
      className="gallery"
      id="gallery"
      ref={sectionRef as React.RefObject<HTMLElement>}
      role="region"
      aria-roledescription="carousel"
      aria-label={t('gallery.title')}
      tabIndex={0}
    >
      <div className={`gallery-content ${isVisible ? 'visible' : ''}`}>
        <h2>{t('gallery.title')}</h2>
        <p className="gallery-subtitle">{t('gallery.subtitle')}</p>

        <div className="gallery-container">
          <div className="gallery-slide">
            <img src={currentImage.src} alt={currentImage.alt} loading="lazy" key={currentSlide} />
            <div className="gallery-caption">
              <h3>{currentImage.description}</h3>
              <p>
                {currentSlide + 1} / {galleryItems.length}
              </p>
            </div>
          </div>

          <button
            className="gallery-btn prev"
            onClick={prevSlide}
            aria-label={t('common.previous')}
            type="button"
          >
            <Icon name="chevron-left" />
          </button>
          <button
            className="gallery-btn next"
            onClick={nextSlide}
            aria-label={t('common.next')}
            type="button"
          >
            <Icon name="chevron-right" />
          </button>

          <div className="gallery-dots" role="tablist" aria-label="Gallery slides">
            {galleryItems.map((_, index) => (
              <button
                key={index}
                className={`dot ${index === currentSlide ? 'active' : ''}`}
                onClick={() => goToSlide(index)}
                aria-label={`${t('common.goTo')} ${index + 1}`}
                role="tab"
                aria-selected={index === currentSlide}
                type="button"
              />
            ))}
          </div>
        </div>

        {/* Thumbnails */}
        <div className="gallery-thumbnails">
          {galleryItems.map((item, index) => (
            <button
              key={index}
              className={`thumbnail ${index === currentSlide ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
              type="button"
              aria-label={item.alt}
            >
              <img src={item.src} alt={item.alt} loading="lazy" />
            </button>
          ))}
        </div>

        {/* Bento Grid Layout */}
        <div className="gallery-bento">
          {galleryItems.map((item, index) => {
            const sizeClass =
              index === 0
                ? 'gallery-bento-item--large'
                : index % 3 === 0
                  ? 'gallery-bento-item--medium'
                  : 'gallery-bento-item--small';
            return (
              <div
                key={index}
                className={`gallery-bento-item ${sizeClass}`}
                onClick={() => goToSlide(index)}
                role="button"
                tabIndex={0}
                aria-label={item.alt}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    goToSlide(index);
                  }
                }}
              >
                <img src={item.src} alt={item.alt} loading="lazy" />
                <div className="gallery-bento-caption">{item.description}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Gallery;
