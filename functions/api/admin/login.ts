/**
 * Admin Login API
 * POST /api/admin/login - Authenticate admin
 *
 * Supports two login modes:
 * 1. Password-only (no username) → checks ADMIN_PASSWORD env var → super_admin
 * 2. Username + password → checks admin_users in KV → role from user record
 */

import { createToken, getCorsHeaders, hashPassword, hashPasswordPBKDF2, verifyPasswordPBKDF2, isLegacyHash, logAuditEvent } from '../_auth';
import { checkRateLimit, checkLoginLockout, recordFailedLogin, clearLoginLockout } from '../_rateLimit';

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

	const rateLimited = await checkRateLimit(context.request, context.env.BOOKINGS, corsHeaders);
	if (rateLimited) return rateLimited;

	const locked = await checkLoginLockout(context.request, context.env.BOOKINGS, corsHeaders);
	if (locked) return locked;

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
				await clearLoginLockout(context.request, context.env.BOOKINGS);
				const token = await createToken(adminPassword, 'super_admin', '__env__');
				logAuditEvent('login_success', '__env__', context.request, { method: 'env_password' });
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

			await recordFailedLogin(context.request, context.env.BOOKINGS);
			logAuditEvent('login_failure', 'anonymous', context.request, { method: 'env_password' });
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
			await recordFailedLogin(context.request, context.env.BOOKINGS);
			logAuditEvent('login_failure', username.trim(), context.request, { reason: 'user_not_found' });
			return new Response(
				JSON.stringify({ success: false, error: 'Invalid username or password' }),
				{ status: 401, headers: corsHeaders }
			);
		}

		// Check password — transparent PBKDF2 migration
		let passwordValid = false;
		if (isLegacyHash(user.passwordHash)) {
			// Legacy SHA-256 hash — verify and migrate
			const legacyHash = await hashPassword(password, user.username);
			if (legacyHash === user.passwordHash) {
				passwordValid = true;
				// Migrate to PBKDF2
				user.passwordHash = await hashPasswordPBKDF2(password, user.username);
				const userIdx = users.findIndex(u => u.id === user.id);
				if (userIdx !== -1) {
					users[userIdx] = user;
					await context.env.BOOKINGS.put('admin_users', JSON.stringify(users));
				}
			}
		} else {
			passwordValid = await verifyPasswordPBKDF2(password, user.username, user.passwordHash);
		}

		if (!passwordValid) {
			await recordFailedLogin(context.request, context.env.BOOKINGS);
			logAuditEvent('login_failure', username.trim(), context.request, { reason: 'invalid_password' });
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

		await clearLoginLockout(context.request, context.env.BOOKINGS);
		const token = await createToken(adminPassword, user.role, user.id);
		logAuditEvent('login_success', user.id, context.request, { role: user.role, username: user.username });
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
