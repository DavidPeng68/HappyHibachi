/**
 * Booking API - Handle booking submissions
 * POST /api/booking - Submit a new booking
 */

import { sendEmail, generateCustomerEmail, generateAdminEmail } from './_email';
import { getCorsHeaders } from './_auth';
import { checkRateLimit } from './_rateLimit';
import { getShardMonth, readShard, writeShard, ensureMonthInIndex, writeEntity, addToMonthIndex } from './_kvHelpers';

interface BookingOrderData {
	packageName: string;
	priceModel: string;
	guestCount: number;
	kidsCount: number;
	serviceType: string;
	serviceDuration: number;
	proteins: string[];
	addons: Array<{ name: string; quantity: number; unitPrice: number }>;
	estimatedTotal: number;
}

interface Booking {
	id: string;
	name: string;
	email: string;
	phone: string;
	date: string;
	time: string;
	guestCount: number;
	region: string;
	message?: string;
	formType: 'booking' | 'estimate';
	status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
	couponCode?: string;
	couponDiscount?: string;
	referralCode?: string;
	referralDiscount?: string;
	referralSource?: string;
	eventType?: string;
	orderData?: BookingOrderData;
	priceVerified?: boolean;
	createdAt: string;
}

interface Referral {
	id: string;
	code: string;
	referrerEmail: string;
	usedBy: Array<{ email: string; bookingId: string; usedAt: string }>;
	reward: number;
	friendDiscount: number;
	active: boolean;
}

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
}

interface Env {
	BOOKINGS: KVNamespace;
	RESEND_API_KEY?: string;
	ADMIN_EMAIL?: string;
	ALLOWED_ORIGINS?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const VALID_REGIONS = ['california', 'texas', 'florida'];

export const onRequestPost: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);

	const rateLimited = await checkRateLimit(context.request, context.env.BOOKINGS, corsHeaders);
	if (rateLimited) return rateLimited;

	try {
		const body = await context.request.json() as Partial<Booking> & { idempotencyKey?: string };

		// Idempotency check — prevent duplicate submissions on network retry
		if (body.idempotencyKey) {
			const cacheKey = `idem:${body.idempotencyKey}`;
			const cached = await context.env.BOOKINGS.get(cacheKey);
			if (cached) {
				return new Response(cached, { headers: corsHeaders });
			}
		}

		if (!body.name || !body.email || !body.phone || !body.date || !body.guestCount || !body.region) {
			return new Response(
				JSON.stringify({ success: false, error: 'Missing required fields' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		if (body.name.length > 200 || body.email.length > 254 || body.phone.length > 20 || (body.message && body.message.length > 2000)) {
			return new Response(
				JSON.stringify({ success: false, error: 'Input exceeds maximum length' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		if (!EMAIL_REGEX.test(body.email)) {
			return new Response(
				JSON.stringify({ success: false, error: 'Invalid email format' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		const PHONE_REGEX = /^[+\d][\d\s\-().]{6,19}$/;
		if (!PHONE_REGEX.test(body.phone)) {
			return new Response(
				JSON.stringify({ success: false, error: 'Invalid phone format' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		if (body.guestCount < 1 || body.guestCount > 200) {
			return new Response(
				JSON.stringify({ success: false, error: 'Guest count must be between 1 and 200' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		if (!DATE_REGEX.test(body.date) || isNaN(Date.parse(body.date))) {
			return new Response(
				JSON.stringify({ success: false, error: 'Invalid date format. Use YYYY-MM-DD' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		const bookingDate = new Date(body.date + 'T00:00:00');
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		if (body.formType !== 'estimate' && bookingDate < today) {
			return new Response(
				JSON.stringify({ success: false, error: 'Cannot book a date in the past' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		if (!VALID_REGIONS.includes(body.region.toLowerCase())) {
			return new Response(
				JSON.stringify({ success: false, error: 'Invalid region' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		// Validate orderData if provided
		if (body.orderData) {
			const od = body.orderData;
			if (typeof od.packageName !== 'string' || od.packageName.length > 200 ||
				typeof od.estimatedTotal !== 'number' || od.estimatedTotal < 0 ||
				!Array.isArray(od.proteins) || od.proteins.length > 20 ||
				!Array.isArray(od.addons) || od.addons.length > 50) {
				return new Response(
					JSON.stringify({ success: false, error: 'Invalid order data' }),
					{ status: 400, headers: corsHeaders }
				);
			}
		}

		// --- Availability check: blocked dates and slot capacity ---
		const blockedData = await context.env.BOOKINGS.get('blocked_dates', 'json');
		const blockedDates: Array<{ date: string; reason?: string; region?: string }> = (blockedData as Array<{ date: string; reason?: string; region?: string }>) || [];

		const isBlocked = blockedDates.some(
			(bd) => bd.date === body.date && (!bd.region || bd.region === body.region.toLowerCase())
		);
		if (body.formType !== 'estimate' && isBlocked) {
			return new Response(
				JSON.stringify({ success: false, error: 'DATE_BLOCKED', message: 'This date is not available for booking' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		const bookingId = crypto.randomUUID();

		// 处理优惠码 — use per-coupon KV key for usage tracking (race-condition-safe)
		let couponDiscount = '';
		if (body.couponCode) {
			const couponsData = await context.env.BOOKINGS.get('coupons_list', 'json');
			const coupons: Coupon[] = (couponsData as Coupon[]) || [];
			const coupon = coupons.find(
				(c) => c.code.toLowerCase() === body.couponCode!.toLowerCase() && c.enabled
			);

			if (coupon) {
				const now = new Date();
				const validFrom = new Date(coupon.validFrom);
				const validUntil = new Date(coupon.validUntil + 'T23:59:59');

				if (now >= validFrom && now <= validUntil) {
					// Read actual usage from per-coupon KV key (more accurate than coupons_list)
					const usageKey = `coupon_usage:${coupon.id}`;
					const usageData = await context.env.BOOKINGS.get(usageKey, 'json') as { count: number; bookings: string[] } | null;
					const usage = usageData || { count: 0, bookings: [] };
					const actualUsedCount = Math.max(usage.count, coupon.usedCount);

					if (coupon.maxUses === 0 || actualUsedCount < coupon.maxUses) {
						if (body.guestCount >= coupon.minGuests) {
							couponDiscount = coupon.type === 'percentage'
								? `${coupon.value}% OFF`
								: `$${coupon.value} OFF`;
							usage.count += 1;
							usage.bookings.push(bookingId);
							await context.env.BOOKINGS.put(usageKey, JSON.stringify(usage));

							// Also update coupons_list for backward compat (best-effort)
							const couponIndex = coupons.findIndex((c) => c.id === coupon.id);
							coupons[couponIndex].usedCount = usage.count;
							if (!coupons[couponIndex].usedByBookings) {
								coupons[couponIndex].usedByBookings = [];
							}
							coupons[couponIndex].usedByBookings.push(bookingId);
							await context.env.BOOKINGS.put('coupons_list', JSON.stringify(coupons));
						}
					}
				}
			}
		}

		// Handle referral code — use per-referral KV key for usage tracking (race-condition-safe)
		let referralDiscount = '';
		if ((body as Record<string, unknown>).referralCode) {
			const refCode = (body as Record<string, unknown>).referralCode as string;
			const referralsData = await context.env.BOOKINGS.get('referrals_list', 'json');
			const referrals: Referral[] = (referralsData as Referral[]) || [];
			const referral = referrals.find(
				(r) => r.code.toUpperCase() === refCode.toUpperCase() && r.active
			);

			if (referral) {
				// Track usage in per-referral KV key
				const usageKey = `referral_usage:${referral.id}`;
				const usageData = await context.env.BOOKINGS.get(usageKey, 'json') as Array<{ email: string; bookingId: string; usedAt: string }> | null;
				const usages = usageData || [];
				const alreadyUsed = usages.some(u => u.bookingId === bookingId);

				if (!alreadyUsed) {
					referralDiscount = `$${referral.friendDiscount} OFF`;
					usages.push({
						email: body.email,
						bookingId,
						usedAt: new Date().toISOString(),
					});
					await context.env.BOOKINGS.put(usageKey, JSON.stringify(usages));

					// Also update referrals_list for backward compat (best-effort)
					const refIndex = referrals.findIndex((r) => r.id === referral.id);
					referrals[refIndex].usedBy = usages;
					await context.env.BOOKINGS.put('referrals_list', JSON.stringify(referrals));
				}
			}
		}

		const booking: Booking = {
			id: bookingId,
			name: body.name,
			email: body.email,
			phone: body.phone,
			date: body.date,
			time: body.time || '',
			guestCount: body.guestCount,
			region: body.region,
			message: body.message || '',
			formType: body.formType || 'booking',
			status: 'pending',
			couponCode: couponDiscount ? body.couponCode?.toUpperCase() : undefined,
			couponDiscount: couponDiscount || undefined,
			referralCode: referralDiscount ? ((body as Record<string, unknown>).referralCode as string)?.toUpperCase() : undefined,
			referralDiscount: referralDiscount || undefined,
			referralSource: body.referralSource || undefined,
			eventType: (body as Record<string, unknown>).eventType as string | undefined,
			orderData: body.orderData || undefined,
			priceVerified: false,
			createdAt: new Date().toISOString(),
			_version: 1,
		};

		// Write booking to individual KV key (race-condition-free)
		await writeEntity(context.env.BOOKINGS, 'booking', booking.id, booking);

		// Update month index for discoverability
		const shardMonth = getShardMonth(booking.date);
		await addToMonthIndex(context.env.BOOKINGS, 'booking', shardMonth, booking.id);
		await ensureMonthInIndex(context.env.BOOKINGS, 'bookings', shardMonth);

		// Backward-compat: also write to monthly shard (for admin reads during migration)
		const shardBookings = await readShard<Booking>(context.env.BOOKINGS, 'bookings', shardMonth);
		shardBookings.push(booking);
		await writeShard(context.env.BOOKINGS, 'bookings', shardMonth, shardBookings);

		// Send emails (non-blocking)
		const emailPromises: Promise<boolean>[] = [];

		// Send confirmation email to customer
		emailPromises.push(
			sendEmail(context.env, {
				to: booking.email,
				subject: `🍱 Booking Request Received - Family Friends Hibachi`,
				html: generateCustomerEmail(booking),
			})
		);

		// Send notification email to admin (prefer KV setting over env var)
		const appSettings = await context.env.BOOKINGS.get('app_settings', 'json') as Record<string, unknown> | null;
		const adminEmail = (appSettings?.contactInfo as Record<string, unknown>)?.email as string || context.env.ADMIN_EMAIL || 'familyfriendshibachi@gmail.com';
		emailPromises.push(
			sendEmail(context.env, {
				to: adminEmail,
				subject: `🔔 New ${booking.formType === 'booking' ? 'Booking' : 'Estimate'}: ${booking.name} - ${booking.guestCount} guests`,
				html: generateAdminEmail(booking),
			})
		);

		// Wait for emails but don't fail if they fail
		await Promise.allSettled(emailPromises);

		const responseBody = JSON.stringify({ success: true, booking });

		// Cache idempotency key for 5 minutes to prevent duplicate processing
		if (body.idempotencyKey) {
			context.env.BOOKINGS.put(
				`idem:${body.idempotencyKey}`,
				responseBody,
				{ expirationTtl: 300 }
			).catch(() => {});
		}

		return new Response(responseBody, { headers: corsHeaders });
	} catch (error) {
		console.error('Booking error:', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to process booking' }),
			{ status: 500, headers: corsHeaders }
		);
	}
};

export const onRequestOptions: PagesFunction<Env> = async (context) => {
	return new Response(null, { status: 204, headers: getCorsHeaders(context.request, context.env) });
};
