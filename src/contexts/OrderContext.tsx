import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { OrderState, MenuData } from '../types';

const STORAGE_KEY = 'hibachi_order';
const MAX_ITEM_QUANTITY = 100;

interface OrderContextValue {
  order: OrderState;
  // Guest management
  setGuestCount: (count: number) => void;
  setKidsCount: (count: number) => void;
  // Package
  selectPackage: (packageId: string) => void;
  // Protein selections (simple string[] of menuItemIds)
  toggleProtein: (menuItemId: string, maxCount: number) => void;
  clearProteins: () => void;
  // Add-ons
  addAddon: (menuItemId: string, qty?: number) => void;
  removeAddon: (menuItemId: string) => void;
  updateAddonQuantity: (menuItemId: string, qty: number) => void;
  // Legacy compatibility (for existing MenuSelection until OrderBuilder replaces it)
  addItem: (itemId: string, qty?: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, qty: number) => void;
  // Order management
  clearOrder: () => void;
  getTotal: (menu: MenuData | null) => number;
  itemCount: number;
}

const defaultOrder: OrderState = {
  packageId: null,
  guestCount: 10,
  kidsCount: 0,
  proteinSelections: [],
  addons: [],
};

/**
 * Load order from sessionStorage, migrating from old format if needed.
 * Old format had { packageId, items: OrderItem[], guestCount }.
 * New format has { packageId, guestCount, kidsCount, proteinSelections, addons }.
 */
function loadOrder(): OrderState {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultOrder;

    const parsed = JSON.parse(stored);

    // Detect old format: has `items` array but no `proteinSelections`
    if (parsed.items && !parsed.proteinSelections) {
      return {
        packageId: parsed.packageId ?? null,
        guestCount: parsed.guestCount ?? 10,
        kidsCount: 0,
        proteinSelections: [],
        addons: (parsed.items as { menuItemId: string; quantity: number }[]).map((i) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
        })),
      };
    }

    // New format — fill defaults for any missing fields
    return {
      ...defaultOrder,
      ...parsed,
    };
  } catch {
    return defaultOrder;
  }
}

function saveOrder(order: OrderState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  } catch {
    // Ignore storage errors (e.g. quota exceeded)
  }
}

const OrderContext = createContext<OrderContextValue | null>(null);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [order, setOrder] = useState<OrderState>(loadOrder);

  useEffect(() => {
    saveOrder(order);
  }, [order]);

  // --- Guest management ---

  const setGuestCount = useCallback((count: number) => {
    setOrder((prev) => ({ ...prev, guestCount: Math.max(1, count) }));
  }, []);

  const setKidsCount = useCallback((count: number) => {
    setOrder((prev) => ({ ...prev, kidsCount: Math.max(0, count) }));
  }, []);

  // --- Package ---

  const selectPackage = useCallback((packageId: string) => {
    setOrder((prev) => ({
      ...prev,
      packageId,
      proteinSelections: [], // clear proteins when switching packages
    }));
  }, []);

  // --- Protein selections ---

  const toggleProtein = useCallback((menuItemId: string, maxCount: number) => {
    setOrder((prev) => {
      const idx = prev.proteinSelections.indexOf(menuItemId);
      if (idx >= 0) {
        // Deselect
        return {
          ...prev,
          proteinSelections: prev.proteinSelections.filter((_, i) => i !== idx),
        };
      }
      if (prev.proteinSelections.length < maxCount) {
        // Add to empty slot
        return {
          ...prev,
          proteinSelections: [...prev.proteinSelections, menuItemId],
        };
      }
      // Full — replace the earliest selection
      return {
        ...prev,
        proteinSelections: [...prev.proteinSelections.slice(1), menuItemId],
      };
    });
  }, []);

  const clearProteins = useCallback(() => {
    setOrder((prev) => ({ ...prev, proteinSelections: [] }));
  }, []);

  // --- Add-ons ---

  const addAddon = useCallback((menuItemId: string, qty = 1) => {
    setOrder((prev) => {
      const existing = prev.addons.find((a) => a.menuItemId === menuItemId);
      if (existing) {
        return {
          ...prev,
          addons: prev.addons.map((a) =>
            a.menuItemId === menuItemId
              ? { ...a, quantity: Math.min(a.quantity + qty, MAX_ITEM_QUANTITY) }
              : a
          ),
        };
      }
      return {
        ...prev,
        addons: [...prev.addons, { menuItemId, quantity: Math.min(qty, MAX_ITEM_QUANTITY) }],
      };
    });
  }, []);

  const removeAddon = useCallback((menuItemId: string) => {
    setOrder((prev) => ({
      ...prev,
      addons: prev.addons.filter((a) => a.menuItemId !== menuItemId),
    }));
  }, []);

  const updateAddonQuantity = useCallback((menuItemId: string, qty: number) => {
    if (qty <= 0) {
      setOrder((prev) => ({
        ...prev,
        addons: prev.addons.filter((a) => a.menuItemId !== menuItemId),
      }));
      return;
    }
    const clampedQty = Math.min(qty, MAX_ITEM_QUANTITY);
    setOrder((prev) => ({
      ...prev,
      addons: prev.addons.map((a) =>
        a.menuItemId === menuItemId ? { ...a, quantity: clampedQty } : a
      ),
    }));
  }, []);

  // --- Legacy compatibility (addItem/removeItem/updateQuantity map to addons) ---

  const addItem = useCallback(
    (itemId: string, qty?: number) => {
      addAddon(itemId, qty);
    },
    [addAddon]
  );

  const removeItem = useCallback(
    (itemId: string) => {
      removeAddon(itemId);
    },
    [removeAddon]
  );

  const updateQuantity = useCallback(
    (itemId: string, qty: number) => {
      updateAddonQuantity(itemId, qty);
    },
    [updateAddonQuantity]
  );

  // --- Clear ---

  const clearOrder = useCallback(() => {
    setOrder(defaultOrder);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  // --- Pricing ---

  const getTotal = useCallback(
    (menu: MenuData | null): number => {
      if (!menu) return 0;
      const pkg = menu.packages.find((p) => p.id === order.packageId);
      if (!pkg) return 0;

      let total = 0;

      // Package base price
      if (pkg.flatPrice != null) {
        // Fixed total price (e.g. Intimate Party = $600)
        total = pkg.flatPrice;
      } else {
        // Per-person pricing
        total += pkg.pricePerPerson * order.guestCount;
        const kidsRate = pkg.kidsPrice ?? menu.pricing.kidsPrice;
        total += kidsRate * order.kidsCount;
      }

      // Protein upgrade fees (adults only — kids typically get basic proteins)
      for (const proteinId of order.proteinSelections) {
        const item = menu.items.find((i) => i.id === proteinId);
        if (item && item.priceType === 'upgrade') {
          total += item.price * order.guestCount;
        }
      }

      // Add-ons
      for (const addon of order.addons) {
        const item = menu.items.find((i) => i.id === addon.menuItemId);
        if (!item) continue;
        if (item.priceType === 'per_person') {
          total += item.price * (order.guestCount + order.kidsCount) * addon.quantity;
        } else {
          total += item.price * addon.quantity;
        }
      }

      // Minimum order floor (only for per-person packages)
      if (pkg.flatPrice == null) {
        total = Math.max(total, menu.pricing.minimumOrder);
      }

      return total;
    },
    [order]
  );

  // --- Item count (for nav badge etc.) ---

  const itemCount = useMemo(
    () => order.proteinSelections.length + order.addons.reduce((sum, a) => sum + a.quantity, 0),
    [order.proteinSelections, order.addons]
  );

  const value = useMemo(
    () => ({
      order,
      setGuestCount,
      setKidsCount,
      selectPackage,
      toggleProtein,
      clearProteins,
      addAddon,
      removeAddon,
      updateAddonQuantity,
      addItem,
      removeItem,
      updateQuantity,
      clearOrder,
      getTotal,
      itemCount,
    }),
    [
      order,
      setGuestCount,
      setKidsCount,
      selectPackage,
      toggleProtein,
      clearProteins,
      addAddon,
      removeAddon,
      updateAddonQuantity,
      addItem,
      removeItem,
      updateQuantity,
      clearOrder,
      getTotal,
      itemCount,
    ]
  );

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
};

export function useOrderContext(): OrderContextValue {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error('useOrderContext must be used within OrderProvider');
  return ctx;
}
