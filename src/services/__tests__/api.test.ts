import {
  generateIdempotencyKey,
  submitBooking,
  submitEstimate,
  submitNewsletter,
  submitReferral,
} from '../api';
import type { BookingFormData, EstimateFormData } from '../../types';

// Mock i18n to return the key as the translated string
jest.mock('../../i18n', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

// --- Helpers ---

const mockFetch = jest.fn();

beforeAll(() => {
  global.fetch = mockFetch;
});

beforeEach(() => {
  mockFetch.mockReset();
});

function makeBookingData(overrides?: Partial<BookingFormData>): BookingFormData {
  return {
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '(555) 123-4567',
    date: '2026-04-15',
    time: 'Afternoon (13:00 - 15:00)',
    guestCount: 20,
    region: 'houston',
    message: 'Birthday party',
    ...overrides,
  };
}

function makeEstimateData(overrides?: Partial<EstimateFormData>): EstimateFormData {
  return {
    name: 'John Smith',
    email: 'john@example.com',
    phone: '(555) 987-6543',
    eventType: 'Corporate',
    guestCount: 50,
    preferredDate: '2026-05-20',
    region: 'dallas',
    additionalInfo: 'Outdoor event',
    ...overrides,
  };
}

function okResponse(body: Record<string, unknown> = { success: true, message: 'OK' }) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  });
}

function errorResponse(status: number, body?: Record<string, unknown>) {
  return Promise.resolve({
    ok: false,
    status,
    json: body ? () => Promise.resolve(body) : () => Promise.reject(new Error('no json')),
  });
}

// --- generateIdempotencyKey ---

describe('generateIdempotencyKey', () => {
  it('returns a string', () => {
    expect(typeof generateIdempotencyKey('test')).toBe('string');
  });

  it('starts with the given prefix', () => {
    const key = generateIdempotencyKey('booking');
    expect(key.startsWith('booking_')).toBe(true);
  });

  it('has format prefix_timestamp_random', () => {
    const key = generateIdempotencyKey('est');
    const parts = key.split('_');
    expect(parts.length).toBe(3);
    expect(parts[0]).toBe('est');
    // Timestamp portion should be a number
    expect(Number(parts[1])).not.toBeNaN();
    // Random portion should be non-empty alphanumeric
    expect(parts[2].length).toBeGreaterThanOrEqual(5);
  });

  it('produces unique keys on successive calls', () => {
    const a = generateIdempotencyKey('x');
    const b = generateIdempotencyKey('x');
    expect(a).not.toBe(b);
  });

  it('has reasonable overall length', () => {
    const key = generateIdempotencyKey('booking');
    // prefix(7) + _ + timestamp(~13) + _ + random(~7) = ~30
    expect(key.length).toBeGreaterThan(15);
    expect(key.length).toBeLessThan(50);
  });
});

// --- submitBooking ---

describe('submitBooking', () => {
  it('calls fetch with correct URL, method, and headers', async () => {
    mockFetch.mockReturnValueOnce(okResponse());

    await submitBooking(makeBookingData());

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/booking');
    expect(opts.method).toBe('POST');
    expect(opts.headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('includes formType "booking" in the request body', async () => {
    mockFetch.mockReturnValueOnce(okResponse());

    await submitBooking(makeBookingData());

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.formType).toBe('booking');
  });

  it('includes the provided idempotencyKey', async () => {
    mockFetch.mockReturnValueOnce(okResponse());

    await submitBooking(makeBookingData(), 'my_custom_key');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.idempotencyKey).toBe('my_custom_key');
  });

  it('generates an idempotencyKey when none is provided', async () => {
    mockFetch.mockReturnValueOnce(okResponse());

    await submitBooking(makeBookingData());

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.idempotencyKey).toBeDefined();
    expect(body.idempotencyKey.startsWith('booking_')).toBe(true);
  });

  it('sends all form fields in the body', async () => {
    mockFetch.mockReturnValueOnce(okResponse());
    const data = makeBookingData();

    await submitBooking(data);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.name).toBe(data.name);
    expect(body.email).toBe(data.email);
    expect(body.phone).toBe(data.phone);
    expect(body.date).toBe(data.date);
    expect(body.time).toBe(data.time);
    expect(body.guestCount).toBe(data.guestCount);
    expect(body.region).toBe(data.region);
    expect(body.message).toBe(data.message);
  });

  it('returns success response', async () => {
    mockFetch.mockReturnValueOnce(
      okResponse({ success: true, message: 'Booking confirmed', confirmationSent: true })
    );

    const result = await submitBooking(makeBookingData());

    expect(result.success).toBe(true);
    expect(result.message).toBe('Booking confirmed');
    expect(result.confirmationSent).toBe(true);
  });

  it('handles network error (fetch throws)', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const result = await submitBooking(makeBookingData());

    expect(result.success).toBe(false);
    expect(result.error).toBe('errors.network');
  });

  it('handles HTTP 400 with error body', async () => {
    mockFetch.mockReturnValueOnce(errorResponse(400, { error: 'Invalid date format' }));

    const result = await submitBooking(makeBookingData());

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid date format');
  });

  it('handles HTTP 400 without JSON body', async () => {
    mockFetch.mockReturnValueOnce(errorResponse(400));

    const result = await submitBooking(makeBookingData());

    expect(result.success).toBe(false);
    expect(result.error).toBe('errors.badRequest');
  });

  it('handles HTTP 500 with error body', async () => {
    mockFetch.mockReturnValueOnce(errorResponse(500, { error: 'KV write failed' }));

    const result = await submitBooking(makeBookingData());

    expect(result.success).toBe(false);
    expect(result.error).toBe('KV write failed');
  });

  it('handles HTTP 500 without JSON body', async () => {
    mockFetch.mockReturnValueOnce(errorResponse(500));

    const result = await submitBooking(makeBookingData());

    expect(result.success).toBe(false);
    expect(result.error).toBe('errors.serverError');
  });

  it('handles timeout (AbortError)', async () => {
    const abortError = new DOMException('The operation was aborted.', 'AbortError');
    mockFetch.mockRejectedValueOnce(abortError);

    const result = await submitBooking(makeBookingData());

    expect(result.success).toBe(false);
    expect(result.error).toBe('errors.timeout');
  });

  it('handles JSON parse error on success response', async () => {
    mockFetch.mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
      })
    );

    const result = await submitBooking(makeBookingData());

    expect(result.success).toBe(false);
    expect(result.error).toBe('errors.network');
  });
});

// --- submitEstimate ---

describe('submitEstimate', () => {
  it('calls fetch with correct URL and method', async () => {
    mockFetch.mockReturnValueOnce(okResponse());

    await submitEstimate(makeEstimateData());

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/booking');
    expect(opts.method).toBe('POST');
  });

  it('sends formType "estimate" in the body', async () => {
    mockFetch.mockReturnValueOnce(okResponse());

    await submitEstimate(makeEstimateData());

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.formType).toBe('estimate');
  });

  it('maps EstimateFormData fields correctly', async () => {
    mockFetch.mockReturnValueOnce(okResponse());
    const data = makeEstimateData();

    await submitEstimate(data);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.name).toBe(data.name);
    expect(body.email).toBe(data.email);
    expect(body.phone).toBe(data.phone);
    expect(body.date).toBe(data.preferredDate);
    expect(body.guestCount).toBe(data.guestCount);
    expect(body.region).toBe(data.region);
    expect(body.eventType).toBe(data.eventType);
    expect(body.time).toBe('');
  });

  it('includes eventType and additionalInfo in message field', async () => {
    mockFetch.mockReturnValueOnce(okResponse());
    const data = makeEstimateData({ eventType: 'Wedding', additionalInfo: 'Vegan options' });

    await submitEstimate(data);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.message).toContain('Event Type: Wedding');
    expect(body.message).toContain('Vegan options');
  });

  it('handles missing additionalInfo gracefully', async () => {
    mockFetch.mockReturnValueOnce(okResponse());

    await submitEstimate(makeEstimateData({ additionalInfo: undefined }));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.message).toContain('Event Type:');
  });

  it('generates idempotencyKey with "estimate" prefix when none provided', async () => {
    mockFetch.mockReturnValueOnce(okResponse());

    await submitEstimate(makeEstimateData());

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.idempotencyKey).toBeDefined();
    expect(body.idempotencyKey.startsWith('estimate_')).toBe(true);
  });

  it('uses provided idempotencyKey', async () => {
    mockFetch.mockReturnValueOnce(okResponse());

    await submitEstimate(makeEstimateData(), 'est_key_123');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.idempotencyKey).toBe('est_key_123');
  });

  it('handles network error', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Network request failed'));

    const result = await submitEstimate(makeEstimateData());

    expect(result.success).toBe(false);
    expect(result.error).toBe('errors.network');
  });

  it('handles server error response', async () => {
    mockFetch.mockReturnValueOnce(errorResponse(503));

    const result = await submitEstimate(makeEstimateData());

    expect(result.success).toBe(false);
    expect(result.error).toBe('errors.serverError');
  });
});

// --- submitNewsletter ---

describe('submitNewsletter', () => {
  it('sends email to /api/newsletter', async () => {
    mockFetch.mockReturnValueOnce(okResponse());

    await submitNewsletter('user@example.com');

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/newsletter');
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body);
    expect(body.email).toBe('user@example.com');
  });
});

// --- submitReferral ---

describe('submitReferral', () => {
  it('sends email to /api/referral and can return a code', async () => {
    mockFetch.mockReturnValueOnce(okResponse({ success: true, code: 'REF-ABC123' }));

    const result = await submitReferral('ref@example.com');

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/referral');
    expect(result.success).toBe(true);
    expect(result.code).toBe('REF-ABC123');
  });
});

// --- API_BASE / URL construction ---

describe('API URL construction', () => {
  it('all endpoints use /api base path', async () => {
    mockFetch.mockReturnValue(okResponse());

    await submitBooking(makeBookingData());
    await submitEstimate(makeEstimateData());
    await submitNewsletter('a@b.com');
    await submitReferral('c@d.com');

    const urls = mockFetch.mock.calls.map((call: [string, RequestInit]) => call[0]);
    expect(urls).toEqual(['/api/booking', '/api/booking', '/api/newsletter', '/api/referral']);
  });
});
