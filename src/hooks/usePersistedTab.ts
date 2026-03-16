import { useLocalStorage } from './useLocalStorage';

/**
 * Persists the active tab index to localStorage.
 * @param key - A unique key per page (e.g., 'admin:settings-tab')
 * @param defaultTab - Default tab index (default: 0)
 */
export function usePersistedTab(key: string, defaultTab = 0): [number, (tab: number) => void] {
  return useLocalStorage<number>(key, defaultTab);
}
