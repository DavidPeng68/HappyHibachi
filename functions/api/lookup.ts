/**
 * Booking Lookup API - 客户查询预约状态
 * POST /api/lookup - 用邮箱或手机号查询预约
 */

import { getCorsHeaders } from './_auth';
import { checkRateLimit } from './_rateLimit';

interface Booking {
	id: string;
	name: string;
	email: string;
	phone: string;
	date: string;
	time: string;
	guestCount: number;
	region: string;
	status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
	createdAt: string;
}

interface Env {
	BOOKINGS: KVNamespace;
	ALLOWED_ORIGINS?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);

	const rateLimited = await checkRateLimit(context.request, context.env.BOOKINGS, corsHeaders);
	if (rateLimited) return rateLimited;

	try {
		const { email, phone } = await context.request.json() as { email?: string; phone?: string };

		if (!email && !phone) {
			return new Response(
				JSON.stringify({ success: false, error: 'Please provide email or phone number' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		// 获取所有预约
		const bookingsData = await context.env.BOOKINGS.get('bookings_list', 'json');
		const bookings: Booking[] = (bookingsData as Booking[]) || [];

		// 查找匹配的预约
		const matchedBookings = bookings.filter((b) => {
			const emailMatch = email && b.email.toLowerCase() === email.toLowerCase();
			const phoneMatch = phone && b.phone.replace(/\D/g, '') === phone.replace(/\D/g, '');
			return emailMatch || phoneMatch;
		});

		// 只返回必要信息（隐藏敏感数据）
		const safeBookings = matchedBookings.map((b) => ({
			id: b.id.slice(-8), // 只显示最后8位
			name: b.name,
			date: b.date,
			time: b.time,
			guestCount: b.guestCount,
			region: b.region,
			status: b.status,
			createdAt: b.createdAt,
		}));

		// 按日期排序（最新的在前）
		safeBookings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

		return new Response(
			JSON.stringify({
				success: true,
				count: safeBookings.length,
				bookings: safeBookings,
			}),
			{ headers: corsHeaders }
		);
	} catch (error) {
		console.error('Lookup error:', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to lookup bookings' }),
			{ status: 500, headers: corsHeaders }
		);
	}
};

export const onRequestOptions: PagesFunction<Env> = async (context) => {
	return new Response(null, { status: 204, headers: getCorsHeaders(context.request, context.env) });
};



