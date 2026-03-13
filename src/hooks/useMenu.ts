import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchMenu } from '../services/menuApi';
import type { MenuData, TranslatableText, LocaleCode } from '../types';

// Module-level cache (5 min TTL)
const CACHE_TTL = 5 * 60 * 1000;
let menuCache: { data: MenuData; timestamp: number } | null = null;

export function useMenu() {
  const { i18n } = useTranslation();
  const [menu, setMenu] = useState<MenuData | null>(menuCache?.data ?? null);
  const [loading, setLoading] = useState(!menuCache);
  const [error, setError] = useState<string | null>(null);

  const loadMenu = useCallback(async (force = false) => {
    // Use cache if valid and not forced
    if (!force && menuCache && Date.now() - menuCache.timestamp < CACHE_TTL) {
      setMenu(menuCache.data);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchMenu();
      menuCache = { data, timestamp: Date.now() };
      setMenu(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load menu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  const getLocalizedText = useCallback(
    (text: TranslatableText): string => {
      if (!text) return '';
      const lang = i18n.language as LocaleCode;
      return text[lang] || text.en || '';
    },
    [i18n.language]
  );

  return { menu, loading, error, refreshMenu: loadMenu, getLocalizedText };
}
