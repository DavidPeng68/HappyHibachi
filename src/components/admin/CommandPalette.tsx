import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '../ui/Icon/Icon';
import type { IconName } from '../ui/Icon/Icon';
import type { AdminMenuType, Booking } from '../../types/admin';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (menu: AdminMenuType) => void;
  onRefresh: () => void;
  bookings: Booking[];
  visibleMenus: AdminMenuType[];
}

const MENU_ICONS: Record<AdminMenuType, IconName> = {
  dashboard: 'chart-bar',
  analytics: 'chart-line',
  bookings: 'clipboard',
  calendar: 'calendar',
  reviews: 'star-filled',
  coupons: 'ticket',
  gallery: 'camera',
  menu: 'utensils',
  instagram: 'instagram',
  customers: 'users',
  activity: 'activity',
  settings: 'settings-gear',
  users: 'user',
  team: 'users',
  dispatch: 'clipboard',
};

interface CommandItem {
  id: string;
  icon: IconName;
  label: string;
  description?: string;
  group: 'navigation' | 'actions' | 'bookings';
  action: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onClose,
  onNavigate,
  onRefresh,
  bookings,
  visibleMenus,
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset state when opened/closed
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      // Focus input on next tick
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Build all items
  const allItems = useMemo<CommandItem[]>(() => {
    const navItems: CommandItem[] = visibleMenus.map((menu) => ({
      id: `nav-${menu}`,
      icon: MENU_ICONS[menu],
      label: t(`admin.nav.${menu}`),
      group: 'navigation' as const,
      action: () => onNavigate(menu),
    }));

    const actionItems: CommandItem[] = [
      {
        id: 'action-refresh',
        icon: 'activity',
        label: t('admin.commandPalette.refresh'),
        group: 'actions' as const,
        action: () => onRefresh(),
      },
    ];

    const recentBookings = [...bookings]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map((b) => ({
        id: `booking-${b.id}`,
        icon: 'clipboard' as IconName,
        label: b.name,
        description: b.email,
        group: 'bookings' as const,
        action: () => onNavigate('bookings'),
      }));

    return [...navItems, ...actionItems, ...recentBookings];
  }, [visibleMenus, bookings, t, onNavigate, onRefresh]);

  // Filter items by query
  const filteredItems = useMemo(() => {
    if (!query.trim()) return allItems;
    const lowerQuery = query.toLowerCase();
    return allItems.filter((item) => {
      const matchLabel = item.label.toLowerCase().includes(lowerQuery);
      const matchDesc = item.description?.toLowerCase().includes(lowerQuery);
      return matchLabel || matchDesc;
    });
  }, [allItems, query]);

  // Group filtered items
  const groupedItems = useMemo(() => {
    const groups: { key: string; labelKey: string; items: CommandItem[] }[] = [];

    const navItems = filteredItems.filter((i) => i.group === 'navigation');
    if (navItems.length > 0) {
      groups.push({
        key: 'navigation',
        labelKey: 'admin.commandPalette.navigation',
        items: navItems,
      });
    }

    const actionItems = filteredItems.filter((i) => i.group === 'actions');
    if (actionItems.length > 0) {
      groups.push({ key: 'actions', labelKey: 'admin.commandPalette.actions', items: actionItems });
    }

    const bookingItems = filteredItems.filter((i) => i.group === 'bookings');
    if (bookingItems.length > 0) {
      groups.push({
        key: 'bookings',
        labelKey: 'admin.commandPalette.recentBookings',
        items: bookingItems,
      });
    }

    return groups;
  }, [filteredItems]);

  // Flatten for keyboard navigation
  const flatItems = useMemo(() => groupedItems.flatMap((g) => g.items), [groupedItems]);

  // Clamp active index
  useEffect(() => {
    if (activeIndex >= flatItems.length) {
      setActiveIndex(Math.max(0, flatItems.length - 1));
    }
  }, [flatItems.length, activeIndex]);

  // Scroll active item into view
  useEffect(() => {
    const activeEl = listRef.current?.querySelector('.cmdk-item.active');
    activeEl?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % Math.max(1, flatItems.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + flatItems.length) % Math.max(1, flatItems.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (flatItems[activeIndex]) {
          flatItems[activeIndex].action();
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [flatItems, activeIndex, onClose]
  );

  const handleItemClick = useCallback(
    (item: CommandItem) => {
      item.action();
      onClose();
    },
    [onClose]
  );

  if (!open) return null;

  let itemCounter = 0;

  return (
    <div className="cmdk-overlay" onClick={onClose}>
      <div
        className="cmdk-dialog"
        role="dialog"
        aria-label={t('admin.commandPalette.placeholder')}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="cmdk-input-wrapper">
          <Icon name="search" size={18} />
          <input
            ref={inputRef}
            className="cmdk-input"
            type="text"
            placeholder={t('admin.commandPalette.placeholder')}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
          />
          <span className="cmdk-kbd">Esc</span>
        </div>

        <div className="cmdk-results" ref={listRef}>
          {flatItems.length === 0 ? (
            <div className="cmdk-empty">{t('admin.commandPalette.noResults')}</div>
          ) : (
            groupedItems.map((group) => (
              <div key={group.key}>
                <div className="cmdk-group-label">{t(group.labelKey)}</div>
                {group.items.map((item) => {
                  const index = itemCounter++;
                  return (
                    <div
                      key={item.id}
                      className={`cmdk-item${index === activeIndex ? ' active' : ''}`}
                      onClick={() => handleItemClick(item)}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      <Icon name={item.icon} size={18} />
                      <span className="cmdk-item-label">{item.label}</span>
                      {item.description && (
                        <span className="cmdk-item-desc">{item.description}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
