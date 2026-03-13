import { useState, useEffect, useCallback } from 'react';
import { ANIMATION } from '../constants';

interface UseSliderOptions {
  totalSlides: number;
  autoPlay?: boolean;
  intervalMs?: number;
}

/**
 * Custom hook for slider/carousel functionality
 * Handles auto-play, manual navigation, and cleanup
 */
export const useSlider = ({
  totalSlides,
  autoPlay = true,
  intervalMs = ANIMATION.SLIDE_INTERVAL_MS,
}: UseSliderOptions) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(autoPlay);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const goToSlide = useCallback(
    (index: number) => {
      if (index >= 0 && index < totalSlides) {
        setCurrentSlide(index);
      }
    },
    [totalSlides]
  );

  const pauseAutoPlay = useCallback(() => {
    setIsAutoPlaying(false);
  }, []);

  const resumeAutoPlay = useCallback(() => {
    setIsAutoPlaying(true);
  }, []);

  // Auto-play effect
  useEffect(() => {
    if (!isAutoPlaying || totalSlides <= 1) return;

    const interval = setInterval(nextSlide, intervalMs);
    return () => clearInterval(interval);
  }, [isAutoPlaying, totalSlides, intervalMs, nextSlide]);

  return {
    currentSlide,
    nextSlide,
    prevSlide,
    goToSlide,
    isAutoPlaying,
    pauseAutoPlay,
    resumeAutoPlay,
    totalSlides,
  };
};

export default useSlider;
