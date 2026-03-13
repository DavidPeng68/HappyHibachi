import { useCallback } from 'react';

/**
 * Hook for View Transitions API.
 * Wraps DOM state changes in a view transition for smooth page navigation.
 * Falls back to immediate execution when API is not available.
 */
export function useViewTransition() {
  const startTransition = useCallback((callback: () => void) => {
    if (document.startViewTransition) {
      document.startViewTransition(callback);
    } else {
      callback();
    }
  }, []);

  return startTransition;
}

export default useViewTransition;
