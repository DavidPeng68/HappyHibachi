/**
 * Admin Customers API
 * GET /api/admin/customers - Aggregate customers from bookings
 * PATCH /api/admin/customers - Update customer notes/tags
 */

import { validateToken, requireSuperAdmin, getCorsHeaders } from '../_auth';

interface BookingOrderData {
	estimatedTotal: number;
	[key: string]: unknown;
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
	orderData?: BookingOrderData;
	createdAt: string;
}

interface Customer {
	email: string;
	name: string;
	phone: string;
	region: string;
	totalBookings: number;
	completedBookings: number;
	cancelledBookings: number;
	totalRevenue: number;
	firstBookingDate: string;
	lastBookingDate: string;
	notes: string;
	tags: string[];
}

interface CustomerNotes {
	[emailHash: string]: string;
}

interface CustomerTags {
	[emailHash: string]: string[];
}

interface Env {
	BOOKINGS: KVNamespace;
	ADMIN_PASSWORD?: string;
	ALLOWED_ORIGINS?: string;
}

function hashEmail(email: string): string {
	return email.toLowerCase().trim();
}

// GET - Aggregate customers from bookings
export const onRequestGet: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);

	const authHeader = context.request.headers.get('Authorization');
	const auth = await validateToken(authHeader, context.env);
	const denied = requireSuperAdmin(auth, corsHeaders);
	if (denied) return denied;

	try {
		const [bookingsData, notesData, tagsData] = await Promise.all([
			context.env.BOOKINGS.get('bookings_list', 'json'),
			context.env.BOOKINGS.get('customers_notes', 'json'),
			context.env.BOOKINGS.get('customers_tags', 'json'),
		]);

		const bookings: Booking[] = (bookingsData as Booking[]) || [];
		const notes: CustomerNotes = (notesData as CustomerNotes) || {};
		const tags: CustomerTags = (tagsData as CustomerTags) || {};

		// Group bookings by email
		const customerMap = new Map<string, {
			bookings: Booking[];
			regions: Map<string, number>;
		}>();

		for (const booking of bookings) {
			const key = hashEmail(booking.email);
			if (!customerMap.has(key)) {
				customerMap.set(key, { bookings: [], regions: new Map() });
			}
			const entry = customerMap.get(key)!;
			entry.bookings.push(booking);
			entry.regions.set(booking.region, (entry.regions.get(booking.region) || 0) + 1);
		}

		const customers: Customer[] = [];

		for (const [emailKey, { bookings: customerBookings, regions }] of customerMap) {
			// Sort by createdAt descending to get latest info
			customerBookings.sort(
				(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
			);

			const latest = customerBookings[0];
			const oldest = customerBookings[customerBookings.length - 1];

			// Most frequent region
			let topRegion = '';
			let topRegionCount = 0;
			for (const [region, count] of regions) {
				if (count > topRegionCount) {
					topRegion = region;
					topRegionCount = count;
				}
			}

			const completedBookings = customerBookings.filter((b) => b.status === 'completed');
			const cancelledBookings = customerBookings.filter((b) => b.status === 'cancelled');

			const totalRevenue = completedBookings.reduce((sum, b) => {
				return sum + (b.orderData?.estimatedTotal || 0);
			}, 0);

			customers.push({
				email: latest.email,
				name: latest.name,
				phone: latest.phone,
				region: topRegion,
				totalBookings: customerBookings.length,
				completedBookings: completedBookings.length,
				cancelledBookings: cancelledBookings.length,
				totalRevenue,
				firstBookingDate: oldest.createdAt,
				lastBookingDate: latest.createdAt,
				notes: notes[emailKey] || '',
				tags: tags[emailKey] || [],
			});
		}

		// Sort by lastBookingDate descending
		customers.sort(
			(a, b) => new Date(b.lastBookingDate).getTime() - new Date(a.lastBookingDate).getTime(),
		);

		return new Response(
			JSON.stringify({ success: true, customers }),
			{ headers: corsHeaders },
		);
	} catch (error) {
		console.error('Fetch customers error:', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to fetch customers' }),
			{ status: 500, headers: corsHeaders },
		);
	}
};

// PATCH - Update customer notes/tags
export const onRequestPatch: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);

	const authHeader = context.request.headers.get('Authorization');
	const auth = await validateToken(authHeader, context.env);
	const denied = requireSuperAdmin(auth, corsHeaders);
	if (denied) return denied;

	try {
		const body = (await context.request.json()) as {
			email: string;
			notes?: string;
			tags?: string[];
		};

		if (!body.email) {
			return new Response(
				JSON.stringify({ success: false, error: 'Email is required' }),
				{ status: 400, headers: corsHeaders },
			);
		}

		const emailKey = hashEmail(body.email);

		if (body.notes !== undefined) {
			const notesData = await context.env.BOOKINGS.get('customers_notes', 'json');
			const notes: CustomerNotes = (notesData as CustomerNotes) || {};
			notes[emailKey] = body.notes;
			await context.env.BOOKINGS.put('customers_notes', JSON.stringify(notes));
		}

		if (body.tags !== undefined) {
			const tagsData = await context.env.BOOKINGS.get('customers_tags', 'json');
			const tags: CustomerTags = (tagsData as CustomerTags) || {};
			tags[emailKey] = body.tags;
			await context.env.BOOKINGS.put('customers_tags', JSON.stringify(tags));
		}

		return new Response(
			JSON.stringify({ success: true }),
			{ headers: corsHeaders },
		);
	} catch (error) {
		console.error('Update customer error:', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to update customer' }),
			{ status: 500, headers: corsHeaders },
		);
	}
};

export const onRequestOptions: PagesFunction<Env> = async (context) => {
	return new Response(null, {
		status: 204,
		headers: getCorsHeaders(context.request, context.env),
	});
};
