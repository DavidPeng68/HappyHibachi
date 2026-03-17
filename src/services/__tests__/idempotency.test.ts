import { generateIdempotencyKey } from '../api';

// Mock i18n (required by api.ts import)
jest.mock('../../i18n', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

describe('Idempotency key generation', () => {
  describe('key format', () => {
    it('follows prefix_timestamp_random format', () => {
      const key = generateIdempotencyKey('booking');
      const parts = key.split('_');
      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe('booking');
    });

    it('works with different prefixes', () => {
      const prefixes = ['booking', 'estimate', 'retry', 'x'];
      for (const prefix of prefixes) {
        const key = generateIdempotencyKey(prefix);
        expect(key.startsWith(`${prefix}_`)).toBe(true);
      }
    });

    it('works with empty prefix', () => {
      const key = generateIdempotencyKey('');
      expect(key.startsWith('_')).toBe(true);
      const parts = key.split('_');
      expect(parts).toHaveLength(3);
    });
  });

  describe('timestamp portion', () => {
    it('contains a valid epoch timestamp', () => {
      const before = Date.now();
      const key = generateIdempotencyKey('test');
      const after = Date.now();

      const timestamp = Number(key.split('_')[1]);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('is within current epoch range (after 2024)', () => {
      const key = generateIdempotencyKey('test');
      const timestamp = Number(key.split('_')[1]);
      // Jan 1, 2024 = 1704067200000
      expect(timestamp).toBeGreaterThan(1704067200000);
      // Should be less than year 2100
      expect(timestamp).toBeLessThan(4102444800000);
    });
  });

  describe('random portion', () => {
    it('has sufficient length (at least 5 characters)', () => {
      for (let i = 0; i < 20; i++) {
        const key = generateIdempotencyKey('test');
        const random = key.split('_')[2];
        expect(random.length).toBeGreaterThanOrEqual(5);
      }
    });

    it('contains only base-36 characters (a-z, 0-9)', () => {
      for (let i = 0; i < 50; i++) {
        const key = generateIdempotencyKey('test');
        const random = key.split('_')[2];
        expect(random).toMatch(/^[a-z0-9]+$/);
      }
    });
  });

  describe('uniqueness', () => {
    it('produces unique keys across multiple calls', () => {
      const keys = new Set<string>();
      for (let i = 0; i < 100; i++) {
        keys.add(generateIdempotencyKey('test'));
      }
      expect(keys.size).toBe(100);
    });

    it('keys with same prefix are still unique', () => {
      const keys = new Set<string>();
      for (let i = 0; i < 100; i++) {
        keys.add(generateIdempotencyKey('booking'));
      }
      expect(keys.size).toBe(100);
    });

    it('no collisions in 1000 generations', () => {
      const keys = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        keys.add(generateIdempotencyKey('stress'));
      }
      expect(keys.size).toBe(1000);
    });

    it('keys with different prefixes are unique', () => {
      const a = generateIdempotencyKey('booking');
      const b = generateIdempotencyKey('estimate');
      expect(a).not.toBe(b);
    });
  });
});
