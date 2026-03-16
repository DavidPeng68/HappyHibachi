/**
 * Admin Self-Registration API
 * POST /api/admin/register - Register as an order manager (public, no auth)
 *
 * Creates a user with status='pending'. Must be approved by a super_admin.
 */

import { getCorsHeaders, hashPasswordPBKDF2 } from '../_auth';

interface AdminUser {
	id: string;
	username: string;
	passwordHash: string;
	role: 'super_admin' | 'order_manager';
	displayName: string;
	enabled: boolean;
	status: 'pending' | 'approved' | 'rejected';
	createdAt: string;
	createdBy: string;
}

interface Env {
	ADMIN_PASSWORD: string;
	ALLOWED_ORIGINS?: string;
	BOOKINGS: KVNamespace;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);

	// Simple rate limiting via KV
	const ip = context.request.headers.get('CF-Connecting-IP')
		|| context.request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
		|| 'unknown';
	const rateLimitKey = `ratelimit:${ip}:/api/admin/register`;

	try {
		const existing = await context.env.BOOKINGS.get(rateLimitKey, 'json') as { count: number; resetAt: number } | null;
		const now = Date.now();
		if (existing && now < existing.resetAt && existing.count >= 5) {
			return new Response(
				JSON.stringify({ success: false, error: 'Too many requests. Please try again later.' }),
				{ status: 429, headers: corsHeaders }
			);
		}
		const count = (existing && now < existing.resetAt) ? existing.count + 1 : 1;
		const resetAt = (existing && now < existing.resetAt) ? existing.resetAt : now + 3600_000;
		await context.env.BOOKINGS.put(rateLimitKey, JSON.stringify({ count, resetAt }), { expirationTtl: 3600 });
	} catch {
		// Don't block registration if rate limit check fails
	}

	try {
		const body = await context.request.json() as {
			username: string;
			password: string;
			displayName: string;
		};

		if (!body.username?.trim() || !body.password?.trim() || !body.displayName?.trim()) {
			return new Response(
				JSON.stringify({ success: false, error: 'Missing required fields' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		const username = body.username.trim();

		if (username.length < 3 || username.length > 30) {
			return new Response(
				JSON.stringify({ success: false, error: 'Username must be 3-30 characters' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		if (body.password.length < 8 || !/[A-Z]/.test(body.password) || !/[a-z]/.test(body.password) || !/[0-9]/.test(body.password)) {
			return new Response(
				JSON.stringify({ success: false, error: 'Password must be at least 8 characters with uppercase, lowercase, and number' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		const usersJson = await context.env.BOOKINGS.get('admin_users');
		const users: AdminUser[] = usersJson ? JSON.parse(usersJson) : [];

		if (users.some(u => u.username === username)) {
			// Return same success response to prevent username enumeration
			return new Response(
				JSON.stringify({ success: true, message: 'Registration submitted. Please wait for admin approval.' }),
				{ headers: corsHeaders }
			);
		}

		const newUser: AdminUser = {
			id: crypto.randomUUID(),
			username,
			passwordHash: await hashPasswordPBKDF2(body.password, username),
			role: 'order_manager',
			displayName: body.displayName.trim(),
			enabled: true,
			status: 'pending',
			createdAt: new Date().toISOString(),
			createdBy: 'self',
		};

		users.push(newUser);
		await context.env.BOOKINGS.put('admin_users', JSON.stringify(users));

		return new Response(
			JSON.stringify({ success: true, message: 'Registration submitted. Please wait for admin approval.' }),
			{ headers: corsHeaders }
		);
	} catch (error) {
		return new Response(
			JSON.stringify({ success: false, error: 'Registration failed' }),
			{ status: 500, headers: corsHeaders }
		);
	}
};

export const onRequestOptions: PagesFunction<Env> = async (context) => {
	return new Response(null, {
		status: 204,
		headers: getCorsHeaders(context.request, context.env),
	});
};
