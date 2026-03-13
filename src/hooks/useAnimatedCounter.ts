import { useEffect, useState, useRef } from 'react';

interface UseAnimatedCounterOptions {
  duration?: number;
  delay?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

/**
 * Hook for animated number counter.
 * Smoothly counts from 0 to target using requestAnimationFrame.
 */
export function useAnimatedCounter(
  target: number,
  isVisible: boolean = true,
  options: UseAnimatedCounterOptions = {}
) {
  const { duration = 1500, delay = 0, decimals = 0, prefix = '', suffix = '' } = options;
  const [count, setCount] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isVisible || hasAnimated.current) return;

    const timeout = setTimeout(() => {
      hasAnimated.current = true;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic for natural deceleration
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(eased * target);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }, delay);

    return () => clearTimeout(timeout);
  }, [target, isVisible, duration, delay]);

  const formattedValue = `${prefix}${count.toFixed(decimals)}${suffix}`;

  return { value: count, formattedValue };
}

export default useAnimatedCounter;
