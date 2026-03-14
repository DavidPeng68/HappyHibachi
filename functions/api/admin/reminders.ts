/**
 * Admin Reminders API (Stub)
 * GET /api/admin/reminders - 获取提醒状态
 * POST /api/admin/reminders - 发送提醒
 */

import { validateToken, requireSuperAdmin, getCorsHeaders } from '../_auth';

interface Env {
	BOOKINGS: KVNamespace;
	ADMIN_PASSWORD: string;
	ALLOWED_ORIGINS?: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);
	return new Response(
		JSON.stringify({ success: true, pendingReminders: 0, alreadyReminded: 0 }),
		{ headers: corsHeaders }
	);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);

	const authHeader = context.request.headers.get('Authorization');
	const auth = await validateToken(authHeader, context.env);
	const denied = requireSuperAdmin(auth, corsHeaders);
	if (denied) return denied;

	return new Response(
		JSON.stringify({ success: true, processed: 0 }),
		{ headers: corsHeaders }
	);
};

export const onRequestOptions: PagesFunction<Env> = async (context) => {
	return new Response(null, {
		status: 204,
		headers: getCorsHeaders(context.request, context.env),
	});
};
