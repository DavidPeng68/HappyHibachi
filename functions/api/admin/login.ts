/**
 * Admin Login API
 * POST /api/admin/login - Authenticate admin
 *
 * Supports two login modes:
 * 1. Password-only (no username) → checks ADMIN_PASSWORD env var → super_admin
 * 2. Username + password → checks admin_users in KV → role from user record
 */

import { createToken, getCorsHeaders, hashPassword } from '../_auth';

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

	try {
		const adminPassword = context.env.ADMIN_PASSWORD;
		if (!adminPassword) {
			return new Response(
				JSON.stringify({ success: false, error: 'Server misconfigured' }),
				{ status: 500, headers: corsHeaders }
			);
		}

		const body = await context.request.json() as { username?: string; password: string };
		const { username, password } = body;

		// Mode 1: Password-only login (super admin via env var)
		if (!username || username.trim() === '') {
			if (password === adminPassword) {
				const token = await createToken(adminPassword, 'super_admin', '__env__');
				return new Response(
					JSON.stringify({
						success: true,
						token,
						role: 'super_admin',
						userId: '__env__',
						displayName: 'Admin',
					}),
					{ headers: corsHeaders }
				);
			}

			return new Response(
				JSON.stringify({ success: false, error: 'Invalid password' }),
				{ status: 401, headers: corsHeaders }
			);
		}

		// Mode 2: Username + password login (from KV admin_users)
		const usersJson = await context.env.BOOKINGS.get('admin_users');
		const users: AdminUser[] = usersJson ? JSON.parse(usersJson) : [];
		const user = users.find(u => u.username === username.trim());

		if (!user) {
			return new Response(
				JSON.stringify({ success: false, error: 'Invalid username or password' }),
				{ status: 401, headers: corsHeaders }
			);
		}

		// Check password
		const inputHash = await hashPassword(password, user.username);
		if (inputHash !== user.passwordHash) {
			return new Response(
				JSON.stringify({ success: false, error: 'Invalid username or password' }),
				{ status: 401, headers: corsHeaders }
			);
		}

		// Check account status
		if (user.status === 'pending') {
			return new Response(
				JSON.stringify({ success: false, error: 'Account pending approval' }),
				{ status: 403, headers: corsHeaders }
			);
		}

		if (user.status === 'rejected') {
			return new Response(
				JSON.stringify({ success: false, error: 'Account has been rejected' }),
				{ status: 403, headers: corsHeaders }
			);
		}

		if (!user.enabled) {
			return new Response(
				JSON.stringify({ success: false, error: 'Account is disabled' }),
				{ status: 403, headers: corsHeaders }
			);
		}

		const token = await createToken(adminPassword, user.role, user.id);
		return new Response(
			JSON.stringify({
				success: true,
				token,
				role: user.role,
				userId: user.id,
				displayName: user.displayName,
			}),
			{ headers: corsHeaders }
		);
	} catch (error) {
		return new Response(
			JSON.stringify({ success: false, error: 'Login failed' }),
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
