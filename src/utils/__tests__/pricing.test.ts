import { calculateOrderTotal } from '../pricing';
import type { MenuData, OrderState, MenuPackage, MenuItem } from '../../types/menu';

// --- Test fixtures ---

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

// --- Tests ---

describe('calculateOrderTotal', () => {
  const menu = makeMenu();

  it('returns 0 when menu is null', () => {
    expect(calculateOrderTotal(makeOrder(), null)).toBe(0);
  });

  it('returns 0 when no package selected', () => {
    expect(calculateOrderTotal(makeOrder({ packageId: null }), menu)).toBe(0);
  });

  describe('per-person pricing', () => {
    it('calculates base price for adults', () => {
      // 10 adults × $60 = $600
      expect(calculateOrderTotal(makeOrder({ guestCount: 10 }), menu)).toBe(600);
    });

    it('calculates base price for adults + kids', () => {
      // 10 adults × $60 + 5 kids × $30 = $750
      expect(calculateOrderTotal(makeOrder({ guestCount: 10, kidsCount: 5 }), menu)).toBe(750);
    });

    it('uses package-level kidsPrice when set', () => {
      const customMenu = makeMenu({
        packages: [makePkg({ id: 'standard', pricePerPerson: 60, kidsPrice: 20 })],
      });
      // 10 adults × $60 + 3 kids × $20 = $660
      expect(calculateOrderTotal(makeOrder({ guestCount: 10, kidsCount: 3 }), customMenu)).toBe(
        660
      );
    });

    it('enforces minimum order floor', () => {
      // 5 adults × $60 = $300, but minimum is $600
      expect(calculateOrderTotal(makeOrder({ guestCount: 5 }), menu)).toBe(600);
    });
  });

  describe('flat pricing', () => {
    it('uses flat price regardless of guest count', () => {
      const order = makeOrder({ packageId: 'intimate', guestCount: 4 });
      expect(calculateOrderTotal(order, menu)).toBe(600);
    });

    it('does NOT enforce minimum order floor for flat-price packages', () => {
      const customMenu = makeMenu({
        packages: [makePkg({ id: 'intimate', flatPrice: 400 })],
        pricing: { ...menu.pricing, minimumOrder: 600 },
      });
      expect(
        calculateOrderTotal(makeOrder({ packageId: 'intimate', guestCount: 4 }), customMenu)
      ).toBe(400);
    });
  });

  describe('protein upgrades', () => {
    it('adds upgrade cost per adult guest', () => {
      // 10 adults × $60 + filet upgrade: 10 × $5 = $650
      const order = makeOrder({ guestCount: 10, proteinSelections: ['filet'] });
      expect(calculateOrderTotal(order, menu)).toBe(650);
    });

    it('does not charge for included proteins', () => {
      const order = makeOrder({ guestCount: 10, proteinSelections: ['chicken', 'steak'] });
      expect(calculateOrderTotal(order, menu)).toBe(600);
    });

    it('stacks multiple upgrades', () => {
      // 10 adults × $60 + filet (10×$5) + lobster (10×$10) = $750
      const order = makeOrder({ guestCount: 10, proteinSelections: ['filet', 'lobster'] });
      expect(calculateOrderTotal(order, menu)).toBe(750);
    });
  });

  describe('add-ons', () => {
    it('adds per-item addon cost', () => {
      // base $600 + 2 gyoza × $3 = $606
      const order = makeOrder({
        guestCount: 10,
        addons: [{ menuItemId: 'gyoza', quantity: 2 }],
      });
      expect(calculateOrderTotal(order, menu)).toBe(606);
    });

    it('adds per-person addon cost', () => {
      // 10 adults × $60 + 2 kids × $30 + noodles: (10+2) × $2 × 1 = $684
      const order = makeOrder({
        guestCount: 10,
        kidsCount: 2,
        addons: [{ menuItemId: 'noodles', quantity: 1 }],
      });
      expect(calculateOrderTotal(order, menu)).toBe(684);
    });

    it('handles multiple addons', () => {
      // base $600 + 3 gyoza × $3 + noodles: 10 × $2 × 1 = $629
      const order = makeOrder({
        guestCount: 10,
        addons: [
          { menuItemId: 'gyoza', quantity: 3 },
          { menuItemId: 'noodles', quantity: 1 },
        ],
      });
      expect(calculateOrderTotal(order, menu)).toBe(629);
    });
  });

  describe('combined scenarios', () => {
    it('calculates complete order with upgrades + addons + kids', () => {
      // 15 adults × $60 = $900
      // + 5 kids × $30 = $150
      // + filet upgrade: 15 × $5 = $75
      // + lobster upgrade: 15 × $10 = $150
      // + 2 gyoza × $3 = $6
      // + noodles: (15+5) × $2 × 1 = $40
      // = $1321
      const order = makeOrder({
        guestCount: 15,
        kidsCount: 5,
        proteinSelections: ['filet', 'lobster'],
        addons: [
          { menuItemId: 'gyoza', quantity: 2 },
          { menuItemId: 'noodles', quantity: 1 },
        ],
      });
      expect(calculateOrderTotal(order, menu)).toBe(1321);
    });
  });

  describe('edge cases', () => {
    it('ignores unknown addon menuItemId', () => {
      const order = makeOrder({
        guestCount: 10,
        addons: [{ menuItemId: 'nonexistent', quantity: 5 }],
      });
      // Unknown addon skipped → base only: 10 × $60 = $600
      expect(calculateOrderTotal(order, menu)).toBe(600);
    });

    it('handles 0 guests with per-person pricing', () => {
      // 0 × $60 = $0, but minimum order floor = $600
      expect(calculateOrderTotal(makeOrder({ guestCount: 0 }), menu)).toBe(600);
    });

    it('protein upgrades charge only adults, not kids', () => {
      // 10 adults × $60 + 5 kids × $30 + filet upgrade: 10 × $5 = $800
      // (NOT 15 × $5 — kids are excluded from upgrade)
      const order = makeOrder({
        guestCount: 10,
        kidsCount: 5,
        proteinSelections: ['filet'],
      });
      expect(calculateOrderTotal(order, menu)).toBe(800);
    });

    it('flat price is returned even when below minimumOrder', () => {
      const cheapMenu = makeMenu({
        packages: [makePkg({ id: 'cheap-flat', flatPrice: 200 })],
        pricing: { ...menu.pricing, minimumOrder: 600 },
      });
      const order = makeOrder({ packageId: 'cheap-flat', guestCount: 2 });
      // Flat price = $200, minimum = $600, but flat packages bypass minimum
      expect(calculateOrderTotal(order, cheapMenu)).toBe(200);
    });

    it('ignores unknown protein selection', () => {
      const order = makeOrder({
        guestCount: 10,
        proteinSelections: ['nonexistent-protein'],
      });
      // Unknown protein not found → no charge added → base $600
      expect(calculateOrderTotal(order, menu)).toBe(600);
    });

    it('per-person addon with quantity > 1 multiplies correctly', () => {
      // 10 adults × $60 = $600 + noodles: (10+0) × $2 × 3 = $60 → $660
      const order = makeOrder({
        guestCount: 10,
        addons: [{ menuItemId: 'noodles', quantity: 3 }],
      });
      expect(calculateOrderTotal(order, menu)).toBe(660);
    });
  });
});
