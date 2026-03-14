/**
 * Admin User Management API
 * GET    /api/admin/users - List all users (super_admin only)
 * POST   /api/admin/users - Create a user (super_admin only)
 * PATCH  /api/admin/users - Update a user (super_admin only)
 * DELETE /api/admin/users - Delete a user (super_admin only)
 */

import { validateToken, requireSuperAdmin, getCorsHeaders, hashPassword } from '../_auth';
import { logAction } from '../_auditLog';

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

async function getUsers(kv: KVNamespace): Promise<AdminUser[]> {
	const data = await kv.get('admin_users');
	return data ? JSON.parse(data) : [];
}

async function saveUsers(kv: KVNamespace, users: AdminUser[]): Promise<void> {
	await kv.put('admin_users', JSON.stringify(users));
}

// GET - List all users
export const onRequestGet: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);
	const authHeader = context.request.headers.get('Authorization');
	const auth = await validateToken(authHeader, context.env);
	const denied = requireSuperAdmin(auth, corsHeaders);
	if (denied) return denied;

	try {
		const users = await getUsers(context.env.BOOKINGS);
		const url = new URL(context.request.url);
		const statusFilter = url.searchParams.get('status');

		let filtered = users;
		if (statusFilter) {
			filtered = users.filter(u => u.status === statusFilter);
		}

		// Strip passwordHash before returning
		const safeUsers = filtered.map(({ passwordHash, ...rest }) => rest);

		return new Response(
			JSON.stringify({ success: true, users: safeUsers }),
			{ headers: corsHeaders }
		);
	} catch (error) {
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to fetch users' }),
			{ status: 500, headers: corsHeaders }
		);
	}
};

// POST - Create a new user
export const onRequestPost: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);
	const authHeader = context.request.headers.get('Authorization');
	const auth = await validateToken(authHeader, context.env);
	const denied = requireSuperAdmin(auth, corsHeaders);
	if (denied) return denied;

	try {
		const body = await context.request.json() as {
			username: string;
			password: string;
			displayName: string;
			role?: 'super_admin' | 'order_manager';
		};

		if (!body.username?.trim() || !body.password?.trim() || !body.displayName?.trim()) {
			return new Response(
				JSON.stringify({ success: false, error: 'Missing required fields' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		const users = await getUsers(context.env.BOOKINGS);
		const username = body.username.trim();

		if (users.some(u => u.username === username)) {
			return new Response(
				JSON.stringify({ success: false, error: 'Username already taken' }),
				{ status: 409, headers: corsHeaders }
			);
		}

		const newUser: AdminUser = {
			id: crypto.randomUUID(),
			username,
			passwordHash: await hashPassword(body.password, username),
			role: body.role || 'order_manager',
			displayName: body.displayName.trim(),
			enabled: true,
			status: 'approved',
			createdAt: new Date().toISOString(),
			createdBy: auth.userId || '__env__',
		};

		users.push(newUser);
		await saveUsers(context.env.BOOKINGS, users);

		await logAction(context.env.BOOKINGS, {
			action: 'created',
			entity: 'user',
			entityId: newUser.id,
			details: `Created user "${newUser.displayName}" (${newUser.username}) with role ${newUser.role}`,
			performedBy: auth.userId === '__env__' ? 'Admin' : (auth.userId || 'admin'),
		});

		const { passwordHash, ...safeUser } = newUser;
		return new Response(
			JSON.stringify({ success: true, user: safeUser }),
			{ headers: corsHeaders }
		);
	} catch (error) {
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to create user' }),
			{ status: 500, headers: corsHeaders }
		);
	}
};

// PATCH - Update a user
export const onRequestPatch: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);
	const authHeader = context.request.headers.get('Authorization');
	const auth = await validateToken(authHeader, context.env);
	const denied = requireSuperAdmin(auth, corsHeaders);
	if (denied) return denied;

	try {
		const body = await context.request.json() as {
			id: string;
			displayName?: string;
			password?: string;
			enabled?: boolean;
			status?: 'approved' | 'rejected';
			role?: 'super_admin' | 'order_manager';
		};

		if (!body.id) {
			return new Response(
				JSON.stringify({ success: false, error: 'User ID required' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		const users = await getUsers(context.env.BOOKINGS);
		const idx = users.findIndex(u => u.id === body.id);

		if (idx === -1) {
			return new Response(
				JSON.stringify({ success: false, error: 'User not found' }),
				{ status: 404, headers: corsHeaders }
			);
		}

		const user = users[idx];
		const changes: string[] = [];

		if (body.displayName !== undefined) {
			user.displayName = body.displayName.trim();
			changes.push('displayName');
		}
		if (body.password !== undefined) {
			user.passwordHash = await hashPassword(body.password, user.username);
			changes.push('password');
		}
		if (body.enabled !== undefined) {
			user.enabled = body.enabled;
			changes.push(`enabled=${body.enabled}`);
		}
		if (body.status !== undefined) {
			user.status = body.status;
			changes.push(`status=${body.status}`);
		}
		if (body.role !== undefined) {
			user.role = body.role;
			changes.push(`role=${body.role}`);
		}

		users[idx] = user;
		await saveUsers(context.env.BOOKINGS, users);

		await logAction(context.env.BOOKINGS, {
			action: 'updated',
			entity: 'user',
			entityId: user.id,
			details: `Updated user "${user.displayName}" (${user.username}): ${changes.join(', ')}`,
			performedBy: auth.userId === '__env__' ? 'Admin' : (auth.userId || 'admin'),
		});

		const { passwordHash, ...safeUser } = user;
		return new Response(
			JSON.stringify({ success: true, user: safeUser }),
			{ headers: corsHeaders }
		);
	} catch (error) {
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to update user' }),
			{ status: 500, headers: corsHeaders }
		);
	}
};

// DELETE - Delete a user
export const onRequestDelete: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);
	const authHeader = context.request.headers.get('Authorization');
	const auth = await validateToken(authHeader, context.env);
	const denied = requireSuperAdmin(auth, corsHeaders);
	if (denied) return denied;

	try {
		const url = new URL(context.request.url);
		const userId = url.searchParams.get('id');

		if (!userId) {
			return new Response(
				JSON.stringify({ success: false, error: 'User ID required' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		const users = await getUsers(context.env.BOOKINGS);
		const user = users.find(u => u.id === userId);

		if (!user) {
			return new Response(
				JSON.stringify({ success: false, error: 'User not found' }),
				{ status: 404, headers: corsHeaders }
			);
		}

		const filtered = users.filter(u => u.id !== userId);
		await saveUsers(context.env.BOOKINGS, filtered);

		await logAction(context.env.BOOKINGS, {
			action: 'deleted',
			entity: 'user',
			entityId: userId,
			details: `Deleted user "${user.displayName}" (${user.username})`,
			performedBy: auth.userId === '__env__' ? 'Admin' : (auth.userId || 'admin'),
		});

		return new Response(
			JSON.stringify({ success: true }),
			{ headers: corsHeaders }
		);
	} catch (error) {
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to delete user' }),
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
