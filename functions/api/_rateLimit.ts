/**
 * KV-based rate limiting for public API endpoints.
 * Tracks request counts per IP per endpoint using sliding windows.
 */

interface RateLimitConfig {
	maxRequests: number;
	windowSeconds: number;
}

interface RateLimitEntry {
	count: number;
	resetAt: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
	'/api/booking': { maxRequests: 10, windowSeconds: 60 },
	'/api/estimate': { maxRequests: 10, windowSeconds: 60 },
	'/api/lookup': { maxRequests: 30, windowSeconds: 60 },
	'/api/coupons': { maxRequests: 30, windowSeconds: 60 },
	'/api/reviews': { maxRequests: 30, windowSeconds: 60 },
	'/api/calendar': { maxRequests: 30, windowSeconds: 60 },
	'/api/newsletter': { maxRequests: 5, windowSeconds: 60 },
	'/api/referral': { maxRequests: 10, windowSeconds: 60 },
	'/api/photos': { maxRequests: 5, windowSeconds: 300 },
	'/api/admin/login': { maxRequests: 5, windowSeconds: 300 },
	'/api/admin/register': { maxRequests: 5, windowSeconds: 3600 },
};

function getClientIP(request: Request): string {
	return request.headers.get('CF-Connecting-IP')
		|| request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
		|| 'unknown';
}

export async function checkRateLimit(
	request: Request,
	kv: KVNamespace,
	corsHeaders: Record<string, string>
): Promise<Response | null> {
	const url = new URL(request.url);
	const endpoint = url.pathname;

	const config = RATE_LIMITS[endpoint];
	// Fallback rate limit for all admin endpoints
	const effectiveConfig = config || (endpoint.startsWith('/api/admin/') ? { maxRequests: 60, windowSeconds: 60 } : null);
	if (!effectiveConfig) return null;

	const ip = getClientIP(request);
	const key = `ratelimit:${ip}:${endpoint}`;

	try {
		const existing = await kv.get(key, 'json') as RateLimitEntry | null;
		const now = Date.now();

		if (existing && now < existing.resetAt) {
			if (existing.count >= effectiveConfig.maxRequests) {
				const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
				return new Response(
					JSON.stringify({
						success: false,
						error: 'Too many requests. Please try again later.',
					}),
					{
						status: 429,
						headers: {
							...corsHeaders,
							'Retry-After': String(retryAfter),
						},
					}
				);
			}
			await kv.put(key, JSON.stringify({ count: existing.count + 1, resetAt: existing.resetAt }), {
				expirationTtl: effectiveConfig.windowSeconds,
			});
		} else {
			await kv.put(key, JSON.stringify({ count: 1, resetAt: now + effectiveConfig.windowSeconds * 1000 }), {
				expirationTtl: effectiveConfig.windowSeconds,
			});
		}
	} catch (err) {
		console.error('Rate limit check error:', err);
	}

	return null;
}

const LOCKOUT_MAX_FAILURES = 10;
const LOCKOUT_DURATION_SECONDS = 1800; // 30 minutes

export async function checkLoginLockout(
	request: Request,
	kv: KVNamespace,
	corsHeaders: Record<string, string>
): Promise<Response | null> {
	const ip = getClientIP(request);
	const key = `lockout:${ip}`;

	try {
		const entry = await kv.get(key, 'json') as { failures: number } | null;
		if (entry && entry.failures >= LOCKOUT_MAX_FAILURES) {
			return new Response(
				JSON.stringify({
					success: false,
					error: 'Too many failed attempts. Account temporarily locked.',
				}),
				{
					status: 429,
					headers: {
						...corsHeaders,
						'Retry-After': String(LOCKOUT_DURATION_SECONDS),
					},
				}
			);
		}
	} catch {
		// Don't block login if lockout check fails
	}

	return null;
}

export async function recordFailedLogin(
	request: Request,
	kv: KVNamespace
): Promise<void> {
	const ip = getClientIP(request);
	const key = `lockout:${ip}`;

	try {
		const entry = await kv.get(key, 'json') as { failures: number } | null;
		const failures = (entry?.failures || 0) + 1;
		await kv.put(key, JSON.stringify({ failures }), {
			expirationTtl: LOCKOUT_DURATION_SECONDS,
		});
	} catch {
		// Best-effort
	}
}

export async function clearLoginLockout(
	request: Request,
	kv: KVNamespace
): Promise<void> {
	const ip = getClientIP(request);
	const key = `lockout:${ip}`;
	try {
		await kv.delete(key);
	} catch {
		// Best-effort
	}
}
