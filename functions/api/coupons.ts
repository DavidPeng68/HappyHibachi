/**
 * Coupons API - Coupon Management
 * GET /api/coupons - Get coupons (public: validate code, admin: list all)
 * POST /api/coupons - Create coupon (admin only)
 * PATCH /api/coupons - Update coupon (admin only)
 * DELETE /api/coupons - Delete coupon (admin only)
 */

interface Coupon {
	id: string;
	code: string;
	type: 'percentage' | 'fixed';
	value: number;
	minGuests: number;
	maxUses: number;
	usedCount: number;
	usedByBookings: string[];
	validFrom: string;
	validUntil: string;
	enabled: boolean;
	createdAt: string;
}

interface Env {
	BOOKINGS: KVNamespace;
	ADMIN_PASSWORD?: string;
	ALLOWED_ORIGINS?: string;
}

import { validateToken, requireSuperAdmin, getCorsHeaders } from './_auth';
import { checkRateLimit } from './_rateLimit';
import { logAction } from './_auditLog';
import { validateStringLength, validateDateRange } from './_validation';
import { paginateArray, parsePaginationParams } from './_kvHelpers';

// GET - Get coupons
export const onRequestGet: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);
	const url = new URL(context.request.url);
	const code = url.searchParams.get('code');

	if (code) {
		const rateLimited = await checkRateLimit(context.request, context.env.BOOKINGS, corsHeaders);
		if (rateLimited) return rateLimited;
	}

	try {
		const couponsData = await context.env.BOOKINGS.get('coupons_list', 'json');
		const coupons: Coupon[] = (couponsData as Coupon[]) || [];

		if (code) {
			const coupon = coupons.find(
				(c) => c.code.toLowerCase() === code.toLowerCase() && c.enabled
			);

			if (!coupon) {
				return new Response(
					JSON.stringify({ success: false, error: 'Invalid coupon code' }),
					{ status: 404, headers: corsHeaders }
				);
			}

			const now = new Date();
			const validFrom = new Date(coupon.validFrom);
			const validUntil = new Date(coupon.validUntil + 'T23:59:59');

			if (now < validFrom || now > validUntil) {
				return new Response(
					JSON.stringify({ success: false, error: 'Coupon code has expired' }),
					{ status: 400, headers: corsHeaders }
				);
			}

			if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
				return new Response(
					JSON.stringify({ success: false, error: 'Coupon usage limit reached' }),
					{ status: 400, headers: corsHeaders }
				);
			}

			return new Response(
				JSON.stringify({
					success: true,
					coupon: {
						code: coupon.code,
						type: coupon.type,
						value: coupon.value,
						minGuests: coupon.minGuests,
					},
				}),
				{ headers: corsHeaders }
			);
		}

		const authHeader = context.request.headers.get('Authorization');
		if (!(await validateToken(authHeader, context.env)).valid) {
			return new Response(
				JSON.stringify({ success: false, error: 'Unauthorized' }),
				{ status: 401, headers: corsHeaders }
			);
		}

		// Admin path: apply pagination and filters
		const { page, pageSize, search } = parsePaginationParams(url);
		const enabledParam = url.searchParams.get('enabled');

		let filtered = coupons;
		if (search) {
			filtered = filtered.filter(c => c.code?.toLowerCase().includes(search));
		}
		if (enabledParam !== null && enabledParam !== '') {
			const enabledVal = enabledParam === 'true';
			filtered = filtered.filter(c => c.enabled === enabledVal);
		}

		const result = paginateArray(filtered, page, pageSize);

		return new Response(
			JSON.stringify({
				success: true,
				coupons: result.data,
				data: result.data,
				total: result.total,
				page: result.page,
				pageSize: result.pageSize,
			}),
			{ headers: corsHeaders }
		);
	} catch (error) {
		console.error('Get coupons error:', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to get coupons' }),
			{ status: 500, headers: corsHeaders }
		);
	}
};

// POST - Create coupon
export const onRequestPost: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);
	const authHeader = context.request.headers.get('Authorization');
	const auth = await validateToken(authHeader, context.env);
	const denied = requireSuperAdmin(auth, corsHeaders);
	if (denied) return denied;

	try {
		const body = (await context.request.json()) as Partial<Coupon>;

		if (!body.code || !body.type || body.value === undefined) {
			return new Response(
				JSON.stringify({ success: false, error: 'Missing required fields' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		// Validate code length
		const codeErr = validateStringLength(body.code, 'code', 30, 1);
		if (codeErr) {
			return new Response(
				JSON.stringify({ success: false, error: codeErr }),
				{ status: 400, headers: corsHeaders }
			);
		}

		// Validate value range
		if (body.type === 'percentage' && (body.value < 0 || body.value > 100)) {
			return new Response(
				JSON.stringify({ success: false, error: 'Percentage value must be between 0 and 100' }),
				{ status: 400, headers: corsHeaders }
			);
		}
		if (body.type === 'fixed' && (body.value < 0 || body.value > 10000)) {
			return new Response(
				JSON.stringify({ success: false, error: 'Fixed value must be between 0 and 10000' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		// Validate date range
		if (body.validFrom && body.validUntil) {
			const dateErr = validateDateRange(body.validFrom, body.validUntil);
			if (dateErr) {
				return new Response(
					JSON.stringify({ success: false, error: dateErr }),
					{ status: 400, headers: corsHeaders }
				);
			}
		}

		const couponsData = await context.env.BOOKINGS.get('coupons_list', 'json');
		const coupons: Coupon[] = (couponsData as Coupon[]) || [];

		if (coupons.some((c) => c.code.toLowerCase() === body.code!.toLowerCase())) {
			return new Response(
				JSON.stringify({ success: false, error: 'Coupon code already exists' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		const newCoupon: Coupon = {
			id: crypto.randomUUID(),
			code: body.code.toUpperCase(),
			type: body.type,
			value: body.value,
			minGuests: body.minGuests || 0,
			maxUses: body.maxUses || 0,
			usedCount: 0,
			usedByBookings: [],
			validFrom: body.validFrom || new Date().toISOString().split('T')[0],
			validUntil: body.validUntil || '2099-12-31',
			enabled: body.enabled !== false,
			createdAt: new Date().toISOString(),
		};

		coupons.unshift(newCoupon);
		await context.env.BOOKINGS.put('coupons_list', JSON.stringify(coupons));

		// Audit log
		logAction(context.env.BOOKINGS, {
			action: 'created',
			entity: 'coupon',
			entityId: newCoupon.id,
			details: `Created coupon ${newCoupon.code} (${newCoupon.type} ${newCoupon.value})`,
			performedBy: 'admin',
		}).catch(() => {});

		return new Response(
			JSON.stringify({ success: true, coupon: newCoupon }),
			{ headers: corsHeaders }
		);
	} catch (error) {
		console.error('Create coupon error:', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to create coupon' }),
			{ status: 500, headers: corsHeaders }
		);
	}
};

// PATCH - Update coupon (admin only)
export const onRequestPatch: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);

	const authHeader = context.request.headers.get('Authorization');
	const auth = await validateToken(authHeader, context.env);
	const denied = requireSuperAdmin(auth, corsHeaders);
	if (denied) return denied;

	try {
		const body = (await context.request.json()) as Partial<Coupon> & { id?: string };

		const couponsData = await context.env.BOOKINGS.get('coupons_list', 'json');
		let coupons: Coupon[] = (couponsData as Coupon[]) || [];

		if (!body.id) {
			return new Response(
				JSON.stringify({ success: false, error: 'Coupon ID is required' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		const index = coupons.findIndex((c) => c.id === body.id);
		if (index === -1) {
			return new Response(
				JSON.stringify({ success: false, error: 'Coupon not found' }),
				{ status: 404, headers: corsHeaders }
			);
		}

		coupons[index] = {
			...coupons[index],
			...(body.code && { code: body.code.toUpperCase() }),
			...(body.type && { type: body.type }),
			...(body.value !== undefined && { value: body.value }),
			...(body.minGuests !== undefined && { minGuests: body.minGuests }),
			...(body.maxUses !== undefined && { maxUses: body.maxUses }),
			...(body.validFrom && { validFrom: body.validFrom }),
			...(body.validUntil && { validUntil: body.validUntil }),
			...(body.enabled !== undefined && { enabled: body.enabled }),
		};

		await context.env.BOOKINGS.put('coupons_list', JSON.stringify(coupons));

		// Audit log
		logAction(context.env.BOOKINGS, {
			action: 'updated',
			entity: 'coupon',
			entityId: body.id!,
			details: `Updated coupon ${coupons[index].code}`,
			performedBy: 'admin',
		}).catch(() => {});

		return new Response(
			JSON.stringify({ success: true, coupon: coupons[index] }),
			{ headers: corsHeaders }
		);
	} catch (error) {
		console.error('Update coupon error:', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to update coupon' }),
			{ status: 500, headers: corsHeaders }
		);
	}
};

// DELETE - Delete coupon
export const onRequestDelete: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);
	const authHeader = context.request.headers.get('Authorization');
	const auth = await validateToken(authHeader, context.env);
	const denied = requireSuperAdmin(auth, corsHeaders);
	if (denied) return denied;

	try {
		const { id } = (await context.request.json()) as { id: string };

		if (!id) {
			return new Response(
				JSON.stringify({ success: false, error: 'Coupon ID is required' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		const couponsData = await context.env.BOOKINGS.get('coupons_list', 'json');
		let coupons: Coupon[] = (couponsData as Coupon[]) || [];

		const originalLength = coupons.length;
		coupons = coupons.filter((c) => c.id !== id);

		if (coupons.length === originalLength) {
			return new Response(
				JSON.stringify({ success: false, error: 'Coupon not found' }),
				{ status: 404, headers: corsHeaders }
			);
		}

		await context.env.BOOKINGS.put('coupons_list', JSON.stringify(coupons));

		// Audit log
		logAction(context.env.BOOKINGS, {
			action: 'deleted',
			entity: 'coupon',
			entityId: id,
			details: `Deleted coupon (ID: ${id})`,
			performedBy: 'admin',
		}).catch(() => {});

		return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
	} catch (error) {
		console.error('Delete coupon error:', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to delete coupon' }),
			{ status: 500, headers: corsHeaders }
		);
	}
};

export const onRequestOptions: PagesFunction<Env> = async (context) => {
	return new Response(null, { status: 204, headers: getCorsHeaders(context.request, context.env) });
};



