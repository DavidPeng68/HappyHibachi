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
	'/api/newsletter': { maxRequests: 5, windowSeconds: 60 },
	'/api/referral': { maxRequests: 10, windowSeconds: 60 },
	'/api/photos': { maxRequests: 5, windowSeconds: 300 },
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
	if (!config) return null;

	const ip = getClientIP(request);
	const key = `ratelimit:${ip}:${endpoint}`;

	try {
		const existing = await kv.get(key, 'json') as RateLimitEntry | null;
		const now = Date.now();

		if (existing && now < existing.resetAt) {
			if (existing.count >= config.maxRequests) {
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
				expirationTtl: config.windowSeconds,
			});
		} else {
			await kv.put(key, JSON.stringify({ count: 1, resetAt: now + config.windowSeconds * 1000 }), {
				expirationTtl: config.windowSeconds,
			});
		}
	} catch (err) {
		console.error('Rate limit check error:', err);
	}

	return null;
}
