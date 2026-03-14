/**
 * Newsletter API - Email subscription management
 * POST /api/newsletter - Subscribe (public, rate-limited)
 * GET /api/newsletter - List subscribers (admin only)
 * DELETE /api/newsletter - Unsubscribe (by token)
 */

import { validateToken, getCorsHeaders, escapeHtml } from './_auth';
import { checkRateLimit } from './_rateLimit';
import { sendEmail } from './_email';

interface Subscriber {
	email: string;
	subscribedAt: string;
	unsubscribeToken: string;
	active: boolean;
}

interface Env {
	BOOKINGS: KVNamespace;
	RESEND_API_KEY?: string;
	ADMIN_PASSWORD?: string;
	ALLOWED_ORIGINS?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generateWelcomeEmail(email: string, unsubscribeToken: string): string {
	const safeEmail = escapeHtml(email);
	return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
<tr><td style="background:linear-gradient(135deg,#ff6b35,#ff8a5b);padding:30px;text-align:center;">
<h1 style="margin:0;color:#fff;font-size:24px;">Welcome to Family Friends Hibachi!</h1>
</td></tr>
<tr><td style="padding:30px;background:#fff;">
<p style="color:#4a4a4a;font-size:16px;line-height:1.6;">
Hi there! Thanks for subscribing to our newsletter at <strong>${safeEmail}</strong>.
</p>
<p style="color:#4a4a4a;font-size:16px;line-height:1.6;">You'll receive:</p>
<ul style="color:#4a4a4a;font-size:14px;line-height:2;">
<li>Exclusive discount codes</li>
<li>Party planning tips</li>
<li>New menu updates</li>
</ul>
<p style="color:#999;font-size:12px;margin-top:30px;">
<a href="https://familyfriendshibachi.com/api/newsletter?unsubscribe=${unsubscribeToken}" style="color:#999;">Unsubscribe</a>
</p>
</td></tr>
<tr><td style="background:#1a1a2e;padding:15px;text-align:center;">
<p style="color:#a1a1aa;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} Family Friends Hibachi</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

// POST - Subscribe
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

		const data = await context.env.BOOKINGS.get('newsletter_subscribers', 'json');
		const subscribers: Subscriber[] = (data as Subscriber[]) || [];

		const existing = subscribers.find(s => s.email.toLowerCase() === email.toLowerCase());
		if (existing) {
			if (existing.active) {
				return new Response(
					JSON.stringify({ success: true, message: 'Already subscribed' }),
					{ headers: corsHeaders }
				);
			}
			existing.active = true;
			existing.subscribedAt = new Date().toISOString();
		} else {
			const unsubscribeToken = crypto.randomUUID();
			subscribers.push({
				email: email.toLowerCase(),
				subscribedAt: new Date().toISOString(),
				unsubscribeToken,
				active: true,
			});

			sendEmail(context.env, {
				to: email,
				subject: 'Welcome to Family Friends Hibachi Newsletter!',
				html: generateWelcomeEmail(email, unsubscribeToken),
			}).catch(err => console.error('Newsletter welcome email failed:', err));
		}

		await context.env.BOOKINGS.put('newsletter_subscribers', JSON.stringify(subscribers));

		return new Response(
			JSON.stringify({ success: true, message: 'Successfully subscribed!' }),
			{ headers: corsHeaders }
		);
	} catch (error) {
		console.error('Newsletter subscribe error:', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to subscribe' }),
			{ status: 500, headers: corsHeaders }
		);
	}
};

// GET - List subscribers (admin) or unsubscribe (public with token)
export const onRequestGet: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);
	const url = new URL(context.request.url);
	const unsubToken = url.searchParams.get('unsubscribe');

	if (unsubToken) {
		try {
			const data = await context.env.BOOKINGS.get('newsletter_subscribers', 'json');
			const subscribers: Subscriber[] = (data as Subscriber[]) || [];
			const sub = subscribers.find(s => s.unsubscribeToken === unsubToken);

			if (sub) {
				sub.active = false;
				await context.env.BOOKINGS.put('newsletter_subscribers', JSON.stringify(subscribers));
			}

			return new Response(
				'<html><body style="display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:sans-serif;"><h2>You have been unsubscribed.</h2></body></html>',
				{ headers: { 'Content-Type': 'text/html' } }
			);
		} catch {
			return new Response('Error processing unsubscribe', { status: 500 });
		}
	}

	const authHeader = context.request.headers.get('Authorization');
	if (!(await validateToken(authHeader, context.env)).valid) {
		return new Response(
			JSON.stringify({ success: false, error: 'Unauthorized' }),
			{ status: 401, headers: corsHeaders }
		);
	}

	try {
		const data = await context.env.BOOKINGS.get('newsletter_subscribers', 'json');
		const subscribers: Subscriber[] = (data as Subscriber[]) || [];

		return new Response(
			JSON.stringify({
				success: true,
				subscribers: subscribers.filter(s => s.active),
				total: subscribers.filter(s => s.active).length,
			}),
			{ headers: corsHeaders }
		);
	} catch (error) {
		console.error('Newsletter list error:', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to list subscribers' }),
			{ status: 500, headers: corsHeaders }
		);
	}
};

export const onRequestOptions: PagesFunction<Env> = async (context) => {
	return new Response(null, { status: 204, headers: getCorsHeaders(context.request, context.env) });
};
