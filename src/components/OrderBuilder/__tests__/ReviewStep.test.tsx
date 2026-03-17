import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReviewStep from '../ReviewStep';
import type { MenuPackage, MenuData, TranslatableText } from '../../../types/menu';

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts && 'count' in opts) return `${key}(${opts.count})`;
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

jest.mock('../../ui', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  const Icon: React.FC<{ name: string; size?: number }> = ({ name }) => (
    <span data-testid={`icon-${name}`} />
  );
  return { Icon };
});

// ── Fixtures ───────────────────────────────────────────────────────────────────

function makePackage(overrides?: Partial<MenuPackage>): MenuPackage {
  return {
    id: 'standard',
    name: { en: 'Standard Package' },
    description: { en: 'Basic hibachi' },
    pricePerPerson: 60,
    minGuests: 10,
    maxGuests: null,
    features: [],
    categoryIds: ['proteins'],
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

function makeMenu(overrides?: Partial<MenuData>): MenuData {
  return {
    version: 1,
    packages: [makePackage()],
    categories: [],
    items: [
      {
        id: 'chicken',
        categoryId: 'proteins',
        name: { en: 'Chicken' },
        description: { en: '' },
        price: 0,
        priceType: 'included',
        imageUrl: '',
        tags: [],
        available: true,
        orderable: true,
        sortOrder: 0,
      },
      {
        id: 'filet',
        categoryId: 'proteins',
        name: { en: 'Filet Mignon' },
        description: { en: '' },
        price: 5,
        priceType: 'upgrade',
        imageUrl: '',
        tags: [],
        available: true,
        orderable: true,
        sortOrder: 1,
      },
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

const getLocalizedText = (text: TranslatableText): string => {
  if (typeof text === 'string') return text;
  return text.en || Object.values(text)[0] || '';
};

const defaultProps = {
  pkg: makePackage(),
  menu: makeMenu(),
  guestCount: 10,
  kidsCount: 0,
  proteinSelections: ['chicken'] as string[],
  addons: [] as { name: string; quantity: number; unitPrice: number }[],
  total: 600,
  getLocalizedText,
  onEditParty: jest.fn(),
  onEditCustomize: jest.fn(),
  onBack: jest.fn(),
};

function renderReviewStep(overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(<ReviewStep {...props} />);
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('ReviewStep', () => {
  // 1. Renders order summary
  describe('renders order summary', () => {
    it('displays the package name', () => {
      renderReviewStep();
      expect(screen.getByText('Standard Package')).toBeInTheDocument();
    });

    it('displays the guest count and adults label', () => {
      renderReviewStep({ guestCount: 15, total: 900 });
      // The guest row renders "15 order.adults" — verify the label row exists
      const guestRows = screen.getAllByText(/order\.adults/);
      expect(guestRows.length).toBeGreaterThan(0);
    });

    it('displays kids when present', () => {
      renderReviewStep({ guestCount: 10, kidsCount: 3 });
      expect(screen.getByText(/\+ 3/)).toBeInTheDocument();
      expect(screen.getAllByText(/order\.kids/).length).toBeGreaterThan(0);
    });

    it('displays protein selections', () => {
      renderReviewStep({ proteinSelections: ['chicken'] });
      expect(screen.getByText('Chicken')).toBeInTheDocument();
      expect(screen.getByText('menu.protein.included')).toBeInTheDocument();
    });

    it('displays upgrade proteins with price', () => {
      renderReviewStep({ proteinSelections: ['filet'], guestCount: 10 });
      expect(screen.getByText('Filet Mignon')).toBeInTheDocument();
      // upgrade cost = $5 * 10 guests = $50
      expect(screen.getByText('+$50')).toBeInTheDocument();
    });

    it('displays service type and duration', () => {
      renderReviewStep();
      expect(screen.getByText(/hibachi · 120 min/)).toBeInTheDocument();
    });

    it('shows the step title', () => {
      renderReviewStep();
      expect(screen.getByText('order.step3.title')).toBeInTheDocument();
    });
  });

  // 2. Price display
  describe('price display', () => {
    it('renders estimated total with dollar sign', () => {
      renderReviewStep({ total: 750 });
      // The total row uses toLocaleString: "$750"
      const totalRow = screen.getByText('order.review.estimatedTotal').closest('.review-row');
      expect(totalRow).toHaveTextContent('$750');
    });

    it('formats large totals with commas via toLocaleString', () => {
      renderReviewStep({ total: 1500 });
      const totalRow = screen.getByText('order.review.estimatedTotal').closest('.review-row');
      expect(totalRow).toHaveTextContent('$1,500');
    });

    it('displays per-person pricing breakdown for adults', () => {
      renderReviewStep({ guestCount: 12, total: 720 });
      // Pricing row label: "12 order.adults × $60"
      expect(screen.getByText(/12 order\.adults × \$60/)).toBeInTheDocument();
    });

    it('displays kids pricing breakdown', () => {
      renderReviewStep({ guestCount: 10, kidsCount: 4, total: 720 });
      // kids line: 4 kids x $30 = $120
      expect(screen.getByText('$120')).toBeInTheDocument();
    });

    it('displays flat price when package has flatPrice', () => {
      const flatPkg = makePackage({ flatPrice: 800, pricePerPerson: 0 });
      renderReviewStep({ pkg: flatPkg, total: 800 });
      // Flat price packages show the flat price in the breakdown row
      const totalRow = screen.getByText('order.review.estimatedTotal').closest('.review-row');
      expect(totalRow).toHaveTextContent('$800');
    });
  });

  // 3. Edit buttons
  describe('edit buttons', () => {
    it('renders edit-party button that calls onEditParty', async () => {
      const onEditParty = jest.fn();
      const user = userEvent.setup();
      renderReviewStep({ onEditParty });

      const editBtn = screen.getByRole('button', { name: /order\.editParty/ });
      await user.click(editBtn);
      expect(onEditParty).toHaveBeenCalledTimes(1);
    });

    it('renders edit-customize button that calls onEditCustomize', async () => {
      const onEditCustomize = jest.fn();
      const user = userEvent.setup();
      renderReviewStep({ onEditCustomize, proteinSelections: ['chicken'] });

      const editBtns = screen.getAllByRole('button', { name: /order\.editCustomize/ });
      await user.click(editBtns[0]);
      expect(onEditCustomize).toHaveBeenCalledTimes(1);
    });

    it('does not render edit-party button when onEditParty is undefined', () => {
      renderReviewStep({ onEditParty: undefined });
      expect(screen.queryByRole('button', { name: /order\.editParty/ })).not.toBeInTheDocument();
    });

    it('does not render edit-customize button when onEditCustomize is undefined', () => {
      renderReviewStep({ onEditCustomize: undefined, proteinSelections: ['chicken'] });
      expect(
        screen.queryByRole('button', { name: /order\.editCustomize/ })
      ).not.toBeInTheDocument();
    });
  });

  // 4. Empty states
  describe('empty states', () => {
    it('does not show addons section when no addons selected', () => {
      renderReviewStep({ addons: [] });
      expect(screen.queryByText('order.review.addons')).not.toBeInTheDocument();
    });

    it('does not show addons section when addons is undefined', () => {
      renderReviewStep({ addons: undefined });
      expect(screen.queryByText('order.review.addons')).not.toBeInTheDocument();
    });

    it('shows addons section when addons are present', () => {
      renderReviewStep({
        addons: [{ name: 'Gyoza', quantity: 2, unitPrice: 3 }],
      });
      expect(screen.getByText('order.review.addons')).toBeInTheDocument();
      expect(screen.getByText(/Gyoza/)).toBeInTheDocument();
      expect(screen.getByText('+$6.00')).toBeInTheDocument();
    });

    it('renders addon quantity text', () => {
      renderReviewStep({
        addons: [{ name: 'Noodles', quantity: 3, unitPrice: 2 }],
      });
      // t('order.review.quantity', { count: 3 }) => "order.review.quantity(3)"
      expect(screen.getByText(/order\.review\.quantity\(3\)/)).toBeInTheDocument();
    });
  });

  // 5. Back button
  describe('back button', () => {
    it('renders back button when onBack is provided', () => {
      renderReviewStep();
      expect(screen.getByText(/order\.back/)).toBeInTheDocument();
    });

    it('calls onBack when clicked', async () => {
      const onBack = jest.fn();
      const user = userEvent.setup();
      renderReviewStep({ onBack });

      await user.click(screen.getByText(/order\.back/));
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('does not render back button when onBack is undefined', () => {
      renderReviewStep({ onBack: undefined });
      expect(screen.queryByText(/order\.back/)).not.toBeInTheDocument();
    });
  });

  // 6. Review note
  it('displays the review note', () => {
    renderReviewStep();
    expect(screen.getByText('order.reviewNote')).toBeInTheDocument();
  });
});
