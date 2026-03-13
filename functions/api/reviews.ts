/**
 * Reviews API - 评价管理
 * GET /api/reviews - 获取所有评价（公开）
 * POST /api/reviews - 添加评价（需要管理员权限）
 * PATCH /api/reviews - 更新评价（需要管理员权限）
 * DELETE /api/reviews - 删除评价（需要管理员权限）
 */

import { validateToken, getCorsHeaders } from './_auth';

interface Review {
	id: string;
	name: string;
	location: string;
	rating: number;
	review: string;
	event: string;
	createdAt: string;
	visible: boolean;
}

interface Env {
	BOOKINGS: KVNamespace;
	ADMIN_PASSWORD?: string;
	ALLOWED_ORIGINS?: string;
}

// GET - 获取评价（公开）
export const onRequestGet: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);
	try {
		const reviewsData = await context.env.BOOKINGS.get('reviews_list', 'json');
		const reviews: Review[] = (reviewsData as Review[]) || [];

		// 检查是否是管理员请求（返回所有评价）
		const authHeader = context.request.headers.get('Authorization');
		const isAdmin = await validateToken(authHeader, context.env);

		// 非管理员只返回可见的评价
		const visibleReviews = isAdmin ? reviews : reviews.filter(r => r.visible !== false);

		return new Response(
			JSON.stringify({ success: true, reviews: visibleReviews }),
			{ headers: corsHeaders }
		);
	} catch (error) {
		console.error('Get reviews error:', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to get reviews' }),
			{ status: 500, headers: corsHeaders }
		);
	}
};

// POST - 添加评价
export const onRequestPost: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);
	const authHeader = context.request.headers.get('Authorization');
	if (!(await validateToken(authHeader, context.env))) {
		return new Response(
			JSON.stringify({ success: false, error: 'Unauthorized' }),
			{ status: 401, headers: corsHeaders }
		);
	}

	try {
		const body = await context.request.json() as Partial<Review>;

		if (!body.name || !body.review || !body.rating) {
			return new Response(
				JSON.stringify({ success: false, error: 'Missing required fields' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		const newReview: Review = {
			id: crypto.randomUUID(),
			name: body.name,
			location: body.location || '',
			rating: Math.min(5, Math.max(1, body.rating)),
			review: body.review,
			event: body.event || '',
			createdAt: new Date().toISOString(),
			visible: body.visible !== false,
		};

		const reviewsData = await context.env.BOOKINGS.get('reviews_list', 'json');
		const reviews: Review[] = (reviewsData as Review[]) || [];

		reviews.unshift(newReview);
		await context.env.BOOKINGS.put('reviews_list', JSON.stringify(reviews));

		return new Response(
			JSON.stringify({ success: true, review: newReview }),
			{ headers: corsHeaders }
		);
	} catch (error) {
		console.error('Add review error:', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to add review' }),
			{ status: 500, headers: corsHeaders }
		);
	}
};

// PATCH - 更新评价
export const onRequestPatch: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);
	const authHeader = context.request.headers.get('Authorization');
	if (!(await validateToken(authHeader, context.env))) {
		return new Response(
			JSON.stringify({ success: false, error: 'Unauthorized' }),
			{ status: 401, headers: corsHeaders }
		);
	}

	try {
		const body = await context.request.json() as { id: string } & Partial<Review>;

		if (!body.id || typeof body.id !== 'string') {
			return new Response(
				JSON.stringify({ success: false, error: 'Review ID is required and must be a string' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		const reviewsData = await context.env.BOOKINGS.get('reviews_list', 'json');
		const reviews: Review[] = (reviewsData as Review[]) || [];

		const index = reviews.findIndex(r => r.id === body.id);
		if (index === -1) {
			return new Response(
				JSON.stringify({ success: false, error: 'Review not found' }),
				{ status: 404, headers: corsHeaders }
			);
		}

		// 更新评价
		reviews[index] = {
			...reviews[index],
			...(body.name && { name: body.name }),
			...(body.location !== undefined && { location: body.location }),
			...(body.rating && { rating: Math.min(5, Math.max(1, body.rating)) }),
			...(body.review && { review: body.review }),
			...(body.event !== undefined && { event: body.event }),
			...(body.visible !== undefined && { visible: body.visible }),
		};

		await context.env.BOOKINGS.put('reviews_list', JSON.stringify(reviews));

		return new Response(
			JSON.stringify({ success: true, review: reviews[index] }),
			{ headers: corsHeaders }
		);
	} catch (error) {
		console.error('Update review error:', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to update review' }),
			{ status: 500, headers: corsHeaders }
		);
	}
};

// DELETE - 删除评价
export const onRequestDelete: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);
	const authHeader = context.request.headers.get('Authorization');
	if (!(await validateToken(authHeader, context.env))) {
		return new Response(
			JSON.stringify({ success: false, error: 'Unauthorized' }),
			{ status: 401, headers: corsHeaders }
		);
	}

	try {
		const { id } = await context.request.json() as { id: string };

		if (!id || typeof id !== 'string') {
			return new Response(
				JSON.stringify({ success: false, error: 'Review ID is required and must be a string' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		const reviewsData = await context.env.BOOKINGS.get('reviews_list', 'json');
		let reviews: Review[] = (reviewsData as Review[]) || [];

		const originalLength = reviews.length;
		reviews = reviews.filter(r => r.id !== id);

		if (reviews.length === originalLength) {
			return new Response(
				JSON.stringify({ success: false, error: 'Review not found' }),
				{ status: 404, headers: corsHeaders }
			);
		}

		await context.env.BOOKINGS.put('reviews_list', JSON.stringify(reviews));

		return new Response(
			JSON.stringify({ success: true }),
			{ headers: corsHeaders }
		);
	} catch (error) {
		console.error('Delete review error:', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to delete review' }),
			{ status: 500, headers: corsHeaders }
		);
	}
};

export const onRequestOptions: PagesFunction<Env> = async (context) => {
	return new Response(null, { status: 204, headers: getCorsHeaders(context.request, context.env) });
};



