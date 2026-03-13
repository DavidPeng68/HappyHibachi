import { useEffect, useRef } from 'react';

interface UseMagneticOptions {
  strength?: number;
  radius?: number;
}

/**
 * Hook for magnetic button effect.
 * Element subtly pulls toward cursor when nearby.
 * Disabled on touch devices (no hover context).
 */
export function useMagnetic<T extends HTMLElement = HTMLElement>(options: UseMagneticOptions = {}) {
  const { strength = 0.3, radius = 100 } = options;
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Skip on touch devices
    if ('ontouchstart' in window) return;

    // Respect reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = Math.sqrt((e.clientX - centerX) ** 2 + (e.clientY - centerY) ** 2);

      if (distance < radius) {
        const pullX = (e.clientX - centerX) * strength;
        const pullY = (e.clientY - centerY) * strength;
        element.style.transform = `translate(${pullX}px, ${pullY}px)`;
      } else {
        element.style.transform = 'translate(0, 0)';
      }
    };

    const handleMouseLeave = () => {
      element.style.transform = 'translate(0, 0)';
    };

    document.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [strength, radius]);

  return ref;
}

export default useMagnetic;
