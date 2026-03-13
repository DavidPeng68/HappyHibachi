/**
 * Coupons API - 优惠码管理
 * GET /api/coupons - 获取所有优惠码（Admin）
 * POST /api/coupons - 创建优惠码（Admin）
 * PATCH /api/coupons - 更新优惠码（Admin）
 * DELETE /api/coupons - 删除优惠码（Admin）
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

import { validateToken, getCorsHeaders } from './_auth';
import { checkRateLimit } from './_rateLimit';

// GET - 获取优惠码
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
					JSON.stringify({ success: false, error: '优惠码无效' }),
					{ status: 404, headers: corsHeaders }
				);
			}

			const now = new Date();
			const validFrom = new Date(coupon.validFrom);
			const validUntil = new Date(coupon.validUntil + 'T23:59:59');

			if (now < validFrom || now > validUntil) {
				return new Response(
					JSON.stringify({ success: false, error: '优惠码已过期' }),
					{ status: 400, headers: corsHeaders }
				);
			}

			if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
				return new Response(
					JSON.stringify({ success: false, error: '优惠码已达使用上限' }),
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
		if (!await validateToken(authHeader, context.env)) {
			return new Response(
				JSON.stringify({ success: false, error: 'Unauthorized' }),
				{ status: 401, headers: corsHeaders }
			);
		}

		return new Response(
			JSON.stringify({ success: true, coupons }),
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

// POST - 创建优惠码
export const onRequestPost: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);
	const authHeader = context.request.headers.get('Authorization');
	if (!await validateToken(authHeader, context.env)) {
		return new Response(
			JSON.stringify({ success: false, error: 'Unauthorized' }),
			{ status: 401, headers: corsHeaders }
		);
	}

	try {
		const body = (await context.request.json()) as Partial<Coupon>;

		if (!body.code || !body.type || body.value === undefined) {
			return new Response(
				JSON.stringify({ success: false, error: 'Missing required fields' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		const couponsData = await context.env.BOOKINGS.get('coupons_list', 'json');
		const coupons: Coupon[] = (couponsData as Coupon[]) || [];

		if (coupons.some((c) => c.code.toLowerCase() === body.code!.toLowerCase())) {
			return new Response(
				JSON.stringify({ success: false, error: '优惠码已存在' }),
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

// PATCH - 更新优惠码 (admin only)
export const onRequestPatch: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);

	const authHeader = context.request.headers.get('Authorization');
	if (!await validateToken(authHeader, context.env)) {
		return new Response(
			JSON.stringify({ success: false, error: 'Unauthorized' }),
			{ status: 401, headers: corsHeaders }
		);
	}

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

// DELETE - 删除优惠码
export const onRequestDelete: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);
	const authHeader = context.request.headers.get('Authorization');
	if (!await validateToken(authHeader, context.env)) {
		return new Response(
			JSON.stringify({ success: false, error: 'Unauthorized' }),
			{ status: 401, headers: corsHeaders }
		);
	}

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



