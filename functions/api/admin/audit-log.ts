/**
 * Admin Audit Log API
 * GET /api/admin/audit-log - Fetch audit log entries
 */

import { validateToken, requireSuperAdmin, getCorsHeaders } from '../_auth';
import type { AuditLogEntry } from '../_auditLog';
import { paginateArray, parsePaginationParams } from '../_kvHelpers';

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
		const url = new URL(context.request.url);
		const { page, pageSize } = parsePaginationParams(url, { pageSize: 50 });
		const entity = url.searchParams.get('entity') || '';
		const dateFrom = url.searchParams.get('dateFrom') || '';
		const dateTo = url.searchParams.get('dateTo') || '';

		const data = await context.env.BOOKINGS.get('audit_log', 'json');
		let entries: AuditLogEntry[] = (data as AuditLogEntry[]) || [];

		// Apply filters
		if (entity) {
			entries = entries.filter(e => e.entity === entity);
		}
		if (dateFrom) {
			entries = entries.filter(e => e.createdAt >= dateFrom);
		}
		if (dateTo) {
			// Include the entire day for dateTo
			const dateToEnd = dateTo.length === 10 ? dateTo + 'T23:59:59.999Z' : dateTo;
			entries = entries.filter(e => e.createdAt <= dateToEnd);
		}

		// Paginate
		const result = paginateArray(entries, page, pageSize);

		return new Response(
			JSON.stringify({
				success: true,
				entries: result.data,
				data: result.data,
				total: result.total,
				page: result.page,
				pageSize: result.pageSize,
			}),
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
