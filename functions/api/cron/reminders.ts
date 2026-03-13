/**
 * Cron Job: 自动发送活动提醒邮件
 * 每天检查明天的预约，发送提醒邮件给客户
 * 
 * 触发方式：
 * 1. Cloudflare Cron Trigger (推荐)
 * 2. 外部 Cron 服务调用此 API
 */

import { sendEmail } from '../_email';

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
	reminded?: boolean;
}

interface Env {
	BOOKINGS: KVNamespace;
	RESEND_API_KEY?: string;
	CRON_SECRET?: string;
}

/**
 * 生成提醒邮件 HTML
 */
function generateReminderEmail(booking: Booking): string {
	const eventDate = new Date(booking.date + 'T00:00:00');
	const formattedDate = eventDate.toLocaleDateString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});

	return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta name="color-scheme" content="light">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
	<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
		<tr>
			<td align="center">
				<table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
					<!-- Header -->
					<tr>
						<td style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); padding: 30px; text-align: center;">
							<h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">⏰ Reminder: Tomorrow!</h1>
							<p style="margin: 10px 0 0; color: #ffffff; font-size: 16px;">Your hibachi party is coming up!</p>
						</td>
					</tr>
					
					<!-- Content -->
					<tr>
						<td style="padding: 40px 30px; background-color: #ffffff;">
							<h2 style="color: #1a1a2e; font-size: 24px; margin: 0 0 20px;">Hi ${booking.name}! 👋</h2>
							<p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
								This is a friendly reminder that your <strong style="color: #ff6b35;">Family Friends Hibachi party</strong> is <strong>tomorrow</strong>! We're excited to bring the sizzle to your event.
							</p>
							
							<!-- Event Details -->
							<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fffbeb; border: 2px solid #fde68a; border-radius: 12px; margin-bottom: 30px;">
								<tr>
									<td style="padding: 24px;">
										<h3 style="color: #b45309; font-size: 18px; margin: 0 0 20px;">📋 Event Details</h3>
										<table width="100%" cellpadding="10" cellspacing="0">
											<tr>
												<td style="color: #666666; width: 120px; font-size: 14px;">📅 Date:</td>
												<td style="color: #1a1a2e; font-weight: 700; font-size: 15px;">${formattedDate}</td>
											</tr>
											<tr>
												<td style="color: #666666; font-size: 14px;">⏰ Time:</td>
												<td style="color: #1a1a2e; font-weight: 700; font-size: 15px;">${booking.time || 'As confirmed'}</td>
											</tr>
											<tr>
												<td style="color: #666666; font-size: 14px;">👥 Guests:</td>
												<td style="color: #1a1a2e; font-weight: 700; font-size: 15px;">${booking.guestCount} people</td>
											</tr>
											<tr>
												<td style="color: #666666; font-size: 14px;">📍 Region:</td>
												<td style="color: #1a1a2e; font-weight: 700; font-size: 15px;">${booking.region.toUpperCase()}</td>
											</tr>
										</table>
									</td>
								</tr>
							</table>
							
							<!-- Checklist -->
							<h3 style="color: #1a1a2e; font-size: 18px; margin: 0 0 15px;">✅ Quick Checklist:</h3>
							<ul style="color: #4a4a4a; font-size: 14px; line-height: 2; padding-left: 20px; margin: 0 0 30px;">
								<li>Outdoor cooking area is clear and ready</li>
								<li>Power outlet is accessible nearby</li>
								<li>Seating is arranged for your guests</li>
								<li>Weather looks good (or have a covered area ready)</li>
							</ul>

							<div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 10px; margin-bottom: 30px;">
								<p style="color: #166534; font-size: 14px; margin: 0; font-weight: 600;">
									🚗 Our chef will arrive <strong>30 minutes early</strong> to set up everything!
								</p>
							</div>
							
							<!-- Contact -->
							<div style="background-color: #f8f8f8; padding: 20px; border-radius: 10px;">
								<p style="color: #666666; font-size: 14px; margin: 0;">
									Questions or need to make changes?<br><br>
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
								© ${new Date().getFullYear()} Family Friends Hibachi<br>
								#MoreSakeMoreHappy 🍶
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
 * 获取明天的日期 (YYYY-MM-DD 格式)
 */
function getTomorrowDate(): string {
	const tomorrow = new Date();
	tomorrow.setDate(tomorrow.getDate() + 1);
	return tomorrow.toISOString().split('T')[0];
}

/**
 * POST /api/cron/reminders - 发送提醒邮件
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
	const corsHeaders = {
		'Access-Control-Allow-Origin': '*',
		'Content-Type': 'application/json',
	};

	const authHeader = context.request.headers.get('Authorization');
	const cronSecret = context.env.CRON_SECRET;

	if (!cronSecret) {
		return new Response(
			JSON.stringify({ success: false, error: 'Server misconfigured: CRON_SECRET not set' }),
			{ status: 500, headers: corsHeaders }
		);
	}

	if (authHeader !== `Bearer ${cronSecret}`) {
		return new Response(
			JSON.stringify({ success: false, error: 'Unauthorized' }),
			{ status: 401, headers: corsHeaders }
		);
	}

	try {
		const tomorrow = getTomorrowDate();
		console.log(`Checking reminders for date: ${tomorrow}`);

		// 获取所有预约
		const bookingsData = await context.env.BOOKINGS.get('bookings_list', 'json');
		const bookings: Booking[] = (bookingsData as Booking[]) || [];

		// 筛选明天的已确认预约，且未发送过提醒
		const tomorrowBookings = bookings.filter(
			(b) => b.date === tomorrow && 
				   b.status === 'confirmed' && 
				   !b.reminded
		);

		console.log(`Found ${tomorrowBookings.length} bookings for tomorrow`);

		const results: { id: string; email: string; success: boolean }[] = [];

		// 发送提醒邮件
		for (const booking of tomorrowBookings) {
			const emailSent = await sendEmail(context.env, {
				to: booking.email,
				subject: `⏰ Reminder: Your Hibachi Party is Tomorrow!`,
				html: generateReminderEmail(booking),
			});

			results.push({
				id: booking.id,
				email: booking.email,
				success: emailSent,
			});

			// 标记为已提醒
			if (emailSent) {
				booking.reminded = true;
			}
		}

		// 更新预约列表
		if (tomorrowBookings.length > 0) {
			const updatedBookings = bookings.map((b) => {
				const reminded = tomorrowBookings.find((tb) => tb.id === b.id);
				return reminded ? { ...b, reminded: true } : b;
			});
			await context.env.BOOKINGS.put('bookings_list', JSON.stringify(updatedBookings));
		}

		return new Response(
			JSON.stringify({
				success: true,
				date: tomorrow,
				processed: tomorrowBookings.length,
				results,
			}),
			{ headers: corsHeaders }
		);
	} catch (error) {
		console.error('Reminder cron error:', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to process reminders' }),
			{ status: 500, headers: corsHeaders }
		);
	}
};

// GET - 手动检查状态 (admin only)
export const onRequestGet: PagesFunction<Env> = async (context) => {
	const corsHeaders = {
		'Access-Control-Allow-Origin': '*',
		'Content-Type': 'application/json',
	};

	const cronSecret = context.env.CRON_SECRET;
	const authHeader = context.request.headers.get('Authorization');
	if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
		return new Response(
			JSON.stringify({ success: false, error: 'Unauthorized' }),
			{ status: 401, headers: corsHeaders }
		);
	}

	try {
		const tomorrow = getTomorrowDate();
		
		const bookingsData = await context.env.BOOKINGS.get('bookings_list', 'json');
		const bookings: Booking[] = (bookingsData as Booking[]) || [];

		const tomorrowBookings = bookings.filter(
			(b) => b.date === tomorrow && b.status === 'confirmed'
		);

		return new Response(
			JSON.stringify({
				success: true,
				date: tomorrow,
				pendingReminders: tomorrowBookings.filter(b => !b.reminded).length,
				alreadyReminded: tomorrowBookings.filter(b => b.reminded).length,
			}),
			{ headers: corsHeaders }
		);
	} catch (error) {
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to check reminders' }),
			{ status: 500, headers: corsHeaders }
		);
	}
};

export const onRequestOptions: PagesFunction = async () => {
	return new Response(null, {
		status: 204,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		},
	});
};

