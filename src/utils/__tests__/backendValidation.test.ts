import {
  validateStringLength,
  validateArrayLength,
  validatePasswordComplexity,
  validateDateRange,
} from '../../../functions/api/_validation';

// ---------------------------------------------------------------------------
// validateStringLength
// ---------------------------------------------------------------------------

describe('validateStringLength', () => {
  describe('happy path', () => {
    it('returns null for a valid string within bounds', () => {
      expect(validateStringLength('hello', 'Name', 100)).toBeNull();
    });

    it('returns null when string length equals maxLength', () => {
      expect(validateStringLength('abc', 'Field', 3)).toBeNull();
    });

    it('returns null when string length equals minLength', () => {
      expect(validateStringLength('ab', 'Field', 10, 2)).toBeNull();
    });

    it('returns null for empty string when minLength is 0', () => {
      expect(validateStringLength('', 'Field', 10)).toBeNull();
    });
  });

  describe('type checking', () => {
    it('rejects number', () => {
      expect(validateStringLength(42 as unknown, 'Age', 10)).toBe('Age must be a string');
    });

    it('rejects null', () => {
      expect(validateStringLength(null as unknown, 'Name', 10)).toBe('Name must be a string');
    });

    it('rejects undefined', () => {
      expect(validateStringLength(undefined as unknown, 'Name', 10)).toBe('Name must be a string');
    });

    it('rejects boolean', () => {
      expect(validateStringLength(true as unknown, 'Flag', 10)).toBe('Flag must be a string');
    });

    it('rejects object', () => {
      expect(validateStringLength({} as unknown, 'Data', 10)).toBe('Data must be a string');
    });

    it('rejects array', () => {
      expect(validateStringLength([] as unknown, 'List', 10)).toBe('List must be a string');
    });
  });

  describe('min length violations', () => {
    it('rejects string shorter than minLength', () => {
      expect(validateStringLength('ab', 'Name', 100, 5)).toBe('Name must be at least 5 characters');
    });

    it('rejects empty string when minLength > 0', () => {
      expect(validateStringLength('', 'Name', 100, 1)).toBe('Name must be at least 1 characters');
    });
  });

  describe('max length violations', () => {
    it('rejects string exceeding maxLength', () => {
      expect(validateStringLength('abcdef', 'Name', 5)).toBe('Name must not exceed 5 characters');
    });

    it('rejects string one character over maxLength', () => {
      expect(validateStringLength('abcd', 'Name', 3)).toBe('Name must not exceed 3 characters');
    });
  });

  describe('unicode and special characters', () => {
    it('handles unicode characters (emoji)', () => {
      // JS string length counts UTF-16 code units; one emoji can be 2
      const emoji = '\u{1F600}'; // grinning face — length 2 in JS
      expect(validateStringLength(emoji, 'Emoji', 1)).toBe('Emoji must not exceed 1 characters');
      expect(validateStringLength(emoji, 'Emoji', 2)).toBeNull();
    });

    it('handles CJK characters', () => {
      expect(validateStringLength('\u4F60\u597D', 'Greeting', 2)).toBeNull(); // 你好 — length 2
    });

    it('handles strings with newlines and tabs', () => {
      expect(validateStringLength('line1\nline2\ttab', 'Content', 100)).toBeNull();
    });
  });

  describe('boundary values', () => {
    it('maxLength = 0 only allows empty string', () => {
      expect(validateStringLength('', 'Field', 0)).toBeNull();
      expect(validateStringLength('a', 'Field', 0)).toBe('Field must not exceed 0 characters');
    });

    it('minLength equals maxLength allows only exact length', () => {
      expect(validateStringLength('abc', 'Code', 3, 3)).toBeNull();
      expect(validateStringLength('ab', 'Code', 3, 3)).toBe('Code must be at least 3 characters');
      expect(validateStringLength('abcd', 'Code', 3, 3)).toBe('Code must not exceed 3 characters');
    });
  });
});

// ---------------------------------------------------------------------------
// validateArrayLength
// ---------------------------------------------------------------------------

describe('validateArrayLength', () => {
  describe('happy path', () => {
    it('returns null for a valid array within bounds', () => {
      expect(validateArrayLength(['a', 'b'], 'Items', 5)).toBeNull();
    });

    it('returns null for empty array', () => {
      expect(validateArrayLength([], 'Items', 5)).toBeNull();
    });

    it('returns null when array length equals maxItems', () => {
      expect(validateArrayLength(['a', 'b', 'c'], 'Items', 3)).toBeNull();
    });
  });

  describe('type checking', () => {
    it('rejects non-array values', () => {
      expect(validateArrayLength('string' as unknown, 'Items', 5)).toBe('Items must be an array');
      expect(validateArrayLength(42 as unknown, 'Items', 5)).toBe('Items must be an array');
      expect(validateArrayLength(null as unknown, 'Items', 5)).toBe('Items must be an array');
      expect(validateArrayLength(undefined as unknown, 'Items', 5)).toBe('Items must be an array');
      expect(validateArrayLength({} as unknown, 'Items', 5)).toBe('Items must be an array');
    });
  });

  describe('maxItems violations', () => {
    it('rejects array exceeding maxItems', () => {
      expect(validateArrayLength(['a', 'b', 'c'], 'Tags', 2)).toBe('Tags must not exceed 2 items');
    });

    it('rejects single item over when maxItems is 0', () => {
      expect(validateArrayLength(['a'], 'Tags', 0)).toBe('Tags must not exceed 0 items');
    });
  });

  describe('maxItemLength enforcement', () => {
    it('returns null when all items are within maxItemLength', () => {
      expect(validateArrayLength(['ab', 'cd'], 'Tags', 5, 3)).toBeNull();
    });

    it('rejects non-string items when maxItemLength is set', () => {
      expect(validateArrayLength([42], 'Tags', 5, 10)).toBe('Tags items must be strings');
      expect(validateArrayLength([null], 'Tags', 5, 10)).toBe('Tags items must be strings');
      expect(validateArrayLength([true], 'Tags', 5, 10)).toBe('Tags items must be strings');
    });

    it('rejects items exceeding maxItemLength', () => {
      expect(validateArrayLength(['abcdef'], 'Tags', 5, 3)).toBe(
        'Tags items must not exceed 3 characters'
      );
    });

    it('checks all items and fails on first violation', () => {
      expect(validateArrayLength(['ok', 'toolong'], 'Tags', 5, 4)).toBe(
        'Tags items must not exceed 4 characters'
      );
    });

    it('does not check item length when maxItemLength is undefined', () => {
      // Array with non-string items should pass if maxItemLength is not set
      expect(validateArrayLength([1, 2, 3], 'Items', 5)).toBeNull();
    });
  });

  describe('unicode items', () => {
    it('handles unicode strings in array items', () => {
      expect(validateArrayLength(['\u4F60\u597D'], 'Tags', 5, 2)).toBeNull();
      expect(validateArrayLength(['\u4F60\u597D\u4E16\u754C'], 'Tags', 5, 2)).toBe(
        'Tags items must not exceed 2 characters'
      );
    });
  });
});

// ---------------------------------------------------------------------------
// validatePasswordComplexity
// ---------------------------------------------------------------------------

describe('validatePasswordComplexity', () => {
  it('accepts a valid password', () => {
    expect(validatePasswordComplexity('Passw0rd')).toBeNull();
  });

  it('accepts a strong password with special characters', () => {
    expect(validatePasswordComplexity('C0mplex!Pass#2026')).toBeNull();
  });

  it('rejects passwords shorter than 8 characters', () => {
    expect(validatePasswordComplexity('Abc1')).toBe('Password must be at least 8 characters');
    expect(validatePasswordComplexity('Ab1234z')).toBe('Password must be at least 8 characters');
  });

  it('rejects passwords missing uppercase letter', () => {
    expect(validatePasswordComplexity('password1')).toBe(
      'Password must contain an uppercase letter'
    );
  });

  it('rejects passwords missing lowercase letter', () => {
    expect(validatePasswordComplexity('PASSWORD1')).toBe(
      'Password must contain a lowercase letter'
    );
  });

  it('rejects passwords missing a number', () => {
    expect(validatePasswordComplexity('Password')).toBe('Password must contain a number');
  });

  it('checks rules in order: length first', () => {
    // Short + no uppercase + no number → length error returned first
    expect(validatePasswordComplexity('short')).toBe('Password must be at least 8 characters');
  });

  it('exactly 8 characters meeting all requirements passes', () => {
    expect(validatePasswordComplexity('Abcdef1x')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validateDateRange
// ---------------------------------------------------------------------------

describe('validateDateRange', () => {
  it('returns null for a valid date range', () => {
    expect(validateDateRange('2026-03-01', '2026-03-15')).toBeNull();
  });

  it('returns null when from equals until (same date)', () => {
    expect(validateDateRange('2026-06-01', '2026-06-01')).toBeNull();
  });

  it('rejects invalid start date', () => {
    expect(validateDateRange('not-a-date', '2026-03-15')).toBe('Invalid start date');
  });

  it('rejects invalid end date', () => {
    expect(validateDateRange('2026-03-01', 'nope')).toBe('Invalid end date');
  });

  it('rejects when start date is after end date', () => {
    expect(validateDateRange('2026-12-31', '2026-01-01')).toBe(
      'Start date must be before end date'
    );
  });

  it('handles ISO datetime strings', () => {
    expect(validateDateRange('2026-01-01T00:00:00Z', '2026-12-31T23:59:59Z')).toBeNull();
  });

  it('rejects empty strings', () => {
    expect(validateDateRange('', '2026-03-15')).toBe('Invalid start date');
    expect(validateDateRange('2026-03-15', '')).toBe('Invalid end date');
  });
});
