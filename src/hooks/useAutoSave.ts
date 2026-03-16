import { useEffect, useRef, useCallback, useState } from 'react';

interface UseAutoSaveOptions<T> {
  key: string; // localStorage key for draft
  data: T; // Current form data
  debounceMs?: number; // Default 2000
  onRestore?: (data: T) => void;
  enabled?: boolean; // Default true
}

interface UseAutoSaveReturn {
  hasDraft: boolean;
  lastSaved: Date | null;
  clearDraft: () => void;
  restoreDraft: () => void;
}

export function useAutoSave<T>(options: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const { key, data, debounceMs = 2000, onRestore, enabled = true } = options;

  const [hasDraft, setHasDraft] = useState<boolean>(() => {
    if (!enabled) return false;
    try {
      return localStorage.getItem(key) !== null;
    } catch {
      return false;
    }
  });
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;

  // Track whether initial mount has passed to avoid saving initialValues immediately
  const isInitialMount = useRef(true);

  // Debounced auto-save
  useEffect(() => {
    if (!enabled) return;

    // Skip the first render so we don't overwrite a draft with initial values
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(data));
        setHasDraft(true);
        setLastSaved(new Date());
      } catch {
        // localStorage full or unavailable — degrade silently
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [key, data, debounceMs, enabled]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    setHasDraft(false);
    setLastSaved(null);
  }, [key]);

  const restoreDraft = useCallback(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored) as T;
        if (onRestoreRef.current) {
          onRestoreRef.current(parsed);
        }
      }
    } catch {
      // ignore parse errors
    }
  }, [key]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    hasDraft,
    lastSaved,
    clearDraft,
    restoreDraft,
  };
}
