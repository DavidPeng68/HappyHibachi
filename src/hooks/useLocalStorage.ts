import { useCallback, useState } from 'react';

/**
 * useState backed by localStorage for persistence across sessions.
 *
 * @param key  localStorage key (namespaced by caller, e.g. 'admin:sidebar-collapsed')
 * @param defaultValue  Initial value when nothing is stored
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item !== null ? (JSON.parse(item) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const nextValue = value instanceof Function ? value(prev) : value;
        try {
          localStorage.setItem(key, JSON.stringify(nextValue));
        } catch {
          // localStorage full or unavailable — degrade silently
        }
        return nextValue;
      });
    },
    [key]
  );

  return [storedValue, setValue];
}
