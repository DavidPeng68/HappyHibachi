import {
  getShardMonth,
  getShardKey,
  parsePaginationParams,
  paginateArray,
} from '../../../functions/api/_kvHelpers';

// ---------------------------------------------------------------------------
// getShardMonth
// ---------------------------------------------------------------------------

describe('getShardMonth', () => {
  it('extracts month from ISO date string', () => {
    expect(getShardMonth('2026-03-15')).toBe('2026-03');
  });

  it('extracts month from first day of month', () => {
    expect(getShardMonth('2026-01-01')).toBe('2026-01');
  });

  it('extracts month from last day of year', () => {
    expect(getShardMonth('2026-12-31')).toBe('2026-12');
  });

  it('works with ISO datetime string', () => {
    expect(getShardMonth('2026-06-15T14:30:00Z')).toBe('2026-06');
  });

  it('handles strings with extra characters', () => {
    // Just slices first 7 chars
    expect(getShardMonth('2026-09-01 extra stuff')).toBe('2026-09');
  });
});

// ---------------------------------------------------------------------------
// getShardKey
// ---------------------------------------------------------------------------

describe('getShardKey', () => {
  it('returns prefix:month format', () => {
    expect(getShardKey('bookings', '2026-03')).toBe('bookings:2026-03');
  });

  it('works with different prefixes', () => {
    expect(getShardKey('reviews', '2025-12')).toBe('reviews:2025-12');
  });

  it('handles empty prefix', () => {
    expect(getShardKey('', '2026-01')).toBe(':2026-01');
  });

  it('handles empty month', () => {
    expect(getShardKey('bookings', '')).toBe('bookings:');
  });
});

// ---------------------------------------------------------------------------
// parsePaginationParams
// ---------------------------------------------------------------------------

describe('parsePaginationParams', () => {
  const makeUrl = (params: Record<string, string> = {}): URL => {
    const url = new URL('https://example.com/api/bookings');
    for (const [key, val] of Object.entries(params)) {
      url.searchParams.set(key, val);
    }
    return url;
  };

  describe('defaults', () => {
    it('returns sensible defaults when no params provided', () => {
      const result = parsePaginationParams(makeUrl());
      expect(result).toEqual({
        page: 1,
        pageSize: 20,
        search: '',
        sort: 'createdAt',
        dir: 'desc',
      });
    });

    it('uses custom defaults when provided', () => {
      const result = parsePaginationParams(makeUrl(), { pageSize: 50, sort: 'name' });
      expect(result).toEqual({
        page: 1,
        pageSize: 50,
        search: '',
        sort: 'name',
        dir: 'desc',
      });
    });
  });

  describe('page parameter', () => {
    it('parses page number from query', () => {
      expect(parsePaginationParams(makeUrl({ page: '3' })).page).toBe(3);
    });

    it('clamps page to minimum of 1', () => {
      expect(parsePaginationParams(makeUrl({ page: '0' })).page).toBe(1);
      expect(parsePaginationParams(makeUrl({ page: '-5' })).page).toBe(1);
    });

    it('returns NaN for non-numeric page (parseInt behavior)', () => {
      // parseInt('abc') returns NaN, Math.max(1, NaN) returns NaN
      // This is the actual function behavior — callers should validate input
      const result = parsePaginationParams(makeUrl({ page: 'abc' }));
      expect(result.page).toBeNaN();
    });
  });

  describe('pageSize parameter', () => {
    it('parses pageSize from query', () => {
      expect(parsePaginationParams(makeUrl({ pageSize: '50' })).pageSize).toBe(50);
    });

    it('clamps pageSize to minimum of 1', () => {
      expect(parsePaginationParams(makeUrl({ pageSize: '0' })).pageSize).toBe(1);
      expect(parsePaginationParams(makeUrl({ pageSize: '-10' })).pageSize).toBe(1);
    });

    it('clamps pageSize to maximum of 100', () => {
      expect(parsePaginationParams(makeUrl({ pageSize: '200' })).pageSize).toBe(100);
      expect(parsePaginationParams(makeUrl({ pageSize: '101' })).pageSize).toBe(100);
    });

    it('boundary: pageSize 1 and 100 are valid', () => {
      expect(parsePaginationParams(makeUrl({ pageSize: '1' })).pageSize).toBe(1);
      expect(parsePaginationParams(makeUrl({ pageSize: '100' })).pageSize).toBe(100);
    });
  });

  describe('search parameter', () => {
    it('trims and lowercases search string', () => {
      expect(parsePaginationParams(makeUrl({ search: '  Hello World  ' })).search).toBe(
        'hello world'
      );
    });

    it('returns empty string when search is not provided', () => {
      expect(parsePaginationParams(makeUrl()).search).toBe('');
    });

    it('handles unicode search terms', () => {
      expect(parsePaginationParams(makeUrl({ search: '\u4F60\u597D' })).search).toBe(
        '\u4F60\u597D'
      );
    });
  });

  describe('sort parameter', () => {
    it('parses sort from query', () => {
      expect(parsePaginationParams(makeUrl({ sort: 'name' })).sort).toBe('name');
    });

    it('falls back to defaults.sort', () => {
      expect(parsePaginationParams(makeUrl(), { sort: 'date' }).sort).toBe('date');
    });

    it('falls back to createdAt when no sort and no defaults', () => {
      expect(parsePaginationParams(makeUrl()).sort).toBe('createdAt');
    });
  });

  describe('dir parameter', () => {
    it('returns asc when dir is "asc"', () => {
      expect(parsePaginationParams(makeUrl({ dir: 'asc' })).dir).toBe('asc');
    });

    it('returns desc for any other value', () => {
      expect(parsePaginationParams(makeUrl({ dir: 'desc' })).dir).toBe('desc');
      expect(parsePaginationParams(makeUrl({ dir: 'invalid' })).dir).toBe('desc');
      expect(parsePaginationParams(makeUrl({ dir: '' })).dir).toBe('desc');
    });

    it('defaults to desc when dir is not provided', () => {
      expect(parsePaginationParams(makeUrl()).dir).toBe('desc');
    });
  });
});

// ---------------------------------------------------------------------------
// paginateArray
// ---------------------------------------------------------------------------

describe('paginateArray', () => {
  const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];

  describe('basic pagination', () => {
    it('returns first page of items', () => {
      const result = paginateArray(items, 1, 3);
      expect(result).toEqual({
        data: ['a', 'b', 'c'],
        total: 10,
        page: 1,
        pageSize: 3,
      });
    });

    it('returns second page', () => {
      const result = paginateArray(items, 2, 3);
      expect(result).toEqual({
        data: ['d', 'e', 'f'],
        total: 10,
        page: 2,
        pageSize: 3,
      });
    });

    it('returns last page with fewer items', () => {
      const result = paginateArray(items, 4, 3);
      expect(result).toEqual({
        data: ['j'],
        total: 10,
        page: 4,
        pageSize: 3,
      });
    });

    it('returns all items when pageSize >= array length', () => {
      const result = paginateArray(items, 1, 20);
      expect(result).toEqual({
        data: items,
        total: 10,
        page: 1,
        pageSize: 20,
      });
    });
  });

  describe('empty array', () => {
    it('returns empty data with total 0', () => {
      const result = paginateArray([], 1, 10);
      expect(result).toEqual({
        data: [],
        total: 0,
        page: 1,
        pageSize: 10,
      });
    });
  });

  describe('page clamping', () => {
    it('clamps page below 1 to 1', () => {
      const result = paginateArray(items, 0, 5);
      expect(result.page).toBe(1);
      expect(result.data).toEqual(['a', 'b', 'c', 'd', 'e']);
    });

    it('clamps page beyond total pages to last page', () => {
      const result = paginateArray(items, 999, 5);
      expect(result.page).toBe(2); // 10 items / 5 per page = 2 pages
      expect(result.data).toEqual(['f', 'g', 'h', 'i', 'j']);
    });

    it('clamps negative page to 1', () => {
      const result = paginateArray(items, -3, 5);
      expect(result.page).toBe(1);
    });
  });

  describe('pageSize clamping', () => {
    it('clamps pageSize below 1 to 1', () => {
      const result = paginateArray(items, 1, 0);
      expect(result.pageSize).toBe(1);
      expect(result.data).toEqual(['a']);
    });

    it('clamps negative pageSize to 1', () => {
      const result = paginateArray(items, 1, -5);
      expect(result.pageSize).toBe(1);
    });

    it('clamps pageSize above 100 to 100', () => {
      const result = paginateArray(items, 1, 200);
      expect(result.pageSize).toBe(100);
    });

    it('boundary: pageSize 1 returns one item per page', () => {
      const result = paginateArray(items, 3, 1);
      expect(result.data).toEqual(['c']);
      expect(result.page).toBe(3);
    });

    it('boundary: pageSize 100 is allowed', () => {
      const result = paginateArray(items, 1, 100);
      expect(result.pageSize).toBe(100);
      expect(result.data).toEqual(items);
    });
  });

  describe('total always reflects input length', () => {
    it('total equals array length regardless of page', () => {
      expect(paginateArray(items, 1, 3).total).toBe(10);
      expect(paginateArray(items, 5, 3).total).toBe(10);
      expect(paginateArray([], 1, 3).total).toBe(0);
    });
  });

  describe('works with object arrays', () => {
    it('paginates array of objects', () => {
      const objs = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const result = paginateArray(objs, 1, 2);
      expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
      expect(result.total).toBe(3);
    });
  });
});
