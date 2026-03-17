import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BookingStep from '../BookingStep';
import * as api from '../../../services/api';

// ── Mocks ──────────────────────────────────────────────────────────────────────

// i18next: pass-through — returns the key itself
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts && 'count' in opts) return `${key}(${opts.count})`;
      if (opts && 'discount' in opts) return `${key}(${opts.discount})`;
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

// useSettings: deterministic default settings with feature toggles
jest.mock('../../../hooks', () => ({
  useSettings: () => ({
    settings: {
      timeSlots: [
        {
          id: 'afternoon',
          label: 'Afternoon',
          startTime: '13:00',
          endTime: '15:00',
          enabled: true,
        },
        { id: 'evening', label: 'Evening', startTime: '17:00', endTime: '19:00', enabled: true },
      ],
      featureToggles: { coupons: true, referralProgram: true },
    },
    loading: false,
  }),
}));

// Calendar: render a button so tests can simulate date selection via the callback
jest.mock('../../../components', () => ({
  Calendar: ({ onDateSelect }: { onDateSelect: (d: string) => void }) => (
    <button data-testid="mock-calendar" onClick={() => onDateSelect('2026-04-15')}>
      Pick date
    </button>
  ),
}));

// Icon: render children-free span with the name for assertion purposes
jest.mock('../../ui', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');

  const Input = React.forwardRef(
    (
      {
        label,
        error,
        required,
        name,
        ...rest
      }: {
        label?: string;
        error?: string;
        required?: boolean;
        name?: string;
        [k: string]: unknown;
      },
      ref: React.Ref<HTMLInputElement>
    ) => (
      <div>
        {label && (
          <label htmlFor={`input-${name}`}>
            {label}
            {required && '*'}
          </label>
        )}
        <input ref={ref} id={`input-${name}`} name={name} aria-invalid={!!error} {...rest} />
        {error && <span role="alert">{error}</span>}
      </div>
    )
  );
  Input.displayName = 'Input';

  const Select = React.forwardRef(
    (
      {
        label,
        options,
        required,
        name,
        ...rest
      }: {
        label?: string;
        options: { value: string; label: string }[];
        required?: boolean;
        name?: string;
        [k: string]: unknown;
      },
      ref: React.Ref<HTMLSelectElement>
    ) => (
      <div>
        {label && (
          <label htmlFor={`select-${name}`}>
            {label}
            {required && '*'}
          </label>
        )}
        <select ref={ref} id={`select-${name}`} name={name} {...rest}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    )
  );
  Select.displayName = 'Select';

  const Textarea = React.forwardRef(
    (
      { label, name, ...rest }: { label?: string; name?: string; [k: string]: unknown },
      ref: React.Ref<HTMLTextAreaElement>
    ) => (
      <div>
        {label && <label htmlFor={`ta-${name}`}>{label}</label>}
        <textarea ref={ref} id={`ta-${name}`} name={name} {...rest} />
      </div>
    )
  );
  Textarea.displayName = 'Textarea';

  const Button: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement> & {
      variant?: string;
      size?: string;
      loading?: boolean;
    }
  > = ({ children, loading, disabled, ...rest }) => (
    <button disabled={disabled || loading} aria-busy={loading} {...rest}>
      {children}
    </button>
  );

  const Icon: React.FC<{ name: string; size?: number }> = ({ name }) => (
    <span data-testid={`icon-${name}`} />
  );

  return { Button, Input, Select, Textarea, Icon };
});

// api module — we spy on submitBooking
jest.mock('../../../services/api', () => ({
  submitBooking: jest.fn(),
  generateIdempotencyKey: jest.fn().mockReturnValue('test-idempotency-key-123'),
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

const defaultProps = {
  region: 'california',
  guestCount: 12,
  kidsCount: 2,
  onSuccess: jest.fn(),
  onBack: jest.fn(),
};

function renderBookingStep(overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(<BookingStep {...props} />);
}

/** Fill in all required fields so the form can be submitted. */
async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/form\.name/), 'John Doe');
  await user.type(screen.getByLabelText(/form\.email/), 'john@example.com');
  await user.type(screen.getByLabelText(/form\.phone/), '2125551234');

  // Select date via mock calendar
  await user.click(screen.getByTestId('mock-calendar'));

  // Select time slot
  await user.selectOptions(screen.getByLabelText(/form\.time/), 'afternoon');
}

// ── Setup / Teardown ───────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  (api.submitBooking as jest.Mock).mockResolvedValue({ success: true });
  (api.generateIdempotencyKey as jest.Mock).mockReturnValue('test-idempotency-key-123');
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('BookingStep', () => {
  // 1. Renders all required fields
  describe('renders all required fields', () => {
    it('shows name, email, phone, time, and region info', () => {
      renderBookingStep();

      expect(screen.getByLabelText(/form\.name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/form\.email/)).toBeInTheDocument();
      expect(screen.getByLabelText(/form\.phone/)).toBeInTheDocument();
      expect(screen.getByLabelText(/form\.time/)).toBeInTheDocument();
      // Calendar rendered via mock
      expect(screen.getByTestId('mock-calendar')).toBeInTheDocument();
    });

    it('displays region and guest count tags', () => {
      renderBookingStep();

      // Region is capitalised first letter
      expect(screen.getByText(/California/)).toBeInTheDocument();
      // Total guests = guestCount + kidsCount = 14
      expect(screen.getByText(/14/)).toBeInTheDocument();
    });

    it('shows the date calendar section header', () => {
      renderBookingStep();
      // Rendered as "<h4>{t('form.date')} *</h4>" so text includes the asterisk
      expect(screen.getByText(/form\.date/)).toBeInTheDocument();
    });
  });

  // 2. Form validation
  describe('form validation', () => {
    it('shows email error for invalid email on change', async () => {
      const user = userEvent.setup();
      renderBookingStep();

      await user.type(screen.getByLabelText(/form\.email/), 'invalid-email');

      expect(screen.getByText('form.invalidEmail')).toBeInTheDocument();
    });

    it('shows phone error for invalid phone on change', async () => {
      const user = userEvent.setup();
      renderBookingStep();

      await user.type(screen.getByLabelText(/form\.phone/), '123');

      expect(screen.getByText('form.invalidPhone')).toBeInTheDocument();
    });

    it('clears email error when a valid email is typed', async () => {
      const user = userEvent.setup();
      renderBookingStep();

      const emailInput = screen.getByLabelText(/form\.email/);
      await user.type(emailInput, 'bad');
      expect(screen.getByText('form.invalidEmail')).toBeInTheDocument();

      await user.clear(emailInput);
      await user.type(emailInput, 'good@email.com');
      expect(screen.queryByText('form.invalidEmail')).not.toBeInTheDocument();
    });

    it('submit button is disabled when required fields are empty', () => {
      renderBookingStep();

      const submitBtn = screen.getByRole('button', { name: /form\.submitReservation/ });
      expect(submitBtn).toBeDisabled();
    });

    it('shows disabled reason when form is incomplete', () => {
      renderBookingStep();

      // First missing field is name
      expect(screen.getByText('form.nameRequired')).toBeInTheDocument();
    });

    it('prevents submission with invalid email and phone', async () => {
      const user = userEvent.setup();
      renderBookingStep();

      await user.type(screen.getByLabelText(/form\.name/), 'John');
      await user.type(screen.getByLabelText(/form\.email/), 'bad');
      await user.type(screen.getByLabelText(/form\.phone/), '123');
      await user.click(screen.getByTestId('mock-calendar'));
      await user.selectOptions(screen.getByLabelText(/form\.time/), 'afternoon');

      // Submit button should still be disabled because of validation errors
      const submitBtn = screen.getByRole('button', { name: /form\.submitReservation/ });
      expect(submitBtn).toBeDisabled();
    });
  });

  // 3. Idempotency key
  describe('idempotency key', () => {
    it('generates an idempotency key on mount and stores in sessionStorage', () => {
      renderBookingStep();

      const stored = sessionStorage.getItem('happyhibachi_idempotency_key');
      expect(stored).toBe('test-idempotency-key-123');
    });

    it('reuses existing idempotency key from sessionStorage', () => {
      sessionStorage.setItem('happyhibachi_idempotency_key', 'existing-key-456');
      renderBookingStep();

      const stored = sessionStorage.getItem('happyhibachi_idempotency_key');
      expect(stored).toBe('existing-key-456');
    });

    it('clears idempotency key on successful submission', async () => {
      const user = userEvent.setup();
      renderBookingStep();

      await fillRequiredFields(user);

      const submitBtn = screen.getByRole('button', { name: /form\.submitReservation/ });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(sessionStorage.getItem('happyhibachi_idempotency_key')).toBeNull();
      });
    });
  });

  // 4. Coupon / referral code toggle
  describe('coupon/referral toggle (more options)', () => {
    it('does not show coupon/referral fields initially', () => {
      renderBookingStep();

      expect(screen.queryByLabelText(/form\.couponCode/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/form\.referralCode/)).not.toBeInTheDocument();
    });

    it('expands to show coupon and referral fields after clicking more options', async () => {
      const user = userEvent.setup();
      renderBookingStep();

      await user.click(screen.getByText('form.moreOptions'));

      expect(screen.getByLabelText(/form\.couponCode/)).toBeInTheDocument();
      expect(screen.getByLabelText(/form\.referralCode/)).toBeInTheDocument();
    });

    it('collapses extras when toggled again', async () => {
      const user = userEvent.setup();
      renderBookingStep();

      const toggle = screen.getByText('form.moreOptions');
      await user.click(toggle);
      expect(screen.getByLabelText(/form\.couponCode/)).toBeInTheDocument();

      await user.click(toggle);
      expect(screen.queryByLabelText(/form\.couponCode/)).not.toBeInTheDocument();
    });
  });

  // 5. Submit button state
  describe('submit button state', () => {
    it('is enabled when all required fields are filled with valid data', async () => {
      const user = userEvent.setup();
      renderBookingStep();

      await fillRequiredFields(user);

      const submitBtn = screen.getByRole('button', { name: /form\.submitReservation/ });
      expect(submitBtn).toBeEnabled();
    });

    it('shows loading state during submission', async () => {
      // Make submitBooking hang to observe loading state
      let resolveSubmit: (v: unknown) => void;
      (api.submitBooking as jest.Mock).mockImplementation(
        () =>
          new Promise((res) => {
            resolveSubmit = res;
          })
      );

      const user = userEvent.setup();
      renderBookingStep();

      await fillRequiredFields(user);

      const submitBtn = screen.getByRole('button', { name: /form\.submitReservation/ });
      await user.click(submitBtn);

      // While submitting, button text changes and button is disabled
      await waitFor(() => {
        expect(screen.getByText('form.submitting')).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /form\.submitting/ })).toBeDisabled();

      // Resolve to clean up
      resolveSubmit!({ success: true });
    });
  });

  // 6. Successful submission
  describe('successful submission', () => {
    it('calls submitBooking with correct data and triggers onSuccess', async () => {
      const onSuccess = jest.fn();
      const user = userEvent.setup();
      renderBookingStep({ onSuccess });

      await fillRequiredFields(user);

      const submitBtn = screen.getByRole('button', { name: /form\.submitReservation/ });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(api.submitBooking).toHaveBeenCalledTimes(1);
      });

      // Verify the data structure
      const [submittedData, idempotencyKey] = (api.submitBooking as jest.Mock).mock.calls[0];
      expect(submittedData).toMatchObject({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '2125551234',
        date: '2026-04-15',
        time: 'afternoon',
        guestCount: 14,
        region: 'california',
      });
      expect(idempotencyKey).toBe('test-idempotency-key-123');

      // onSuccess called with form data
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'John Doe', email: 'john@example.com' })
      );
    });

    it('clears form data from sessionStorage on success', async () => {
      const user = userEvent.setup();
      renderBookingStep();

      await fillRequiredFields(user);
      await user.click(screen.getByRole('button', { name: /form\.submitReservation/ }));

      await waitFor(() => {
        expect(sessionStorage.getItem('happyhibachi_booking_form')).toBeNull();
      });
    });
  });

  // 7. Error handling
  describe('error handling', () => {
    it('shows error message on API failure with error string', async () => {
      (api.submitBooking as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Server is busy',
      });

      const user = userEvent.setup();
      renderBookingStep();

      await fillRequiredFields(user);
      await user.click(screen.getByRole('button', { name: /form\.submitReservation/ }));

      await waitFor(() => {
        expect(screen.getByText('Server is busy')).toBeInTheDocument();
      });
    });

    it('shows generic error on API exception', async () => {
      (api.submitBooking as jest.Mock).mockRejectedValue(new Error('Network error'));

      const user = userEvent.setup();
      renderBookingStep();

      await fillRequiredFields(user);
      await user.click(screen.getByRole('button', { name: /form\.submitReservation/ }));

      await waitFor(() => {
        expect(screen.getByText('form.error')).toBeInTheDocument();
      });
    });

    it('does not call onSuccess on API failure', async () => {
      (api.submitBooking as jest.Mock).mockResolvedValue({ success: false, error: 'fail' });
      const onSuccess = jest.fn();

      const user = userEvent.setup();
      renderBookingStep({ onSuccess });

      await fillRequiredFields(user);
      await user.click(screen.getByRole('button', { name: /form\.submitReservation/ }));

      await waitFor(() => {
        expect(screen.getByText('fail')).toBeInTheDocument();
      });
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  // 8. Session storage persistence
  describe('session storage persistence', () => {
    it('auto-saves form data to sessionStorage as user types', async () => {
      const user = userEvent.setup();
      renderBookingStep();

      await user.type(screen.getByLabelText(/form\.name/), 'Jane');

      const saved = JSON.parse(sessionStorage.getItem('happyhibachi_booking_form') || '{}');
      expect(saved.name).toBe('Jane');
    });

    it('restores form data from sessionStorage on mount', () => {
      sessionStorage.setItem(
        'happyhibachi_booking_form',
        JSON.stringify({
          name: 'Restored Name',
          email: 'restored@test.com',
          phone: '5551234567',
          date: '2026-05-01',
          time: 'evening',
          message: 'Saved message',
        })
      );

      renderBookingStep();

      expect(screen.getByLabelText(/form\.name/)).toHaveValue('Restored Name');
      expect(screen.getByLabelText(/form\.email/)).toHaveValue('restored@test.com');
      expect(screen.getByLabelText(/form\.phone/)).toHaveValue('5551234567');
    });
  });

  // 9. Back button
  describe('back button', () => {
    it('renders back button when onBack is provided', () => {
      renderBookingStep();
      expect(screen.getByText(/order\.back/)).toBeInTheDocument();
    });

    it('calls onBack when clicked', async () => {
      const onBack = jest.fn();
      const user = userEvent.setup();
      renderBookingStep({ onBack });

      await user.click(screen.getByText(/order\.back/));
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('does not render back button when onBack is not provided', () => {
      render(
        <BookingStep region="california" guestCount={12} kidsCount={0} onSuccess={jest.fn()} />
      );
      expect(screen.queryByText(/order\.back/)).not.toBeInTheDocument();
    });
  });
});
