import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import chefCooking from '../../images/chef-cooking.jpg';
import food1 from '../../images/food-1.jpg';
import food2 from '../../images/food-2.jpg';
import gallery1 from '../../images/gallery-1.jpg';
import gallery2 from '../../images/gallery-2.jpg';
import { useSlider, useSettings } from '../../hooks';
import { Icon } from '../ui';
import './ImageSlider.css';

interface SlideItem {
  src: string;
  titleKey: string;
}

const STATIC_SLIDES: SlideItem[] = [
  { src: chefCooking, titleKey: 'slider.chef' },
  { src: food1, titleKey: 'slider.steak' },
  { src: food2, titleKey: 'slider.shrimp' },
  { src: gallery1, titleKey: 'slider.setup' },
  { src: gallery2, titleKey: 'slider.presentation' },
];

const ImageSlider: React.FC = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();

  const slides: SlideItem[] = useMemo(() => {
    const gallery = settings.galleryImages || [];
    if (gallery.length > 0) {
      return gallery
        .sort((a, b) => a.order - b.order)
        .map((img, i) => ({
          src: img.url,
          titleKey: img.caption || `slider.slide${i + 1}`,
        }));
    }
    return STATIC_SLIDES;
  }, [settings.galleryImages]);

  const { currentSlide, nextSlide, prevSlide, goToSlide } = useSlider({
    totalSlides: slides.length,
    autoPlay: true,
    intervalMs: 2500,
  });

  return (
    <section className="slider-section">
      <div className="slider">
        <div className="slide-container">
          {slides.map((slide, index) => (
            <div
              key={index}
              className={`slide ${index === currentSlide ? 'active' : ''}`}
              style={{ backgroundImage: `url(${slide.src})` }}
            >
              <div className="slide-content">
                <h2>{t(slide.titleKey)}</h2>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation buttons */}
        <button
          className="slider-btn prev"
          onClick={prevSlide}
          aria-label={t('common.previousSlide')}
          type="button"
        >
          <Icon name="chevron-left" size={20} />
        </button>
        <button
          className="slider-btn next"
          onClick={nextSlide}
          aria-label={t('common.nextSlide')}
          type="button"
        >
          <Icon name="chevron-right" size={20} />
        </button>

        {/* Slide indicators */}
        <div className="slide-indicators" role="tablist" aria-label="Slider navigation">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`indicator ${index === currentSlide ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
              role="tab"
              aria-selected={index === currentSlide}
              aria-label={`Go to slide ${index + 1}`}
              type="button"
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ImageSlider;
