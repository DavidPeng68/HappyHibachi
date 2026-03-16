/**
 * Email utility functions using Resend API
 * https://resend.com/docs/api-reference/emails/send-email
 */

import { escapeHtml } from './_auth';

interface EmailOptions {
	to: string;
	subject: string;
	html: string;
}

interface Env {
	RESEND_API_KEY?: string;
	ADMIN_EMAIL?: string;
	BOOKINGS?: KVNamespace;
}

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

/**
 * Send email using Resend API
 */
export async function sendEmail(env: Env, options: EmailOptions): Promise<boolean> {
	const apiKey = env.RESEND_API_KEY;

	if (!apiKey) {
		console.log('RESEND_API_KEY not configured, skipping email');
		return false;
	}

	try {
		const response = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
		body: JSON.stringify({
			from: 'Family Friends Hibachi <onboarding@resend.dev>',
			to: options.to,
			subject: options.subject,
			html: options.html,
		}),
		});

		if (!response.ok) {
			const error = await response.text();
			console.error('Email send failed:', error);
			logEmailFailure(env, options, `HTTP ${response.status}: ${error}`);
			return false;
		}

		return true;
	} catch (error) {
		console.error('Email error:', error);
		logEmailFailure(env, options, error instanceof Error ? error.message : 'Unknown error');
		return false;
	}
}

/**
 * Log email failure to KV for monitoring and retry
 */
function logEmailFailure(env: Env, options: EmailOptions, errorMsg: string): void {
	if (!env.BOOKINGS) return;

	const failure = {
		id: crypto.randomUUID(),
		to: options.to,
		subject: options.subject,
		error: errorMsg,
		failedAt: new Date().toISOString(),
		retryCount: 0,
	};

	env.BOOKINGS.get('email_failures', 'json').then((data) => {
		const failures: typeof failure[] = (data as typeof failure[]) || [];
		// Keep last 200 failures, remove oldest
		if (failures.length >= 200) {
			failures.splice(0, failures.length - 199);
		}
		failures.push(failure);
		return env.BOOKINGS!.put('email_failures', JSON.stringify(failures));
	}).catch(() => {
		// Fire-and-forget — don't let failure logging break the main flow
	});
}

/**
 * Build a Google Calendar URL for email templates (server-side, no i18n dependency)
 */
function buildGoogleCalendarUrl(booking: {
	name: string;
	date: string;
	time: string;
	guestCount: number;
	region: string;
}): string {
	const startTime = booking.time || '18:00';
	const [hours, minutes] = startTime.split(':').map(Number);
	const endHours = hours + 3;
	const endTime = `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

	const formatDT = (date: string, time: string) => {
		const d = new Date(`${date}T${time}:00`);
		return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
	};

	const start = formatDT(booking.date, startTime);
	const end = formatDT(booking.date, endTime);

	const title = 'Family Friends Hibachi Party';
	const description = `Hibachi at Home Experience\n\nGuests: ${booking.guestCount}\nRegion: ${booking.region.toUpperCase()}\nBooked by: ${booking.name}\nTime: ${startTime}\n\nOur chef will arrive 30 minutes early to set up.\n\nContact: 909-615-6633\nEmail: familyfriendshibachi@gmail.com`;
	const location = `${booking.region.toUpperCase()} Area - Address TBD`;

	const params = new URLSearchParams({
		action: 'TEMPLATE',
		text: title,
		dates: `${start}/${end}`,
		details: description,
		location: location,
	});

	return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Build an Outlook Calendar URL for email templates (server-side)
 */
function buildOutlookCalendarUrl(booking: {
	name: string;
	date: string;
	time: string;
	guestCount: number;
	region: string;
}): string {
	const startTime = booking.time || '18:00';
	const [hours, minutes] = startTime.split(':').map(Number);
	const endHours = hours + 3;
	const endTime = `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

	const startDateTime = `${booking.date}T${startTime}:00`;
	const endDateTime = `${booking.date}T${endTime}:00`;

	const params = new URLSearchParams({
		path: '/calendar/action/compose',
		rru: 'addevent',
		subject: 'Family Friends Hibachi Party',
		body: `Hibachi at Home Experience - ${booking.guestCount} guests, ${booking.region.toUpperCase()} - Booked by ${booking.name}`,
		location: `${booking.region.toUpperCase()} Area - Address TBD`,
		startdt: startDateTime,
		enddt: endDateTime,
	});

	return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generate customer confirmation email HTML
 * Uses light background for maximum compatibility across email clients
 */
export function generateCustomerEmail(booking: {
	name: string;
	date: string;
	time: string;
	guestCount: number;
	region: string;
	orderData?: BookingOrderData;
}): string {
	const formattedDate = new Date(booking.date + 'T00:00:00').toLocaleDateString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
	const safeName = escapeHtml(booking.name);
	const safeTime = escapeHtml(booking.time || 'To be confirmed');
	const safeRegion = escapeHtml(booking.region.toUpperCase());

	return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta name="color-scheme" content="light">
	<meta name="supported-color-schemes" content="light">
	<title>Booking Confirmation</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
	<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
		<tr>
			<td align="center">
				<table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
					<!-- Header -->
					<tr>
						<td style="background: linear-gradient(135deg, #ff6b35 0%, #ff8a5b 100%); padding: 30px; text-align: center;">
							<h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">🍱 Family Friends Hibachi</h1>
							<p style="margin: 10px 0 0; color: #ffffff; font-size: 16px;">Booking Request Received!</p>
						</td>
					</tr>
					
					<!-- Content -->
					<tr>
						<td style="padding: 40px 30px; background-color: #ffffff;">
							<h2 style="color: #1a1a2e; font-size: 24px; margin: 0 0 20px;">Hi ${safeName}! 👋</h2>
							<p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
								Thank you for your booking request! We've received your information and will contact you within <strong style="color: #ff6b35;">2 hours</strong> to confirm your reservation.
							</p>
							
							<!-- Booking Details -->
							<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff8f5; border: 2px solid #ffe5dc; border-radius: 12px; margin-bottom: 30px;">
								<tr>
									<td style="padding: 24px;">
										<h3 style="color: #ff6b35; font-size: 18px; margin: 0 0 20px;">📋 Booking Details</h3>
										<table width="100%" cellpadding="10" cellspacing="0">
											<tr>
												<td style="color: #666666; width: 120px; font-size: 14px;">📅 Date:</td>
												<td style="color: #1a1a2e; font-weight: 600; font-size: 15px;">${formattedDate}</td>
											</tr>
											<tr>
												<td style="color: #666666; font-size: 14px;">⏰ Time:</td>
												<td style="color: #1a1a2e; font-weight: 600; font-size: 15px;">${safeTime}</td>
											</tr>
											<tr>
												<td style="color: #666666; font-size: 14px;">👥 Guests:</td>
												<td style="color: #1a1a2e; font-weight: 600; font-size: 15px;">${booking.guestCount} people</td>
											</tr>
											<tr>
												<td style="color: #666666; font-size: 14px;">📍 Region:</td>
												<td style="color: #1a1a2e; font-weight: 600; font-size: 15px;">${safeRegion}</td>
											</tr>
											${booking.orderData ? `
											<tr><td colspan="2" style="padding-top: 15px; border-top: 1px solid #ffe5dc;"></td></tr>
											<tr>
												<td style="color: #666666; font-size: 14px;">🍱 Package:</td>
												<td style="color: #1a1a2e; font-weight: 600; font-size: 15px;">${escapeHtml(booking.orderData.packageName)}</td>
											</tr>
											${booking.orderData.proteins.length > 0 ? `
											<tr>
												<td style="color: #666666; font-size: 14px;">🥩 Proteins:</td>
												<td style="color: #1a1a2e; font-weight: 600; font-size: 15px;">${booking.orderData.proteins.map(p => escapeHtml(p)).join(', ')}</td>
											</tr>` : ''}
											${booking.orderData.addons.length > 0 ? `
											<tr>
												<td style="color: #666666; font-size: 14px;">🍜 Add-ons:</td>
												<td style="color: #1a1a2e; font-weight: 600; font-size: 15px;">${booking.orderData.addons.map(a => `${escapeHtml(a.name)} x${a.quantity}`).join(', ')}</td>
											</tr>` : ''}
											<tr>
												<td style="color: #666666; font-size: 14px;">💰 Est. Total:</td>
												<td style="color: #ff6b35; font-weight: 700; font-size: 16px;">$${booking.orderData.estimatedTotal.toLocaleString()}</td>
											</tr>
											` : ''}
										</table>
									</td>
								</tr>
							</table>

							<!-- Add to Calendar -->
							<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
								<tr>
									<td align="center">
										<a href="${buildGoogleCalendarUrl(booking)}" target="_blank" style="display: inline-block; background-color: #4285f4; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; margin: 5px;">📅 Google Calendar</a>
										<a href="${buildOutlookCalendarUrl(booking)}" target="_blank" style="display: inline-block; background-color: #0078d4; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; margin: 5px;">📅 Outlook</a>
									</td>
								</tr>
							</table>

							<!-- What's Next -->
							<h3 style="color: #1a1a2e; font-size: 18px; margin: 0 0 15px;">What's Next?</h3>
							<ul style="color: #4a4a4a; font-size: 14px; line-height: 2; padding-left: 20px; margin: 0 0 30px;">
								<li>Our team will call or text you to confirm availability</li>
								<li>We'll discuss your menu preferences and special requests</li>
								<li>You'll receive a final confirmation with all details</li>
							</ul>
							
							<!-- Contact -->
							<div style="background-color: #f8f8f8; padding: 20px; border-radius: 10px;">
								<p style="color: #666666; font-size: 14px; margin: 0;">
									Questions? Contact us anytime:<br><br>
									📞 <a href="tel:909-615-6633" style="color: #ff6b35; text-decoration: none; font-weight: 600;">909-615-6633</a><br>
									📧 <a href="mailto:familyfriendshibachi@gmail.com" style="color: #ff6b35; text-decoration: none; font-weight: 600;">familyfriendshibachi@gmail.com</a>
								</p>
							</div>
						</td>
					</tr>
					
					<!-- Footer -->
					<tr>
						<td style="background-color: #1a1a2e; padding: 20px 30px; text-align: center;">
							<p style="color: #fbbf24; font-size: 11px; margin: 0 0 10px; font-weight: 600;">
								⚠️ This is an automated email. Please do not reply directly.
							</p>
							<p style="color: #a1a1aa; font-size: 12px; margin: 0;">
								© ${new Date().getFullYear()} Family Friends Hibachi. All rights reserved.<br>
								California • Texas • Florida
							</p>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>
	`;
}

/**
 * Generate admin notification email HTML
 * Uses light background for maximum compatibility
 */
export function generateAdminEmail(booking: {
	id: string;
	name: string;
	email: string;
	phone: string;
	date: string;
	time: string;
	guestCount: number;
	region: string;
	message?: string;
	formType: string;
	orderData?: BookingOrderData;
}): string {
	const formattedDate = new Date(booking.date + 'T00:00:00').toLocaleDateString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
	const safeName = escapeHtml(booking.name);
	const safePhone = escapeHtml(booking.phone);
	const safeEmail = escapeHtml(booking.email);
	const safeTime = escapeHtml(booking.time || 'Not specified');
	const safeRegion = escapeHtml(booking.region.toUpperCase());
	const safeMessage = booking.message ? escapeHtml(booking.message) : '';
	const safeId = escapeHtml(booking.id);

	return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta name="color-scheme" content="light">
	<meta name="supported-color-schemes" content="light">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
	<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
		<tr>
			<td align="center">
				<table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); border: 2px solid #ff6b35;">
					<!-- Header -->
					<tr>
						<td style="background: linear-gradient(135deg, #ff6b35 0%, #ff8a5b 100%); padding: 20px; text-align: center;">
							<h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">🔔 New ${escapeHtml(booking.formType === 'booking' ? 'Booking' : 'Estimate')} Request!</h1>
						</td>
					</tr>
					
					<!-- Content -->
					<tr>
						<td style="padding: 30px; background-color: #ffffff;">
							<!-- Customer Info -->
							<h3 style="color: #ff6b35; font-size: 16px; margin: 0 0 15px; border-bottom: 2px solid #ffe5dc; padding-bottom: 10px;">👤 Customer Info</h3>
							<table width="100%" cellpadding="8" cellspacing="0" style="margin-bottom: 25px;">
								<tr>
									<td style="color: #666666; width: 100px; font-size: 14px;">Name:</td>
									<td style="color: #1a1a2e; font-weight: 700; font-size: 15px;">${safeName}</td>
								</tr>
								<tr>
									<td style="color: #666666; font-size: 14px;">Phone:</td>
									<td><a href="tel:${safePhone}" style="color: #16a34a; text-decoration: none; font-weight: 700; font-size: 15px;">${safePhone}</a></td>
								</tr>
								<tr>
									<td style="color: #666666; font-size: 14px;">Email:</td>
									<td><a href="mailto:${safeEmail}" style="color: #2563eb; text-decoration: none; font-size: 14px;">${safeEmail}</a></td>
								</tr>
							</table>
							
							<!-- Event Info -->
							<h3 style="color: #ff6b35; font-size: 16px; margin: 0 0 15px; border-bottom: 2px solid #ffe5dc; padding-bottom: 10px;">📅 Event Details</h3>
							<table width="100%" cellpadding="8" cellspacing="0" style="margin-bottom: 25px; background-color: #f8f8f8; border-radius: 8px;">
								<tr>
									<td style="color: #666666; width: 100px; font-size: 14px; padding: 12px;">Date:</td>
									<td style="color: #1a1a2e; font-weight: 700; font-size: 15px; padding: 12px;">${formattedDate}</td>
								</tr>
								<tr>
									<td style="color: #666666; font-size: 14px; padding: 12px;">Time:</td>
									<td style="color: #1a1a2e; font-weight: 600; font-size: 15px; padding: 12px;">${safeTime}</td>
								</tr>
								<tr>
									<td style="color: #666666; font-size: 14px; padding: 12px;">Guests:</td>
									<td style="color: #1a1a2e; font-weight: 700; font-size: 15px; padding: 12px;">${booking.guestCount} people</td>
								</tr>
								<tr>
									<td style="color: #666666; font-size: 14px; padding: 12px;">Region:</td>
									<td style="color: #1a1a2e; font-weight: 600; font-size: 15px; padding: 12px;">${safeRegion}</td>
								</tr>
							</table>
							
							${booking.orderData ? `
							<!-- Order Details -->
							<h3 style="color: #ff6b35; font-size: 16px; margin: 0 0 15px; border-bottom: 2px solid #ffe5dc; padding-bottom: 10px;">🍱 Order Details</h3>
							<table width="100%" cellpadding="8" cellspacing="0" style="margin-bottom: 25px; background-color: #fff8f5; border: 1px solid #ffe5dc; border-radius: 8px;">
								<tr>
									<td style="color: #666666; width: 100px; font-size: 14px; padding: 12px;">Package:</td>
									<td style="color: #1a1a2e; font-weight: 700; font-size: 15px; padding: 12px;">${escapeHtml(booking.orderData.packageName)} (${escapeHtml(booking.orderData.priceModel)})</td>
								</tr>
								<tr>
									<td style="color: #666666; font-size: 14px; padding: 12px;">Guests:</td>
									<td style="color: #1a1a2e; font-weight: 600; font-size: 15px; padding: 12px;">${booking.orderData.guestCount} adults${booking.orderData.kidsCount > 0 ? ` + ${booking.orderData.kidsCount} kids` : ''}</td>
								</tr>
								<tr>
									<td style="color: #666666; font-size: 14px; padding: 12px;">Service:</td>
									<td style="color: #1a1a2e; font-weight: 600; font-size: 15px; padding: 12px;">${escapeHtml(booking.orderData.serviceType)}, ${booking.orderData.serviceDuration} min</td>
								</tr>
								<tr>
									<td style="color: #666666; font-size: 14px; padding: 12px;">Proteins:</td>
									<td style="color: #1a1a2e; font-weight: 600; font-size: 15px; padding: 12px;">${booking.orderData.proteins.length > 0 ? booking.orderData.proteins.map(p => escapeHtml(p)).join(', ') : "Chef's Choice"}</td>
								</tr>
								${booking.orderData.addons.length > 0 ? `
								<tr>
									<td style="color: #666666; font-size: 14px; padding: 12px;">Add-ons:</td>
									<td style="color: #1a1a2e; font-weight: 600; font-size: 15px; padding: 12px;">${booking.orderData.addons.map(a => `${escapeHtml(a.name)} x${a.quantity} ($${a.unitPrice})`).join(', ')}</td>
								</tr>` : ''}
								<tr style="border-top: 2px solid #ff6b35;">
									<td style="color: #666666; font-size: 14px; padding: 12px;"><strong>Est. Total:</strong></td>
									<td style="color: #ff6b35; font-weight: 700; font-size: 18px; padding: 12px;">$${booking.orderData.estimatedTotal.toLocaleString()}</td>
								</tr>
							</table>
							` : ''}

							${safeMessage ? `
							<!-- Notes -->
							<h3 style="color: #ff6b35; font-size: 16px; margin: 0 0 15px; border-bottom: 2px solid #ffe5dc; padding-bottom: 10px;">📝 Notes</h3>
							<p style="color: #4a4a4a; background-color: #fff8f5; border: 1px solid #ffe5dc; padding: 15px; border-radius: 8px; margin: 0 0 25px; font-size: 14px; line-height: 1.6;">${safeMessage}</p>
							` : ''}

							<!-- Quick Actions -->
							<table width="100%" cellpadding="0" cellspacing="0">
								<tr>
									<td align="center" style="padding-top: 10px;">
										<a href="tel:${safePhone}" style="display: inline-block; background-color: #16a34a; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 5px; font-size: 14px;">📞 Call</a>
										<a href="sms:${safePhone}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 5px; font-size: 14px;">💬 Text</a>
										<a href="https://family-friends-hibachi.pages.dev/admin" style="display: inline-block; background-color: #ff6b35; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 5px; font-size: 14px;">📊 Dashboard</a>
									</td>
								</tr>
							</table>
						</td>
					</tr>
					
					<!-- Footer -->
					<tr>
						<td style="background-color: #1a1a2e; padding: 15px; text-align: center;">
							<p style="color: #a1a1aa; font-size: 11px; margin: 0;">
								Booking ID: ${safeId}<br>
								${new Date().toLocaleString()}
							</p>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>
	`;
}

/**
 * Generate booking confirmed email for customer
 * Uses light background for maximum compatibility
 */
export function generateConfirmedEmail(booking: {
	name: string;
	date: string;
	time: string;
	guestCount: number;
	region: string;
	orderData?: BookingOrderData;
}): string {
	const formattedDate = new Date(booking.date + 'T00:00:00').toLocaleDateString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
	const safeName = escapeHtml(booking.name);
	const safeTime = escapeHtml(booking.time || 'To be confirmed');
	const safeRegion = escapeHtml(booking.region.toUpperCase());

	return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta name="color-scheme" content="light">
	<meta name="supported-color-schemes" content="light">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
	<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
		<tr>
			<td align="center">
				<table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); border: 2px solid #16a34a;">
					<!-- Header -->
					<tr>
						<td style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; text-align: center;">
							<h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">✅ Booking Confirmed!</h1>
							<p style="margin: 10px 0 0; color: #ffffff; font-size: 16px;">Your hibachi party is all set!</p>
						</td>
					</tr>
					
					<!-- Content -->
					<tr>
						<td style="padding: 40px 30px; background-color: #ffffff;">
							<h2 style="color: #1a1a2e; font-size: 24px; margin: 0 0 20px;">Great news, ${safeName}! 🎉</h2>
							<p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
								Your hibachi party has been <strong style="color: #16a34a;">confirmed</strong>! Our chef will arrive 30 minutes early to set up everything.
							</p>
							
							<!-- Confirmed Details -->
							<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 12px; margin-bottom: 30px;">
								<tr>
									<td style="padding: 24px;">
										<h3 style="color: #16a34a; font-size: 18px; margin: 0 0 20px;">🎊 Confirmed Details</h3>
										<table width="100%" cellpadding="10" cellspacing="0">
											<tr>
												<td style="color: #666666; width: 120px; font-size: 14px;">📅 Date:</td>
												<td style="color: #1a1a2e; font-weight: 700; font-size: 15px;">${formattedDate}</td>
											</tr>
											<tr>
												<td style="color: #666666; font-size: 14px;">⏰ Time:</td>
												<td style="color: #1a1a2e; font-weight: 700; font-size: 15px;">${safeTime}</td>
											</tr>
											<tr>
												<td style="color: #666666; font-size: 14px;">👥 Guests:</td>
												<td style="color: #1a1a2e; font-weight: 700; font-size: 15px;">${booking.guestCount} people</td>
											</tr>
											<tr>
												<td style="color: #666666; font-size: 14px;">📍 Region:</td>
												<td style="color: #1a1a2e; font-weight: 700; font-size: 15px;">${safeRegion}</td>
											</tr>
											${booking.orderData ? `
											<tr><td colspan="2" style="padding-top: 15px; border-top: 1px solid #bbf7d0;"></td></tr>
											<tr>
												<td style="color: #666666; font-size: 14px;">🍱 Package:</td>
												<td style="color: #1a1a2e; font-weight: 700; font-size: 15px;">${escapeHtml(booking.orderData.packageName)}</td>
											</tr>
											<tr>
												<td style="color: #666666; font-size: 14px;">💰 Est. Total:</td>
												<td style="color: #16a34a; font-weight: 700; font-size: 16px;">$${booking.orderData.estimatedTotal.toLocaleString()}</td>
											</tr>
											` : ''}
										</table>
									</td>
								</tr>
							</table>

							<!-- Add to Calendar -->
							<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
								<tr>
									<td align="center">
										<a href="${buildGoogleCalendarUrl(booking)}" target="_blank" style="display: inline-block; background-color: #4285f4; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; margin: 5px;">📅 Google Calendar</a>
										<a href="${buildOutlookCalendarUrl(booking)}" target="_blank" style="display: inline-block; background-color: #0078d4; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; margin: 5px;">📅 Outlook</a>
									</td>
								</tr>
							</table>

							<!-- Reminders -->
							<h3 style="color: #1a1a2e; font-size: 18px; margin: 0 0 15px;">📝 Please Remember:</h3>
							<ul style="color: #4a4a4a; font-size: 14px; line-height: 2; padding-left: 20px; margin: 0 0 30px;">
								<li>Have a clear outdoor space ready (backyard, patio, or driveway)</li>
								<li>Ensure access to a power outlet nearby</li>
								<li>Have seating arranged for your guests</li>
								<li>Our chef will handle everything else!</li>
							</ul>
							
							<div style="background-color: #f8f8f8; padding: 20px; border-radius: 10px;">
								<p style="color: #666666; font-size: 14px; margin: 0;">
									Questions? Contact us:<br><br>
									📞 <a href="tel:909-615-6633" style="color: #ff6b35; text-decoration: none; font-weight: 600;">909-615-6633</a>
								</p>
							</div>
						</td>
					</tr>
					
					<!-- Footer -->
					<tr>
						<td style="background-color: #1a1a2e; padding: 20px 30px; text-align: center;">
							<p style="color: #fbbf24; font-size: 11px; margin: 0 0 10px; font-weight: 600;">
								⚠️ This is an automated email. Please do not reply directly.
							</p>
							<p style="color: #a1a1aa; font-size: 12px; margin: 0;">
								© ${new Date().getFullYear()} Family Friends Hibachi<br>
								#MoreSakeMoreHappy
							</p>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>
	`;
}

