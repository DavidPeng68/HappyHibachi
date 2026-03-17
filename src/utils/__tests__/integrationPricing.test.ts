/**
 * Integration tests: pricing + validation working together.
 * Verifies that validated inputs always produce sane pricing outputs.
 */

import { calculateOrderTotal } from '../pricing';
import { validateGuestCount } from '../validation';
import type { MenuData, OrderState, MenuPackage, MenuItem } from '../../types/menu';

// --- Shared fixtures (same style as pricing.test.ts) ---

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
      makePkg({ id: 'standard', pricePerPerson: 60, proteinCount: 3, minGuests: 10 }),
      makePkg({ id: 'premium', pricePerPerson: 80, proteinCount: 4, minGuests: 10 }),
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
    ...overrides,
  };
}

function makeOrder(overrides?: Partial<OrderState>): OrderState {
  return {
    packageId: 'standard',
    guestCount: 10,
    kidsCount: 0,
    proteinSelections: [],
    addons: [],
    ...overrides,
  };
}

// --- Integration: validation -> pricing chain ---

describe('Validation + Pricing integration', () => {
  const menu = makeMenu();

  describe('validated guest count produces valid pricing', () => {
    it('minimum validated guest count (10) produces a price >= minimumOrder', () => {
      const minGuests = 10;
      expect(validateGuestCount(minGuests, 10)).toBe(true);

      const total = calculateOrderTotal(makeOrder({ guestCount: minGuests }), menu);
      expect(total).toBeGreaterThanOrEqual(menu.pricing.minimumOrder);
    });

    it('a guest count just below minimum fails validation', () => {
      expect(validateGuestCount(9, 10)).toBe(false);
    });

    it('large validated guest count produces proportionally larger total', () => {
      const smallCount = 10;
      const largeCount = 50;
      expect(validateGuestCount(smallCount, 10)).toBe(true);
      expect(validateGuestCount(largeCount, 10)).toBe(true);

      const smallTotal = calculateOrderTotal(makeOrder({ guestCount: smallCount }), menu);
      const largeTotal = calculateOrderTotal(makeOrder({ guestCount: largeCount }), menu);
      expect(largeTotal).toBeGreaterThan(smallTotal);
    });
  });

  describe('minimum guest count with minimum order floor', () => {
    it('exactly at minimumOrder boundary (10 guests * $60 = $600 = minimumOrder)', () => {
      const total = calculateOrderTotal(makeOrder({ guestCount: 10 }), menu);
      expect(total).toBe(600);
      expect(total).toBe(menu.pricing.minimumOrder);
    });

    it('below minimumOrder gets clamped up (fewer guests due to validation min=1)', () => {
      // If validation allowed 5 guests, the floor kicks in
      const total = calculateOrderTotal(makeOrder({ guestCount: 5 }), menu);
      expect(total).toBe(menu.pricing.minimumOrder);
    });

    it('above minimumOrder is calculated normally', () => {
      const total = calculateOrderTotal(makeOrder({ guestCount: 15 }), menu);
      expect(total).toBe(15 * 60); // $900, above the $600 floor
      expect(total).toBeGreaterThan(menu.pricing.minimumOrder);
    });
  });

  describe('maximum guest count pricing', () => {
    it('handles very large guest count without overflow', () => {
      const total = calculateOrderTotal(makeOrder({ guestCount: 500 }), menu);
      expect(total).toBe(500 * 60);
      expect(Number.isFinite(total)).toBe(true);
    });

    it('large guest count with all upgrades and addons', () => {
      const total = calculateOrderTotal(
        makeOrder({
          guestCount: 200,
          kidsCount: 50,
          proteinSelections: ['filet', 'lobster'],
          addons: [
            { menuItemId: 'gyoza', quantity: 10 },
            { menuItemId: 'noodles', quantity: 2 },
          ],
        }),
        menu
      );
      // 200*60 + 50*30 + 200*5 + 200*10 + 10*3 + (200+50)*2*2
      // = 12000 + 1500 + 1000 + 2000 + 30 + 1000 = 17530
      expect(total).toBe(17530);
      expect(Number.isFinite(total)).toBe(true);
    });
  });

  describe('no invalid numeric outputs for any valid input', () => {
    const guestCounts = [1, 5, 10, 25, 50, 100, 200];
    const kidsCounts = [0, 1, 5, 10];
    const proteinCombos: string[][] = [[], ['chicken'], ['filet'], ['filet', 'lobster']];
    const addonCombos: Array<Array<{ menuItemId: string; quantity: number }>> = [
      [],
      [{ menuItemId: 'gyoza', quantity: 1 }],
      [{ menuItemId: 'noodles', quantity: 1 }],
      [
        { menuItemId: 'gyoza', quantity: 3 },
        { menuItemId: 'noodles', quantity: 2 },
      ],
    ];

    it('never produces NaN, Infinity, or negative values', () => {
      for (const guestCount of guestCounts) {
        for (const kidsCount of kidsCounts) {
          for (const proteinSelections of proteinCombos) {
            for (const addons of addonCombos) {
              const total = calculateOrderTotal(
                makeOrder({ guestCount, kidsCount, proteinSelections, addons }),
                menu
              );
              expect(Number.isNaN(total)).toBe(false);
              expect(Number.isFinite(total)).toBe(true);
              expect(total).toBeGreaterThanOrEqual(0);
            }
          }
        }
      }
    });

    it('never produces NaN for premium package', () => {
      for (const guestCount of guestCounts) {
        const total = calculateOrderTotal(makeOrder({ packageId: 'premium', guestCount }), menu);
        expect(Number.isNaN(total)).toBe(false);
        expect(total).toBeGreaterThanOrEqual(0);
      }
    });

    it('never produces NaN for flat-price package', () => {
      for (const guestCount of [1, 2, 4, 8]) {
        const total = calculateOrderTotal(makeOrder({ packageId: 'intimate', guestCount }), menu);
        expect(Number.isNaN(total)).toBe(false);
        expect(total).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('full booking flow: validate then price', () => {
    it('complete flow: validate inputs, calculate price, verify sanity', () => {
      const guestCount = 20;
      const kidsCount = 5;

      // Step 1: Validate
      expect(validateGuestCount(guestCount, 10)).toBe(true);

      // Step 2: Calculate pricing
      const order = makeOrder({
        packageId: 'premium',
        guestCount,
        kidsCount,
        proteinSelections: ['filet'],
        addons: [{ menuItemId: 'noodles', quantity: 1 }],
      });

      const total = calculateOrderTotal(order, menu);

      // 20*80 + 5*30 + 20*5 + (20+5)*2*1
      // = 1600 + 150 + 100 + 50 = 1900
      expect(total).toBe(1900);
      expect(total).toBeGreaterThan(0);
      expect(Number.isFinite(total)).toBe(true);
    });

    it('flow with intimate package bypasses minimum order', () => {
      const guestCount = 4;

      // Intimate package has different min guests
      expect(validateGuestCount(guestCount, 1)).toBe(true);

      const total = calculateOrderTotal(makeOrder({ packageId: 'intimate', guestCount }), menu);

      // Flat price = $600, no minimum enforcement
      expect(total).toBe(600);
    });

    it('flow: non-integer guest count fails validation', () => {
      expect(validateGuestCount(10.5, 10)).toBe(false);
      expect(validateGuestCount(NaN, 10)).toBe(false);
    });
  });

  describe('pricing consistency across packages', () => {
    it('premium package always costs more than standard for same inputs', () => {
      for (const count of [10, 15, 20, 50]) {
        const standardTotal = calculateOrderTotal(
          makeOrder({ packageId: 'standard', guestCount: count }),
          menu
        );
        const premiumTotal = calculateOrderTotal(
          makeOrder({ packageId: 'premium', guestCount: count }),
          menu
        );
        expect(premiumTotal).toBeGreaterThanOrEqual(standardTotal);
      }
    });

    it('adding kids always increases total for per-person packages', () => {
      const base = calculateOrderTotal(makeOrder({ guestCount: 10, kidsCount: 0 }), menu);
      const withKids = calculateOrderTotal(makeOrder({ guestCount: 10, kidsCount: 3 }), menu);
      expect(withKids).toBeGreaterThan(base);
    });

    it('adding protein upgrades always increases total', () => {
      const base = calculateOrderTotal(makeOrder({ guestCount: 15 }), menu);
      const withUpgrade = calculateOrderTotal(
        makeOrder({ guestCount: 15, proteinSelections: ['filet'] }),
        menu
      );
      expect(withUpgrade).toBeGreaterThan(base);
    });
  });
});
