import { useCallback, useEffect, useRef } from 'react';

const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = [
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
];

/**
 * Auto-logout after a period of inactivity.
 * Tracks mouse, keyboard, scroll, and touch events.
 *
 * @param onTimeout Callback when session expires
 * @param timeoutMs Inactivity threshold in ms (default: 30 minutes)
 */
export function useSessionTimeout(onTimeout: () => void, timeoutMs = 30 * 60 * 1000): void {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onTimeoutRef.current();
    }, timeoutMs);
  }, [timeoutMs]);

  useEffect(() => {
    resetTimer();

    const handler = () => resetTimer();
    for (const event of ACTIVITY_EVENTS) {
      document.addEventListener(event, handler, { passive: true });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const event of ACTIVITY_EVENTS) {
        document.removeEventListener(event, handler);
      }
    };
  }, [resetTimer]);
}
