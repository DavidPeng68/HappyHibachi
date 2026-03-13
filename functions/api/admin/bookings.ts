/**
 * Admin Bookings API
 * GET /api/admin/bookings - Fetch all bookings
 * PATCH /api/admin/bookings - Update booking status
 * DELETE /api/admin/bookings - Delete a booking
 */

import { validateToken, getCorsHeaders } from '../_auth';
import { sendEmail, generateConfirmedEmail } from '../_email';

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
	createdAt: string;
}

interface Env {
	BOOKINGS: KVNamespace;
	RESEND_API_KEY?: string;
	ADMIN_EMAIL?: string;
	ADMIN_PASSWORD?: string;
	ALLOWED_ORIGINS?: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);

	const authHeader = context.request.headers.get('Authorization');
	if (!(await validateToken(authHeader, context.env))) {
		return new Response(
			JSON.stringify({ success: false, error: 'Unauthorized' }),
			{ status: 401, headers: corsHeaders }
		);
	}

	try {
		const data = await context.env.BOOKINGS.get('bookings_list', 'json');
		const bookings: Booking[] = (data as Booking[]) || [];

		// Sort by createdAt descending
		bookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

		return new Response(
			JSON.stringify({ success: true, bookings }),
			{ headers: corsHeaders }
		);
	} catch (error) {
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to fetch bookings' }),
			{ status: 500, headers: corsHeaders }
		);
	}
};

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
		const { id, status } = await context.request.json() as { id: string; status: Booking['status'] };

		const VALID_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];
		if (!VALID_STATUSES.includes(status)) {
			return new Response(
				JSON.stringify({ success: false, error: 'Invalid booking status' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		const data = await context.env.BOOKINGS.get('bookings_list', 'json');
		const bookings: Booking[] = (data as Booking[]) || [];

		const bookingIndex = bookings.findIndex(b => b.id === id);
		if (bookingIndex === -1) {
			return new Response(
				JSON.stringify({ success: false, error: 'Booking not found' }),
				{ status: 404, headers: corsHeaders }
			);
		}

		const previousStatus = bookings[bookingIndex].status;
		bookings[bookingIndex].status = status;
		await context.env.BOOKINGS.put('bookings_list', JSON.stringify(bookings));

		const booking = bookings[bookingIndex];

		// Send confirmation email when status changes to "confirmed"
		if (status === 'confirmed' && previousStatus !== 'confirmed') {
			sendEmail(context.env, {
				to: booking.email,
				subject: `✅ Booking Confirmed - Family Friends Hibachi`,
				html: generateConfirmedEmail(booking),
			}).catch(err => console.error('Failed to send confirmation email:', err));
		}

		return new Response(
			JSON.stringify({ success: true, booking }),
			{ headers: corsHeaders }
		);
	} catch (error) {
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to update booking' }),
			{ status: 500, headers: corsHeaders }
		);
	}
};

// DELETE - Delete a booking
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

		const data = await context.env.BOOKINGS.get('bookings_list', 'json');
		let bookings: Booking[] = (data as Booking[]) || [];

		const bookingIndex = bookings.findIndex(b => b.id === id);
		if (bookingIndex === -1) {
			return new Response(
				JSON.stringify({ success: false, error: 'Booking not found' }),
				{ status: 404, headers: corsHeaders }
			);
		}

		// Remove the booking
		bookings = bookings.filter(b => b.id !== id);
		await context.env.BOOKINGS.put('bookings_list', JSON.stringify(bookings));

		return new Response(
			JSON.stringify({ success: true }),
			{ headers: corsHeaders }
		);
	} catch (error) {
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to delete booking' }),
			{ status: 500, headers: corsHeaders }
		);
	}
};

export const onRequestOptions: PagesFunction<Env> = async (context) => {
	return new Response(null, {
		status: 204,
		headers: getCorsHeaders(context.request, context.env),
	});
};
