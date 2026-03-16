/**
 * Referral Program API - Referral code generation and tracking
 * POST /api/referral - Generate referral code (public, rate-limited)
 * GET /api/referral - List all referrals (admin) or validate code (public)
 * PATCH /api/referral - Mark referral as used (internal, from booking flow)
 */

import { validateToken, getCorsHeaders } from './_auth';
import { checkRateLimit } from './_rateLimit';
import { sendEmail } from './_email';

interface ReferralUsage {
	email: string;
	bookingId: string;
	usedAt: string;
}

interface Referral {
	id: string;
	code: string;
	referrerEmail: string;
	createdAt: string;
	usedBy: ReferralUsage[];
	reward: number;
	friendDiscount: number;
	active: boolean;
}

interface Env {
	BOOKINGS: KVNamespace;
	RESEND_API_KEY?: string;
	ADMIN_PASSWORD?: string;
	ALLOWED_ORIGINS?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REFERRAL_REWARD = 50;
const FRIEND_DISCOUNT = 30;

function generateReferralCode(): string {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	let code = 'HH-';
	for (let i = 0; i < 8; i++) {
		code += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return code;
}

// POST - Generate referral code
export const onRequestPost: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);

	const rateLimited = await checkRateLimit(context.request, context.env.BOOKINGS, corsHeaders);
	if (rateLimited) return rateLimited;

	try {
		const { email } = await context.request.json() as { email: string };

		if (!email || !EMAIL_REGEX.test(email)) {
			return new Response(
				JSON.stringify({ success: false, error: 'Valid email is required' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		const data = await context.env.BOOKINGS.get('referrals_list', 'json');
		const referrals: Referral[] = (data as Referral[]) || [];

		const existing = referrals.find(r => r.referrerEmail.toLowerCase() === email.toLowerCase() && r.active);
		if (existing) {
			return new Response(
				JSON.stringify({ success: true, code: existing.code, message: 'Referral code retrieved' }),
				{ headers: corsHeaders }
			);
		}

		let code = generateReferralCode();
		while (referrals.some(r => r.code === code)) {
			code = generateReferralCode();
		}

		const newReferral: Referral = {
			id: crypto.randomUUID(),
			code,
			referrerEmail: email.toLowerCase(),
			createdAt: new Date().toISOString(),
			usedBy: [],
			reward: REFERRAL_REWARD,
			friendDiscount: FRIEND_DISCOUNT,
			active: true,
		};

		referrals.push(newReferral);
		await context.env.BOOKINGS.put('referrals_list', JSON.stringify(referrals));

		sendEmail(context.env, {
			to: email,
			subject: `Your Referral Code: ${code} - Family Friends Hibachi`,
			html: `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif;">
<table width="100%" style="background:#f5f5f5;padding:40px 20px;"><tr><td align="center">
<table width="600" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#ff6b35,#ff8a5b);padding:30px;text-align:center;">
<h1 style="margin:0;color:#fff;font-size:24px;">Your Referral Code</h1>
</td></tr>
<tr><td style="padding:30px;">
<p style="font-size:16px;color:#4a4a4a;">Share this code with friends:</p>
<div style="background:#fff8f5;border:2px dashed #ff6b35;padding:20px;text-align:center;border-radius:12px;margin:20px 0;">
<span style="font-size:32px;font-weight:700;color:#ff6b35;letter-spacing:3px;">${code}</span>
</div>
<p style="font-size:14px;color:#4a4a4a;">Your friend gets <strong>$${FRIEND_DISCOUNT} off</strong> their first booking, and you earn <strong>$${REFERRAL_REWARD} credit</strong>!</p>
</td></tr>
<tr><td style="background:#1a1a2e;padding:15px;text-align:center;">
<p style="color:#a1a1aa;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} Family Friends Hibachi</p>
</td></tr></table></td></tr></table></body></html>`,
		}).catch(err => console.error('Referral email failed:', err));

		return new Response(
			JSON.stringify({ success: true, code, message: 'Referral code generated' }),
			{ headers: corsHeaders }
		);
	} catch (error) {
		console.error('Referral generate error:', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to generate referral code' }),
			{ status: 500, headers: corsHeaders }
		);
	}
};

// GET - Validate code (public) or list all (admin)
export const onRequestGet: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);

	const rateLimited = await checkRateLimit(context.request, context.env.BOOKINGS, corsHeaders);
	if (rateLimited) return rateLimited;

	const url = new URL(context.request.url);
	const code = url.searchParams.get('code');

	try {
		const data = await context.env.BOOKINGS.get('referrals_list', 'json');
		const referrals: Referral[] = (data as Referral[]) || [];

		if (code) {
			const referral = referrals.find(r => r.code.toUpperCase() === code.toUpperCase() && r.active);
			if (!referral) {
				return new Response(
					JSON.stringify({ success: false, error: 'Invalid referral code' }),
					{ status: 404, headers: corsHeaders }
				);
			}
			return new Response(
				JSON.stringify({
					success: true,
					referral: { code: referral.code, friendDiscount: referral.friendDiscount },
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

		return new Response(
			JSON.stringify({ success: true, referrals }),
			{ headers: corsHeaders }
		);
	} catch (error) {
		console.error('Referral list error:', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to get referrals' }),
			{ status: 500, headers: corsHeaders }
		);
	}
};

// PATCH - Mark referral as used (admin only, called from booking flow)
export const onRequestPatch: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);

	const authHeader = context.request.headers.get('Authorization');
	if (!(await validateToken(authHeader, context.env)).valid) {
		return new Response(
			JSON.stringify({ success: false, error: 'Unauthorized' }),
			{ status: 401, headers: corsHeaders }
		);
	}

	try {
		const { code, email, bookingId } = await context.request.json() as {
			code: string; email: string; bookingId: string;
		};

		const data = await context.env.BOOKINGS.get('referrals_list', 'json');
		const referrals: Referral[] = (data as Referral[]) || [];

		const referral = referrals.find(r => r.code.toUpperCase() === code.toUpperCase() && r.active);
		if (!referral) {
			return new Response(
				JSON.stringify({ success: false, error: 'Referral not found' }),
				{ status: 404, headers: corsHeaders }
			);
		}

		if (referral.usedBy.some(u => u.bookingId === bookingId)) {
			return new Response(
				JSON.stringify({ success: false, error: 'Already used for this booking' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		referral.usedBy.push({ email, bookingId, usedAt: new Date().toISOString() });
		await context.env.BOOKINGS.put('referrals_list', JSON.stringify(referrals));

		return new Response(
			JSON.stringify({ success: true }),
			{ headers: corsHeaders }
		);
	} catch (error) {
		console.error('Referral use error:', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to use referral' }),
			{ status: 500, headers: corsHeaders }
		);
	}
};

export const onRequestOptions: PagesFunction<Env> = async (context) => {
	return new Response(null, { status: 204, headers: getCorsHeaders(context.request, context.env) });
};
