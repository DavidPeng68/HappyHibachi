/**
 * Admin Audit Log API
 * GET /api/admin/audit-log - Fetch audit log entries
 */

import { validateToken, requireSuperAdmin, getCorsHeaders } from '../_auth';
import type { AuditLogEntry } from '../_auditLog';

interface Env {
	BOOKINGS: KVNamespace;
	ADMIN_PASSWORD?: string;
	ALLOWED_ORIGINS?: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);

	const authHeader = context.request.headers.get('Authorization');
	const auth = await validateToken(authHeader, context.env);
	const denied = requireSuperAdmin(auth, corsHeaders);
	if (denied) return denied;

	try {
		const data = await context.env.BOOKINGS.get('audit_log', 'json');
		const entries: AuditLogEntry[] = (data as AuditLogEntry[]) || [];

		return new Response(
			JSON.stringify({ success: true, entries }),
			{ headers: corsHeaders },
		);
	} catch (error) {
		console.error('Fetch audit log error:', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to fetch audit log' }),
			{ status: 500, headers: corsHeaders },
		);
	}
};

export const onRequestOptions: PagesFunction<Env> = async (context) => {
	return new Response(null, {
		status: 204,
		headers: getCorsHeaders(context.request, context.env),
	});
};
