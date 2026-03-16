/**
 * Token Refresh API
 * POST /api/admin/refresh - Issue a new token if the current one is still valid
 */

import { validateToken, createToken, getCorsHeaders } from '../_auth';

interface Env {
	ADMIN_PASSWORD: string;
	ALLOWED_ORIGINS?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);

	const authHeader = context.request.headers.get('Authorization');
	const auth = await validateToken(authHeader, context.env);

	if (!auth.valid || !auth.role || !auth.userId) {
		return new Response(
			JSON.stringify({ success: false, error: 'Invalid or expired token' }),
			{ status: 401, headers: corsHeaders }
		);
	}

	try {
		const newToken = await createToken(context.env.ADMIN_PASSWORD, auth.role, auth.userId);
		return new Response(
			JSON.stringify({ success: true, token: newToken }),
			{ headers: corsHeaders }
		);
	} catch {
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to refresh token' }),
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
