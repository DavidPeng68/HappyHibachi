import { validateEmail, validatePhone, validateGuestCount } from '../validation';

describe('validateEmail', () => {
  it('accepts valid emails', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('user+tag@example.com')).toBe(true);
    expect(validateEmail('first.last@sub.domain.com')).toBe(true);
    expect(validateEmail('user@example.co.uk')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(validateEmail('')).toBe(false);
    expect(validateEmail('user')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
    expect(validateEmail('@domain.com')).toBe(false);
    expect(validateEmail('user @domain.com')).toBe(false);
    expect(validateEmail('user@domain')).toBe(false);
    expect(validateEmail('user@.com')).toBe(false);
  });

  it('handles edge case emails', () => {
    // Domain starting with dot
    expect(validateEmail('user@.domain.com')).toBe(false);
    // Whitespace in local part
    expect(validateEmail('us er@domain.com')).toBe(false);
    // Missing TLD
    expect(validateEmail('user@localhost')).toBe(false);
    // Single char TLD (too short)
    expect(validateEmail('user@domain.c')).toBe(false);
    // Valid: dots in local part
    expect(validateEmail('first.last@example.com')).toBe(true);
    // Valid: special chars in local part
    expect(validateEmail("user!#$%&'*+/=?^_`{|}~@example.com")).toBe(true);
  });
});

describe('validatePhone', () => {
  it('accepts valid phone numbers (10+ digits)', () => {
    expect(validatePhone('9096156633')).toBe(true);
    expect(validatePhone('(909) 615-6633')).toBe(true);
    expect(validatePhone('+1 909-615-6633')).toBe(true);
    expect(validatePhone('909.615.6633')).toBe(true);
    expect(validatePhone('+86 138 0000 0000')).toBe(true);
  });

  it('rejects phone numbers with fewer than 10 digits', () => {
    expect(validatePhone('')).toBe(false);
    expect(validatePhone('12345')).toBe(false);
    expect(validatePhone('123-456-78')).toBe(false);
    expect(validatePhone('abcdefghij')).toBe(false);
  });

  it('handles edge cases', () => {
    // All formatting, no digits
    expect(validatePhone('(---) --- ----')).toBe(false);
    // Exactly 10 digits with heavy formatting
    expect(validatePhone('+1 (909) 615-6633')).toBe(true);
    // International long number
    expect(validatePhone('+44 20 7946 0958')).toBe(true);
  });
});

describe('validateGuestCount', () => {
  it('accepts valid guest counts', () => {
    expect(validateGuestCount(10)).toBe(true);
    expect(validateGuestCount(100)).toBe(true);
    expect(validateGuestCount(1, 1)).toBe(true);
  });

  it('rejects invalid guest counts', () => {
    expect(validateGuestCount(0)).toBe(false);
    expect(validateGuestCount(9)).toBe(false);
    expect(validateGuestCount(-1)).toBe(false);
    expect(validateGuestCount(5.5)).toBe(false);
    expect(validateGuestCount(NaN)).toBe(false);
  });

  it('respects custom minimum', () => {
    expect(validateGuestCount(5, 5)).toBe(true);
    expect(validateGuestCount(4, 5)).toBe(false);
    expect(validateGuestCount(1, 1)).toBe(true);
  });
});
