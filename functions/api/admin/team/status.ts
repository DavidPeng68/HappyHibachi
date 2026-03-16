import { validateToken, requireSuperAdmin, getCorsHeaders } from '../../_auth';
import { trackActivity } from '../../_activity';

interface Env {
	BOOKINGS: KVNamespace;
	ADMIN_PASSWORD?: string;
	ALLOWED_ORIGINS?: string;
}

interface AdminUser {
	id: string;
	username: string;
	displayName: string;
	role: string;
	enabled: boolean;
	status: string;
}

interface ActivityData {
	lastSeenAt: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
	const { request, env } = context;
	const corsHeaders = getCorsHeaders(request, env);

	if (request.method === 'OPTIONS') {
		return new Response(null, { headers: corsHeaders });
	}

	const auth = await validateToken(request.headers.get('Authorization'), env);
	const blocked = requireSuperAdmin(auth, corsHeaders);
	if (blocked) return blocked;

	if (auth.userId) {
		context.waitUntil(trackActivity(env.BOOKINGS, auth.userId));
	}

	if (request.method !== 'GET') {
		return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
			status: 405, headers: corsHeaders,
		});
	}

	try {
		const usersRaw = await env.BOOKINGS.get('admin_users', 'json') as AdminUser[] | null;
		const users = usersRaw || [];
		const activeUsers = users.filter(u => u.enabled && u.status === 'approved');

		const statuses = await Promise.all(
			activeUsers.map(async (u) => {
				const activity = await env.BOOKINGS.get(`user_activity:${u.id}`, 'json') as ActivityData | null;
				const lastSeenAt = activity?.lastSeenAt || null;
				const isOnline = lastSeenAt
					? (Date.now() - new Date(lastSeenAt).getTime()) < 5 * 60 * 1000
					: false;
				return {
					id: u.id,
					displayName: u.displayName,
					role: u.role,
					lastSeenAt,
					isOnline,
				};
			})
		);

		return new Response(JSON.stringify({ success: true, users: statuses }), {
			headers: corsHeaders,
		});
	} catch (err) {
		return new Response(JSON.stringify({ success: false, error: 'Internal error' }), {
			status: 500, headers: corsHeaders,
		});
	}
};
