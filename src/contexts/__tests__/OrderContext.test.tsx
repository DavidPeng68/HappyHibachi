import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { OrderProvider, useOrderContext } from '../OrderContext';
import type { MenuData, MenuPackage, MenuItem } from '../../types/menu';

// --- Test fixtures (same pattern as pricing.test.ts) ---

function makePkg(overrides: Partial<MenuPackage> & { id: string }): MenuPackage {
  return {
    name: { en: overrides.id },
    description: { en: '' },
    pricePerPerson: 60,
    minGuests: 10,
    maxGuests: null,
    features: [],
    categoryIds: [],
    highlighted: false,
    sortOrder: 0,
    visible: true,
    proteinCount: 3,
    kidsPrice: null,
    flatPrice: null,
    serviceDuration: 120,
    serviceType: 'hibachi',
    ...overrides,
  };
}

function makeItem(overrides: Partial<MenuItem> & { id: string }): MenuItem {
  return {
    categoryId: 'proteins',
    name: { en: overrides.id },
    description: { en: '' },
    price: 0,
    priceType: 'included',
    imageUrl: '',
    tags: [],
    available: true,
    orderable: true,
    sortOrder: 0,
    ...overrides,
  };
}

function makeMenu(overrides?: Partial<MenuData>): MenuData {
  return {
    version: 1,
    packages: [
      makePkg({ id: 'standard', pricePerPerson: 60, proteinCount: 3 }),
      makePkg({ id: 'premium', pricePerPerson: 80, proteinCount: 4 }),
      makePkg({
        id: 'intimate',
        flatPrice: 600,
        pricePerPerson: 0,
        proteinCount: 3,
        minGuests: 1,
        maxGuests: 8,
      }),
    ],
    categories: [],
    items: [
      makeItem({ id: 'chicken', price: 0, priceType: 'included' }),
      makeItem({ id: 'steak', price: 0, priceType: 'included' }),
      makeItem({ id: 'filet', price: 5, priceType: 'upgrade' }),
      makeItem({ id: 'lobster', price: 10, priceType: 'upgrade' }),
      makeItem({ id: 'gyoza', price: 3, priceType: 'per_item' }),
      makeItem({ id: 'noodles', price: 2, priceType: 'per_person' }),
    ],
    spotlights: [],
    couponTiers: [],
    pricing: {
      kidsPrice: 30,
      creditCardFee: 4,
      gratuitySuggested: 20,
      cancellationFee: 200,
      minimumOrder: 600,
      outdoorNote: { en: '' },
      weatherNote: { en: '' },
    },
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// --- Helpers ---

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <OrderProvider>{children}</OrderProvider>
);

function renderOrderHook() {
  return renderHook(() => useOrderContext(), { wrapper });
}

// --- Tests ---

beforeEach(() => {
  sessionStorage.clear();
});

describe('OrderContext', () => {
  describe('useOrderContext outside provider', () => {
    it('throws when used outside OrderProvider', () => {
      // Suppress console.error from React for the expected error
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => {
        renderHook(() => useOrderContext());
      }).toThrow('useOrderContext must be used within OrderProvider');
      spy.mockRestore();
    });
  });

  describe('initial state', () => {
    it('has correct default values', () => {
      const { result } = renderOrderHook();
      expect(result.current.order).toEqual({
        packageId: null,
        guestCount: 10,
        kidsCount: 0,
        proteinSelections: [],
        addons: [],
      });
    });

    it('has zero item count initially', () => {
      const { result } = renderOrderHook();
      expect(result.current.itemCount).toBe(0);
    });
  });

  describe('selectPackage', () => {
    it('sets the packageId', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.selectPackage('standard');
      });
      expect(result.current.order.packageId).toBe('standard');
    });

    it('clears protein selections when switching packages', () => {
      const { result } = renderOrderHook();
      // Select a package and add proteins
      act(() => {
        result.current.selectPackage('standard');
      });
      act(() => {
        result.current.toggleProtein('chicken', 3);
        result.current.toggleProtein('steak', 3);
      });
      expect(result.current.order.proteinSelections).toHaveLength(2);

      // Switch package — proteins should be cleared
      act(() => {
        result.current.selectPackage('premium');
      });
      expect(result.current.order.packageId).toBe('premium');
      expect(result.current.order.proteinSelections).toEqual([]);
    });

    it('preserves addons when switching packages', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.selectPackage('standard');
        result.current.addAddon('gyoza', 2);
      });
      act(() => {
        result.current.selectPackage('premium');
      });
      expect(result.current.order.addons).toEqual([{ menuItemId: 'gyoza', quantity: 2 }]);
    });

    it('preserves guest and kids count when switching packages', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.setGuestCount(20);
        result.current.setKidsCount(5);
      });
      act(() => {
        result.current.selectPackage('premium');
      });
      expect(result.current.order.guestCount).toBe(20);
      expect(result.current.order.kidsCount).toBe(5);
    });
  });

  describe('setGuestCount', () => {
    it('updates guest count', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.setGuestCount(25);
      });
      expect(result.current.order.guestCount).toBe(25);
    });

    it('enforces minimum of 1', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.setGuestCount(0);
      });
      expect(result.current.order.guestCount).toBe(1);
    });

    it('clamps negative values to 1', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.setGuestCount(-5);
      });
      expect(result.current.order.guestCount).toBe(1);
    });

    it('allows large guest counts', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.setGuestCount(200);
      });
      expect(result.current.order.guestCount).toBe(200);
    });
  });

  describe('setKidsCount', () => {
    it('updates kids count', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.setKidsCount(3);
      });
      expect(result.current.order.kidsCount).toBe(3);
    });

    it('enforces minimum of 0', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.setKidsCount(-1);
      });
      expect(result.current.order.kidsCount).toBe(0);
    });

    it('allows setting back to 0', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.setKidsCount(5);
      });
      act(() => {
        result.current.setKidsCount(0);
      });
      expect(result.current.order.kidsCount).toBe(0);
    });
  });

  describe('toggleProtein', () => {
    it('adds a protein to empty selections', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.toggleProtein('chicken', 3);
      });
      expect(result.current.order.proteinSelections).toEqual(['chicken']);
    });

    it('removes a protein that is already selected', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.toggleProtein('chicken', 3);
      });
      act(() => {
        result.current.toggleProtein('chicken', 3);
      });
      expect(result.current.order.proteinSelections).toEqual([]);
    });

    it('adds multiple proteins up to maxCount', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.toggleProtein('chicken', 3);
        result.current.toggleProtein('steak', 3);
        result.current.toggleProtein('filet', 3);
      });
      expect(result.current.order.proteinSelections).toEqual(['chicken', 'steak', 'filet']);
    });

    it('replaces earliest selection when at maxCount', () => {
      const { result } = renderOrderHook();
      // Fill up to max (2)
      act(() => {
        result.current.toggleProtein('chicken', 2);
        result.current.toggleProtein('steak', 2);
      });
      expect(result.current.order.proteinSelections).toEqual(['chicken', 'steak']);

      // Adding a third should replace the first (chicken)
      act(() => {
        result.current.toggleProtein('filet', 2);
      });
      expect(result.current.order.proteinSelections).toEqual(['steak', 'filet']);
    });

    it('deselects from full list without replacing', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.toggleProtein('chicken', 3);
        result.current.toggleProtein('steak', 3);
        result.current.toggleProtein('filet', 3);
      });
      // Deselect middle item
      act(() => {
        result.current.toggleProtein('steak', 3);
      });
      expect(result.current.order.proteinSelections).toEqual(['chicken', 'filet']);
    });
  });

  describe('clearProteins', () => {
    it('clears all protein selections', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.toggleProtein('chicken', 3);
        result.current.toggleProtein('steak', 3);
      });
      act(() => {
        result.current.clearProteins();
      });
      expect(result.current.order.proteinSelections).toEqual([]);
    });

    it('is a no-op when already empty', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.clearProteins();
      });
      expect(result.current.order.proteinSelections).toEqual([]);
    });
  });

  describe('addAddon', () => {
    it('adds a new addon with default quantity 1', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.addAddon('gyoza');
      });
      expect(result.current.order.addons).toEqual([{ menuItemId: 'gyoza', quantity: 1 }]);
    });

    it('adds a new addon with specified quantity', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.addAddon('gyoza', 5);
      });
      expect(result.current.order.addons).toEqual([{ menuItemId: 'gyoza', quantity: 5 }]);
    });

    it('increments quantity for an existing addon', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.addAddon('gyoza', 2);
      });
      act(() => {
        result.current.addAddon('gyoza', 3);
      });
      expect(result.current.order.addons).toEqual([{ menuItemId: 'gyoza', quantity: 5 }]);
    });

    it('clamps quantity at 100', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.addAddon('gyoza', 150);
      });
      expect(result.current.order.addons).toEqual([{ menuItemId: 'gyoza', quantity: 100 }]);
    });

    it('clamps cumulative quantity at 100', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.addAddon('gyoza', 90);
      });
      act(() => {
        result.current.addAddon('gyoza', 20);
      });
      expect(result.current.order.addons[0].quantity).toBe(100);
    });

    it('adds multiple different addons independently', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.addAddon('gyoza', 2);
        result.current.addAddon('noodles', 1);
      });
      expect(result.current.order.addons).toEqual([
        { menuItemId: 'gyoza', quantity: 2 },
        { menuItemId: 'noodles', quantity: 1 },
      ]);
    });
  });

  describe('removeAddon', () => {
    it('removes an existing addon', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.addAddon('gyoza', 3);
      });
      act(() => {
        result.current.removeAddon('gyoza');
      });
      expect(result.current.order.addons).toEqual([]);
    });

    it('is a no-op for non-existent addon', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.addAddon('gyoza', 2);
      });
      act(() => {
        result.current.removeAddon('noodles');
      });
      expect(result.current.order.addons).toEqual([{ menuItemId: 'gyoza', quantity: 2 }]);
    });

    it('removes only the specified addon, leaving others', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.addAddon('gyoza', 2);
        result.current.addAddon('noodles', 1);
      });
      act(() => {
        result.current.removeAddon('gyoza');
      });
      expect(result.current.order.addons).toEqual([{ menuItemId: 'noodles', quantity: 1 }]);
    });
  });

  describe('updateAddonQuantity', () => {
    it('updates the quantity of an existing addon', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.addAddon('gyoza', 2);
      });
      act(() => {
        result.current.updateAddonQuantity('gyoza', 5);
      });
      expect(result.current.order.addons).toEqual([{ menuItemId: 'gyoza', quantity: 5 }]);
    });

    it('removes addon when quantity is set to 0', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.addAddon('gyoza', 3);
      });
      act(() => {
        result.current.updateAddonQuantity('gyoza', 0);
      });
      expect(result.current.order.addons).toEqual([]);
    });

    it('removes addon when quantity is negative', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.addAddon('gyoza', 3);
      });
      act(() => {
        result.current.updateAddonQuantity('gyoza', -1);
      });
      expect(result.current.order.addons).toEqual([]);
    });

    it('clamps quantity at 100', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.addAddon('gyoza', 2);
      });
      act(() => {
        result.current.updateAddonQuantity('gyoza', 200);
      });
      expect(result.current.order.addons[0].quantity).toBe(100);
    });
  });

  describe('legacy compatibility (addItem / removeItem / updateQuantity)', () => {
    it('addItem delegates to addAddon', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.addItem('gyoza', 2);
      });
      expect(result.current.order.addons).toEqual([{ menuItemId: 'gyoza', quantity: 2 }]);
    });

    it('removeItem delegates to removeAddon', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.addItem('gyoza', 2);
      });
      act(() => {
        result.current.removeItem('gyoza');
      });
      expect(result.current.order.addons).toEqual([]);
    });

    it('updateQuantity delegates to updateAddonQuantity', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.addItem('gyoza', 2);
      });
      act(() => {
        result.current.updateQuantity('gyoza', 7);
      });
      expect(result.current.order.addons).toEqual([{ menuItemId: 'gyoza', quantity: 7 }]);
    });
  });

  describe('clearOrder', () => {
    it('resets all state to defaults', () => {
      const { result } = renderOrderHook();
      // Build up a complex order
      act(() => {
        result.current.selectPackage('premium');
        result.current.setGuestCount(20);
        result.current.setKidsCount(5);
        result.current.toggleProtein('chicken', 3);
        result.current.addAddon('gyoza', 3);
      });
      // Clear
      act(() => {
        result.current.clearOrder();
      });
      expect(result.current.order).toEqual({
        packageId: null,
        guestCount: 10,
        kidsCount: 0,
        proteinSelections: [],
        addons: [],
      });
    });

    it('removes custom state from sessionStorage (effect re-saves defaults)', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.selectPackage('standard');
        result.current.setGuestCount(25);
      });
      const before = JSON.parse(sessionStorage.getItem('hibachi_order')!);
      expect(before.packageId).toBe('standard');
      expect(before.guestCount).toBe(25);

      act(() => {
        result.current.clearOrder();
      });
      // clearOrder calls sessionStorage.removeItem, but the useEffect
      // then re-persists the default state. Verify state is reset to defaults.
      const after = JSON.parse(sessionStorage.getItem('hibachi_order')!);
      expect(after.packageId).toBeNull();
      expect(after.guestCount).toBe(10);
    });

    it('resets itemCount to 0', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.toggleProtein('chicken', 3);
        result.current.addAddon('gyoza', 2);
      });
      expect(result.current.itemCount).toBe(3); // 1 protein + 2 addon qty

      act(() => {
        result.current.clearOrder();
      });
      expect(result.current.itemCount).toBe(0);
    });
  });

  describe('itemCount', () => {
    it('counts protein selections as 1 each', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.toggleProtein('chicken', 3);
        result.current.toggleProtein('steak', 3);
      });
      expect(result.current.itemCount).toBe(2);
    });

    it('counts addon quantities', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.addAddon('gyoza', 3);
        result.current.addAddon('noodles', 2);
      });
      expect(result.current.itemCount).toBe(5);
    });

    it('sums proteins and addons together', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.toggleProtein('chicken', 3);
        result.current.addAddon('gyoza', 4);
      });
      expect(result.current.itemCount).toBe(5); // 1 protein + 4 addon qty
    });
  });

  describe('getTotal (delegates to calculateOrderTotal)', () => {
    const menu = makeMenu();

    it('returns 0 when menu is null', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.selectPackage('standard');
      });
      expect(result.current.getTotal(null)).toBe(0);
    });

    it('returns 0 when no package selected', () => {
      const { result } = renderOrderHook();
      expect(result.current.getTotal(menu)).toBe(0);
    });

    it('calculates base per-person total', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.selectPackage('standard');
        result.current.setGuestCount(10);
      });
      // 10 x $60 = $600
      expect(result.current.getTotal(menu)).toBe(600);
    });

    it('includes kids pricing in total', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.selectPackage('standard');
        result.current.setGuestCount(10);
        result.current.setKidsCount(5);
      });
      // 10 x $60 + 5 x $30 = $750
      expect(result.current.getTotal(menu)).toBe(750);
    });

    it('includes protein upgrade fees in total', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.selectPackage('standard');
        result.current.setGuestCount(10);
        result.current.toggleProtein('filet', 3);
      });
      // 10 x $60 + 10 x $5 = $650
      expect(result.current.getTotal(menu)).toBe(650);
    });

    it('includes addon costs in total', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.selectPackage('standard');
        result.current.setGuestCount(10);
        result.current.addAddon('gyoza', 2);
      });
      // 10 x $60 + 2 x $3 = $606
      expect(result.current.getTotal(menu)).toBe(606);
    });

    it('calculates a complete order with upgrades, addons, and kids', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.selectPackage('standard');
        result.current.setGuestCount(15);
        result.current.setKidsCount(5);
        result.current.toggleProtein('filet', 3);
        result.current.toggleProtein('lobster', 3);
        result.current.addAddon('gyoza', 2);
        result.current.addAddon('noodles', 1);
      });
      // 15 x $60 = $900
      // + 5 x $30 = $150
      // + filet: 15 x $5 = $75
      // + lobster: 15 x $10 = $150
      // + gyoza: 2 x $3 = $6
      // + noodles: (15+5) x $2 x 1 = $40
      // = $1321
      expect(result.current.getTotal(menu)).toBe(1321);
    });

    it('uses flat price for intimate package', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.selectPackage('intimate');
        result.current.setGuestCount(4);
      });
      expect(result.current.getTotal(menu)).toBe(600);
    });

    it('enforces minimum order floor for per-person packages', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.selectPackage('standard');
        result.current.setGuestCount(5);
      });
      // 5 x $60 = $300, but minimum is $600
      expect(result.current.getTotal(menu)).toBe(600);
    });
  });

  describe('sessionStorage persistence', () => {
    it('persists order state to sessionStorage', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.selectPackage('standard');
        result.current.setGuestCount(15);
      });
      const stored = JSON.parse(sessionStorage.getItem('hibachi_order')!);
      expect(stored.packageId).toBe('standard');
      expect(stored.guestCount).toBe(15);
    });

    it('restores state from sessionStorage on mount', () => {
      // Pre-populate sessionStorage
      sessionStorage.setItem(
        'hibachi_order',
        JSON.stringify({
          packageId: 'premium',
          guestCount: 20,
          kidsCount: 3,
          proteinSelections: ['chicken'],
          addons: [{ menuItemId: 'gyoza', quantity: 2 }],
        })
      );

      const { result } = renderOrderHook();
      expect(result.current.order.packageId).toBe('premium');
      expect(result.current.order.guestCount).toBe(20);
      expect(result.current.order.kidsCount).toBe(3);
      expect(result.current.order.proteinSelections).toEqual(['chicken']);
      expect(result.current.order.addons).toEqual([{ menuItemId: 'gyoza', quantity: 2 }]);
    });

    it('migrates old format (items array) to new format', () => {
      sessionStorage.setItem(
        'hibachi_order',
        JSON.stringify({
          packageId: 'standard',
          guestCount: 12,
          items: [
            { menuItemId: 'gyoza', quantity: 3 },
            { menuItemId: 'noodles', quantity: 1 },
          ],
        })
      );

      const { result } = renderOrderHook();
      expect(result.current.order.packageId).toBe('standard');
      expect(result.current.order.guestCount).toBe(12);
      expect(result.current.order.kidsCount).toBe(0);
      expect(result.current.order.proteinSelections).toEqual([]);
      expect(result.current.order.addons).toEqual([
        { menuItemId: 'gyoza', quantity: 3 },
        { menuItemId: 'noodles', quantity: 1 },
      ]);
    });

    it('falls back to defaults on invalid JSON', () => {
      sessionStorage.setItem('hibachi_order', 'not-valid-json');

      const { result } = renderOrderHook();
      expect(result.current.order).toEqual({
        packageId: null,
        guestCount: 10,
        kidsCount: 0,
        proteinSelections: [],
        addons: [],
      });
    });

    it('fills missing fields with defaults for partial new-format data', () => {
      sessionStorage.setItem(
        'hibachi_order',
        JSON.stringify({
          packageId: 'standard',
          guestCount: 15,
          // missing kidsCount, proteinSelections, addons
        })
      );

      const { result } = renderOrderHook();
      expect(result.current.order.kidsCount).toBe(0);
      expect(result.current.order.proteinSelections).toEqual([]);
      expect(result.current.order.addons).toEqual([]);
    });
  });

  describe('package switching behavior', () => {
    it('clears proteins but keeps other state when switching from standard to premium', () => {
      const { result } = renderOrderHook();
      act(() => {
        result.current.selectPackage('standard');
        result.current.setGuestCount(15);
        result.current.setKidsCount(3);
        result.current.toggleProtein('chicken', 3);
        result.current.toggleProtein('filet', 3);
        result.current.addAddon('gyoza', 2);
      });

      act(() => {
        result.current.selectPackage('premium');
      });

      expect(result.current.order.packageId).toBe('premium');
      expect(result.current.order.proteinSelections).toEqual([]);
      expect(result.current.order.guestCount).toBe(15);
      expect(result.current.order.kidsCount).toBe(3);
      expect(result.current.order.addons).toEqual([{ menuItemId: 'gyoza', quantity: 2 }]);
    });

    it('total updates correctly after package switch', () => {
      const menu = makeMenu();
      const { result } = renderOrderHook();

      act(() => {
        result.current.selectPackage('standard');
        result.current.setGuestCount(10);
      });
      // 10 x $60 = $600
      expect(result.current.getTotal(menu)).toBe(600);

      act(() => {
        result.current.selectPackage('premium');
      });
      // 10 x $80 = $800
      expect(result.current.getTotal(menu)).toBe(800);
    });

    it('switching to flat-price package changes total calculation', () => {
      const menu = makeMenu();
      const { result } = renderOrderHook();

      act(() => {
        result.current.selectPackage('standard');
        result.current.setGuestCount(10);
      });
      expect(result.current.getTotal(menu)).toBe(600);

      act(() => {
        result.current.selectPackage('intimate');
      });
      // Flat price = $600, regardless of guest count
      expect(result.current.getTotal(menu)).toBe(600);
    });
  });
});
