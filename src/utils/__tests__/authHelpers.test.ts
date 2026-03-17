import { getCorsHeaders, escapeHtml, isLegacyHash } from '../../../functions/api/_auth';

// ---------------------------------------------------------------------------
// getCorsHeaders
// ---------------------------------------------------------------------------

describe('getCorsHeaders', () => {
  it('returns default origin when called with no arguments', () => {
    const headers = getCorsHeaders();
    expect(headers['Access-Control-Allow-Origin']).toBe('https://familyfriendshibachi.com');
  });

  it('includes standard CORS methods', () => {
    const headers = getCorsHeaders();
    expect(headers['Access-Control-Allow-Methods']).toContain('GET');
    expect(headers['Access-Control-Allow-Methods']).toContain('POST');
    expect(headers['Access-Control-Allow-Methods']).toContain('PUT');
    expect(headers['Access-Control-Allow-Methods']).toContain('PATCH');
    expect(headers['Access-Control-Allow-Methods']).toContain('DELETE');
    expect(headers['Access-Control-Allow-Methods']).toContain('OPTIONS');
  });

  it('includes Content-Type and Authorization in allowed headers', () => {
    const headers = getCorsHeaders();
    expect(headers['Access-Control-Allow-Headers']).toContain('Content-Type');
    expect(headers['Access-Control-Allow-Headers']).toContain('Authorization');
  });

  it('sets Content-Type to application/json', () => {
    const headers = getCorsHeaders();
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('matches request origin when it is in allowed list', () => {
    const request = new Request('https://familyfriendshibachi.com/api/test', {
      headers: { Origin: 'https://familyfriendshibachi.com' },
    });
    const headers = getCorsHeaders(request);
    expect(headers['Access-Control-Allow-Origin']).toBe('https://familyfriendshibachi.com');
  });

  it('uses first allowed origin when request origin is not in list', () => {
    const request = new Request('https://evil.com/api/test', {
      headers: { Origin: 'https://evil.com' },
    });
    const headers = getCorsHeaders(request);
    expect(headers['Access-Control-Allow-Origin']).toBe('https://familyfriendshibachi.com');
  });

  it('uses env ALLOWED_ORIGINS when provided', () => {
    const request = new Request('https://staging.example.com/api/test', {
      headers: { Origin: 'https://staging.example.com' },
    });
    const env = { ALLOWED_ORIGINS: 'https://staging.example.com,https://prod.example.com' };
    const headers = getCorsHeaders(request, env);
    expect(headers['Access-Control-Allow-Origin']).toBe('https://staging.example.com');
  });

  it('falls back to first allowed origin from env when request origin does not match', () => {
    const request = new Request('https://unknown.com/api', {
      headers: { Origin: 'https://unknown.com' },
    });
    const env = { ALLOWED_ORIGINS: 'https://alpha.com, https://beta.com' };
    const headers = getCorsHeaders(request, env);
    expect(headers['Access-Control-Allow-Origin']).toBe('https://alpha.com');
  });

  it('handles request with no Origin header', () => {
    const request = new Request('https://familyfriendshibachi.com/api/test');
    const headers = getCorsHeaders(request);
    // No origin header → empty string → won't match → falls back to first allowed
    expect(headers['Access-Control-Allow-Origin']).toBe('https://familyfriendshibachi.com');
  });
});

// ---------------------------------------------------------------------------
// escapeHtml
// ---------------------------------------------------------------------------

describe('escapeHtml', () => {
  it('escapes ampersand', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B');
  });

  it('escapes less-than', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
  });

  it('escapes greater-than', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  it('escapes all special characters in one string', () => {
    expect(escapeHtml('<b>"Hello" & \'World\'</b>')).toBe(
      '&lt;b&gt;&quot;Hello&quot; &amp; &#39;World&#39;&lt;/b&gt;'
    );
  });

  it('returns unchanged string when no special characters', () => {
    expect(escapeHtml('Hello World 123')).toBe('Hello World 123');
  });

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('handles string with only special characters', () => {
    expect(escapeHtml('<>&"\'<>&"\'')).toBe('&lt;&gt;&amp;&quot;&#39;&lt;&gt;&amp;&quot;&#39;');
  });

  it('handles unicode characters (no escaping needed)', () => {
    expect(escapeHtml('\u4F60\u597D\u4E16\u754C')).toBe('\u4F60\u597D\u4E16\u754C');
  });

  it('handles script injection attempt', () => {
    const input = '<script>alert("xss")</script>';
    const result = escapeHtml(input);
    expect(result).not.toContain('<script>');
    expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });
});

// ---------------------------------------------------------------------------
// isLegacyHash
// ---------------------------------------------------------------------------

describe('isLegacyHash', () => {
  it('returns true for hash without colon (legacy SHA-256)', () => {
    expect(isLegacyHash('dGhpcyBpcyBhIGhhc2g=')).toBe(true);
  });

  it('returns false for PBKDF2 hash with colon separator', () => {
    expect(isLegacyHash('c2FsdA==:aGFzaA==')).toBe(false);
  });

  it('returns true for empty string (no colon)', () => {
    expect(isLegacyHash('')).toBe(true);
  });

  it('returns false for string with multiple colons', () => {
    expect(isLegacyHash('a:b:c')).toBe(false);
  });
});
