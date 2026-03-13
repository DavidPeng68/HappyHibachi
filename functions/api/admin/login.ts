/**
 * Admin Login API
 * POST /api/admin/login - Authenticate admin
 */

import { createToken, getCorsHeaders } from '../_auth';

interface Env {
	ADMIN_PASSWORD: string;
	ALLOWED_ORIGINS?: string;
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

		const { password } = await context.request.json() as { password: string };

		if (password === adminPassword) {
			const token = await createToken(adminPassword);
			return new Response(
				JSON.stringify({ success: true, token }),
				{ headers: corsHeaders }
			);
		}

		return new Response(
			JSON.stringify({ success: false, error: 'Invalid password' }),
			{ status: 401, headers: corsHeaders }
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
