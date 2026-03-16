/**
 * Calendar API - 日历和日期管理
 * GET /api/calendar - 获取已预约日期和不可用日期
 * POST /api/calendar - 设置不可用日期（需要管理员权限）
 * DELETE /api/calendar - 取消不可用日期（需要管理员权限）
 */

import { validateToken, getCorsHeaders } from './_auth';
import { checkRateLimit } from './_rateLimit';
import { readAllShards } from './_kvHelpers';

interface Booking {
	id: string;
	date: string;
	region: string;
	status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

interface BlockedDate {
	date: string;
	reason?: string;
	region?: string; // 如果为空，表示全部地区
}

interface Env {
	BOOKINGS: KVNamespace;
	ADMIN_PASSWORD: string;
	ALLOWED_ORIGINS?: string;
}

// GET - 获取日历数据
export const onRequestGet: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);

	const rateLimited = await checkRateLimit(context.request, context.env.BOOKINGS, corsHeaders);
	if (rateLimited) return rateLimited;

	try {
		const url = new URL(context.request.url);
		const region = url.searchParams.get('region');

		// 获取所有预约
		let bookings = await readAllShards<Booking>(context.env.BOOKINGS, 'bookings');
		if (!bookings.length) {
			bookings = (await context.env.BOOKINGS.get('bookings_list', 'json') as Booking[]) || [];
		}

		// 获取不可用日期
		const blockedList = await context.env.BOOKINGS.get('blocked_dates', 'json');
		const blockedDates: BlockedDate[] = (blockedList as BlockedDate[]) || [];

		// 过滤有效预约（排除已取消）
		const validBookings = bookings.filter(
			(b) => b.status !== 'cancelled' && (region ? b.region === region : true)
		);

		// 统计每个日期的预约数量
		const dateCount: Record<string, number> = {};
		validBookings.forEach((b) => {
			if (b.date) {
				dateCount[b.date] = (dateCount[b.date] || 0) + 1;
			}
		});

		// 转换为数组格式
		const bookedDates = Object.entries(dateCount).map(([date, count]) => ({
			date,
			count,
		}));

		// 过滤不可用日期（按地区）
		const filteredBlockedDates = blockedDates.filter(
			(b) => !b.region || !region || b.region === region
		);

		return new Response(
			JSON.stringify({
				success: true,
				bookedDates,
				blockedDates: filteredBlockedDates,
			}),
			{ headers: corsHeaders }
		);
	} catch (error) {
		console.error('Calendar API error:', error);
		return new Response(
			JSON.stringify({
				success: false,
				error: 'Failed to fetch calendar data',
				bookedDates: [],
				blockedDates: [],
			}),
			{ status: 500, headers: corsHeaders }
		);
	}
};

// POST - 添加不可用日期
export const onRequestPost: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);

	// 验证身份
	const authHeader = context.request.headers.get('Authorization');
	if (!(await validateToken(authHeader, context.env)).valid) {
		return new Response(
			JSON.stringify({ success: false, error: 'Unauthorized' }),
			{ status: 401, headers: corsHeaders }
		);
	}

	try {
		const { date, reason, region } = (await context.request.json()) as BlockedDate;

		if (!date) {
			return new Response(
				JSON.stringify({ success: false, error: 'Date is required' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		// 获取现有不可用日期
		const blockedList = await context.env.BOOKINGS.get('blocked_dates', 'json');
		const blockedDates: BlockedDate[] = (blockedList as BlockedDate[]) || [];

		// 检查是否已存在
		const exists = blockedDates.some(
			(b) => b.date === date && b.region === region
		);
		if (exists) {
			return new Response(
				JSON.stringify({ success: false, error: 'Date already blocked' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		// 添加新的不可用日期
		blockedDates.push({ date, reason, region });

		// 保存
		await context.env.BOOKINGS.put('blocked_dates', JSON.stringify(blockedDates));

		return new Response(
			JSON.stringify({ success: true, blockedDates }),
			{ headers: corsHeaders }
		);
	} catch (error) {
		console.error('Add blocked date error:', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to add blocked date' }),
			{ status: 500, headers: corsHeaders }
		);
	}
};

// DELETE - 删除不可用日期
export const onRequestDelete: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);

	// 验证身份
	const authHeader = context.request.headers.get('Authorization');
	if (!(await validateToken(authHeader, context.env)).valid) {
		return new Response(
			JSON.stringify({ success: false, error: 'Unauthorized' }),
			{ status: 401, headers: corsHeaders }
		);
	}

	try {
		const { date, region } = (await context.request.json()) as { date: string; region?: string };

		if (!date) {
			return new Response(
				JSON.stringify({ success: false, error: 'Date is required' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		// 获取现有不可用日期
		const blockedList = await context.env.BOOKINGS.get('blocked_dates', 'json');
		let blockedDates: BlockedDate[] = (blockedList as BlockedDate[]) || [];

		// 删除指定日期
		blockedDates = blockedDates.filter(
			(b) => !(b.date === date && b.region === region)
		);

		// 保存
		await context.env.BOOKINGS.put('blocked_dates', JSON.stringify(blockedDates));

		return new Response(
			JSON.stringify({ success: true, blockedDates }),
			{ headers: corsHeaders }
		);
	} catch (error) {
		console.error('Delete blocked date error:', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to delete blocked date' }),
			{ status: 500, headers: corsHeaders }
		);
	}
};

// OPTIONS - CORS
export const onRequestOptions: PagesFunction<Env> = async (context) => {
	return new Response(null, {
		status: 204,
		headers: getCorsHeaders(context.request, context.env),
	});
};
