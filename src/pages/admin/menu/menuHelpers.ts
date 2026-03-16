import type { TranslatableText } from '../../../types/menu';

export type TabKey = 'packages' | 'categories' | 'items' | 'spotlights' | 'pricing';

export const TAB_KEYS: TabKey[] = ['packages', 'categories', 'items', 'spotlights', 'pricing'];

export const TAB_I18N: Record<TabKey, string> = {
  packages: 'admin.menu.tabPackages',
  categories: 'admin.menu.tabCategories',
  items: 'admin.menu.tabItems',
  spotlights: 'admin.menu.tabSpotlights',
  pricing: 'admin.menu.tabPricing',
};

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function emptyText(en = ''): TranslatableText {
  return { en };
}

export function getToken(): string {
  return sessionStorage.getItem('admin_token') ?? '';
}
