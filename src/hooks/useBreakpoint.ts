import { useState, useEffect, useCallback } from 'react';

const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
} as const;

export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide';

interface BreakpointState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWide: boolean;
  breakpoint: Breakpoint;
  width: number;
}

function getBreakpoint(width: number): Breakpoint {
  if (width < BREAKPOINTS.tablet) return 'mobile';
  if (width < BREAKPOINTS.desktop) return 'tablet';
  if (width < BREAKPOINTS.wide) return 'desktop';
  return 'wide';
}

function getState(width: number): BreakpointState {
  return {
    isMobile: width < BREAKPOINTS.tablet,
    isTablet: width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop,
    isDesktop: width >= BREAKPOINTS.desktop,
    isWide: width >= BREAKPOINTS.wide,
    breakpoint: getBreakpoint(width),
    width,
  };
}

export function useBreakpoint(): BreakpointState {
  const [state, setState] = useState<BreakpointState>(() =>
    getState(typeof window !== 'undefined' ? window.innerWidth : BREAKPOINTS.desktop)
  );

  const handleResize = useCallback(() => {
    setState(getState(window.innerWidth));
  }, []);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${BREAKPOINTS.tablet - 1}px)`);
    const mqlDesktop = window.matchMedia(`(max-width: ${BREAKPOINTS.desktop - 1}px)`);
    const mqlWide = window.matchMedia(`(max-width: ${BREAKPOINTS.wide - 1}px)`);

    const onChange = () => handleResize();
    mql.addEventListener('change', onChange);
    mqlDesktop.addEventListener('change', onChange);
    mqlWide.addEventListener('change', onChange);
    window.addEventListener('resize', handleResize);

    handleResize();

    return () => {
      mql.removeEventListener('change', onChange);
      mqlDesktop.removeEventListener('change', onChange);
      mqlWide.removeEventListener('change', onChange);
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  return state;
}

export { BREAKPOINTS };
