/**
 * Admin Bookings API
 * GET /api/admin/bookings - Fetch bookings (filtered by role)
 * PATCH /api/admin/bookings - Update booking status / assign
 * DELETE /api/admin/bookings - Soft-delete a booking (super_admin only)
 */

import { validateToken, getCorsHeaders, escapeHtml } from '../_auth';
import type { AuthResult } from '../_auth';
import { sendEmail, generateConfirmedEmail } from '../_email';
import { logAction } from '../_auditLog';
import { createNotification } from '../_notifications';
import { validateStringLength, validateArrayLength } from '../_validation';
import { getShardMonth, readShard, writeShard, ensureMonthInIndex, readAllShards, readShardRange, paginateArray, parsePaginationParams } from '../_kvHelpers';
import { trackActivity } from '../_activity';

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
	adminNotes?: string;
	assignedTo?: string;
	createdAt: string;
	_version?: number;
	deletedAt?: string | null;
	dietaryRestrictions?: string[];
	allergens?: string[];
}

interface Env {
	BOOKINGS: KVNamespace;
	RESEND_API_KEY?: string;
	ADMIN_EMAIL?: string;
	ADMIN_PASSWORD?: string;
	ALLOWED_ORIGINS?: string;
}

// ---------------------------------------------------------------------------
// Status state machine — prevents invalid transitions
// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: Record<string, string[]> = {
	pending: ['confirmed', 'cancelled'],
	confirmed: ['completed', 'cancelled'],
	completed: [], // terminal state
	cancelled: ['pending'], // only super_admin can restore
};

function isValidTransition(
	from: string,
	to: string,
	role: string | undefined
): { valid: boolean; error?: string } {
	if (from === to) return { valid: true };

	const allowed = VALID_TRANSITIONS[from];
	if (!allowed || !allowed.includes(to)) {
		return {
			valid: false,
			error: `Cannot transition from '${from}' to '${to}'`,
		};
	}

	// Only super_admin can restore cancelled bookings
	if (from === 'cancelled' && to === 'pending' && role !== 'super_admin') {
		return {
			valid: false,
			error: 'Only admin can restore cancelled bookings',
		};
	}

	return { valid: true };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPerformedBy(auth: AuthResult): string {
	return auth.userId === '__env__' ? 'Admin' : (auth.userId || 'admin');
}

// ---------------------------------------------------------------------------
// GET - Fetch bookings (excludes soft-deleted by default)
// ---------------------------------------------------------------------------

export const onRequestGet: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);

	const authHeader = context.request.headers.get('Authorization');
	const auth = await validateToken(authHeader, context.env);
	if (!auth.valid) {
		return new Response(
			JSON.stringify({ success: false, error: 'Unauthorized' }),
			{ status: 401, headers: corsHeaders }
		);
	}

	if (auth.userId) {
		context.waitUntil(trackActivity(context.env.BOOKINGS, auth.userId));
	}

	try {
		const url = new URL(context.request.url);
		const { page, pageSize, search, sort, dir } = parsePaginationParams(url);
		const status = url.searchParams.get('status') || '';
		const region = url.searchParams.get('region') || '';
		const dateFrom = url.searchParams.get('dateFrom') || '';
		const dateTo = url.searchParams.get('dateTo') || '';
		const assignedTo = url.searchParams.get('assignedTo') || '';
		const includeDeleted = url.searchParams.get('includeDeleted') === 'true' && auth.role === 'super_admin';

		// Load bookings: prefer shards when date range given, fallback to legacy key
		let bookings: Booking[];
		if (dateFrom && dateTo) {
			const fromMonth = dateFrom.slice(0, 7);
			const toMonth = dateTo.slice(0, 7);
			bookings = await readShardRange<Booking>(context.env.BOOKINGS, 'bookings', fromMonth, toMonth);
			// If shards empty, fallback to legacy key
			if (bookings.length === 0) {
				const data = await context.env.BOOKINGS.get('bookings_list', 'json');
				bookings = (data as Booking[]) || [];
			}
		} else {
			// Try shards first, fallback to legacy
			bookings = await readAllShards<Booking>(context.env.BOOKINGS, 'bookings');
			if (bookings.length === 0) {
				const data = await context.env.BOOKINGS.get('bookings_list', 'json');
				bookings = (data as Booking[]) || [];
			}
		}

		// Exclude soft-deleted unless requested by super_admin
		if (!includeDeleted) {
			bookings = bookings.filter(b => !b.deletedAt);
		}

		// Order managers can only see bookings assigned to them
		if (auth.role === 'order_manager') {
			bookings = bookings.filter(b => b.assignedTo === auth.userId);
		}

		// Apply filters
		if (status) {
			bookings = bookings.filter(b => b.status === status);
		}
		if (region) {
			const regionLower = region.toLowerCase();
			bookings = bookings.filter(b => b.region?.toLowerCase() === regionLower);
		}
		if (assignedTo) {
			bookings = bookings.filter(b => b.assignedTo === assignedTo);
		}
		if (dateFrom) {
			bookings = bookings.filter(b => b.date >= dateFrom);
		}
		if (dateTo) {
			bookings = bookings.filter(b => b.date <= dateTo);
		}
		if (search) {
			bookings = bookings.filter(b =>
				b.name?.toLowerCase().includes(search) ||
				b.email?.toLowerCase().includes(search) ||
				b.phone?.toLowerCase().includes(search)
			);
		}

		// Sort
		const sortField = sort as keyof Booking;
		bookings.sort((a, b) => {
			let aVal: string | number = '';
			let bVal: string | number = '';
			if (sortField === 'guestCount') {
				aVal = a.guestCount || 0;
				bVal = b.guestCount || 0;
			} else if (sortField === 'name') {
				aVal = (a.name || '').toLowerCase();
				bVal = (b.name || '').toLowerCase();
			} else if (sortField === 'date') {
				aVal = a.date || '';
				bVal = b.date || '';
			} else if (sortField === 'status') {
				aVal = a.status || '';
				bVal = b.status || '';
			} else {
				// Default: createdAt
				aVal = a.createdAt || '';
				bVal = b.createdAt || '';
			}
			if (aVal < bVal) return dir === 'asc' ? -1 : 1;
			if (aVal > bVal) return dir === 'asc' ? 1 : -1;
			return 0;
		});

		// Field visibility stripping for order_managers
		if (auth.role === 'order_manager') {
			const usersRaw = await context.env.BOOKINGS.get('admin_users', 'json') as any[] | null;
			const currentUser = usersRaw?.find((u: any) => u.id === auth.userId);
			const visibility = currentUser?.visibility || 'standard';

			if (visibility === 'minimal') {
				bookings = bookings.map(b => ({
					id: b.id,
					name: b.name,
					date: b.date,
					time: b.time,
					guestCount: b.guestCount,
					region: b.region,
					status: b.status,
					assignedTo: b.assignedTo,
					createdAt: b.createdAt,
					email: '***',
					phone: '***',
					formType: b.formType,
				} as Booking));
			} else if (visibility === 'standard') {
				bookings = bookings.map(b => ({
					...b,
					orderData: b.orderData ? { ...b.orderData, estimatedTotal: 0 } : undefined,
					couponDiscount: undefined,
					couponCode: undefined,
				} as Booking));
			}
			// 'full' = no stripping
		}

		// Paginate
		const result = paginateArray(bookings, page, pageSize);

		return new Response(
			JSON.stringify({
				success: true,
				bookings: result.data,
				data: result.data,
				total: result.total,
				page: result.page,
				pageSize: result.pageSize,
			}),
			{ headers: corsHeaders }
		);
	} catch (error) {
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to fetch bookings' }),
			{ status: 500, headers: corsHeaders }
		);
	}
};

// ---------------------------------------------------------------------------
// PATCH - Update booking with optimistic locking + state machine
// ---------------------------------------------------------------------------

export const onRequestPatch: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);

	const authHeader = context.request.headers.get('Authorization');
	const auth = await validateToken(authHeader, context.env);
	if (!auth.valid) {
		return new Response(
			JSON.stringify({ success: false, error: 'Unauthorized' }),
			{ status: 401, headers: corsHeaders }
		);
	}

	if (auth.userId) {
		context.waitUntil(trackActivity(context.env.BOOKINGS, auth.userId));
	}

	try {
		const body = await context.request.json() as Partial<Booking> & { id: string; _version?: number };
		const { id } = body;

		if (!id) {
			return new Response(
				JSON.stringify({ success: false, error: 'Booking ID is required' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		const VALID_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];
		if (body.status && !VALID_STATUSES.includes(body.status)) {
			return new Response(
				JSON.stringify({ success: false, error: 'Invalid booking status' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		// XSS protection on text fields
		if (body.adminNotes !== undefined) {
			body.adminNotes = escapeHtml(body.adminNotes);
		}
		if (body.name) {
			body.name = escapeHtml(body.name);
		}
		if (body.message !== undefined) {
			body.message = escapeHtml(body.message);
		}

		// Input length validation
		if (body.adminNotes !== undefined) {
			const err = validateStringLength(body.adminNotes, 'adminNotes', 2000);
			if (err) {
				return new Response(
					JSON.stringify({ success: false, error: err }),
					{ status: 400, headers: corsHeaders }
				);
			}
		}
		if (body.dietaryRestrictions !== undefined) {
			const err = validateArrayLength(body.dietaryRestrictions, 'dietaryRestrictions', 20, 100);
			if (err) {
				return new Response(
					JSON.stringify({ success: false, error: err }),
					{ status: 400, headers: corsHeaders }
				);
			}
		}
		if (body.allergens !== undefined) {
			const err = validateArrayLength(body.allergens, 'allergens', 20, 100);
			if (err) {
				return new Response(
					JSON.stringify({ success: false, error: err }),
					{ status: 400, headers: corsHeaders }
				);
			}
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

		const existing = bookings[bookingIndex];

		// Reject updates to soft-deleted bookings
		if (existing.deletedAt) {
			return new Response(
				JSON.stringify({ success: false, error: 'Cannot update a deleted booking' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		// Optimistic locking — check version if client sends it
		if (body._version !== undefined && existing._version !== undefined) {
			if (body._version !== existing._version) {
				return new Response(
					JSON.stringify({
						success: false,
						error: 'This booking has been modified by another user. Please refresh and try again.',
						code: 'VERSION_CONFLICT',
					}),
					{ status: 409, headers: corsHeaders }
				);
			}
		}

		// Order managers can only update bookings assigned to them
		if (auth.role === 'order_manager' && existing.assignedTo !== auth.userId) {
			return new Response(
				JSON.stringify({ success: false, error: 'Access denied' }),
				{ status: 403, headers: corsHeaders }
			);
		}

		// Only super_admin can assign bookings
		if (body.assignedTo !== undefined && auth.role !== 'super_admin') {
			return new Response(
				JSON.stringify({ success: false, error: 'Only admin can assign bookings' }),
				{ status: 403, headers: corsHeaders }
			);
		}

		// Status state machine validation
		if (body.status && body.status !== existing.status) {
			const transition = isValidTransition(existing.status, body.status, auth.role);
			if (!transition.valid) {
				return new Response(
					JSON.stringify({ success: false, error: transition.error }),
					{ status: 400, headers: corsHeaders }
				);
			}
		}

		const previousStatus = existing.status;

		// Update editable fields + bump version
		bookings[bookingIndex] = {
			...existing,
			...(body.status && { status: body.status }),
			...(body.date && { date: body.date }),
			...(body.time !== undefined && { time: body.time }),
			...(body.guestCount !== undefined && { guestCount: body.guestCount }),
			...(body.region && { region: body.region }),
			...(body.name && { name: body.name }),
			...(body.email && { email: body.email }),
			...(body.phone && { phone: body.phone }),
			...(body.adminNotes !== undefined && { adminNotes: body.adminNotes }),
			...(body.message !== undefined && { message: body.message }),
			...(body.assignedTo !== undefined && { assignedTo: body.assignedTo || undefined }),
			...(body.dietaryRestrictions !== undefined && { dietaryRestrictions: body.dietaryRestrictions }),
			...(body.allergens !== undefined && { allergens: body.allergens }),
			_version: (existing._version || 0) + 1,
		};

		const status = bookings[bookingIndex].status;
		await context.env.BOOKINGS.put('bookings_list', JSON.stringify(bookings));

		// Dual-write to monthly shard (migration period)
		const shardMonth = getShardMonth(existing.date);
		const shardBookings = await readShard<Booking>(context.env.BOOKINGS, 'bookings', shardMonth);
		const shardIdx = shardBookings.findIndex(b => b.id === id);
		if (shardIdx !== -1) {
			shardBookings[shardIdx] = bookings[bookingIndex];
		} else {
			shardBookings.push(bookings[bookingIndex]);
		}
		await writeShard(context.env.BOOKINGS, 'bookings', shardMonth, shardBookings);
		await ensureMonthInIndex(context.env.BOOKINGS, 'bookings', shardMonth);

		const booking = bookings[bookingIndex];

		// Audit log
		const changes: string[] = [];
		if (body.status) changes.push(`status: ${previousStatus} → ${body.status}`);
		if (body.date) changes.push(`date: ${body.date}`);
		if (body.name) changes.push(`name: ${body.name}`);
		if (body.assignedTo !== undefined) changes.push(`assignedTo: ${body.assignedTo || 'unassigned'}`);
		logAction(context.env.BOOKINGS, {
			action: 'updated',
			entity: 'booking',
			entityId: id,
			details: `Updated booking for ${booking.name}${changes.length ? ': ' + changes.join(', ') : ''}`,
			performedBy: getPerformedBy(auth),
		}).catch(() => {});

		// Fire-and-forget notifications
		if (body.assignedTo !== undefined && body.assignedTo && body.assignedTo !== existing.assignedTo) {
			createNotification(
				context.env.BOOKINGS,
				body.assignedTo,
				'booking_assigned',
				'Booking Assigned',
				`Booking for ${booking.name} on ${booking.date} has been assigned to you.`,
				id
			).catch(() => {});
		}
		if (body.status && body.status !== previousStatus && booking.assignedTo) {
			createNotification(
				context.env.BOOKINGS,
				booking.assignedTo,
				'status_changed',
				'Status Changed',
				`Booking for ${booking.name} status changed from ${previousStatus} to ${body.status}.`,
				id
			).catch(() => {});
		}

		// Send confirmation email when status changes to "confirmed"
		if (status === 'confirmed' && previousStatus !== 'confirmed') {
			sendEmail(context.env, {
				to: booking.email,
				subject: `✅ Booking Confirmed - Family Friends Hibachi`,
				html: generateConfirmedEmail(booking),
			}).catch(err => console.error('Failed to send confirmation email:', err));
		}

		// Track specific action after successful update
		if (auth.userId) {
			context.waitUntil(trackActivity(context.env.BOOKINGS, auth.userId, 'booking_update'));
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

// ---------------------------------------------------------------------------
// DELETE - Soft-delete a booking (super_admin only)
// ---------------------------------------------------------------------------

export const onRequestDelete: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);

	const authHeader = context.request.headers.get('Authorization');
	const auth = await validateToken(authHeader, context.env);
	if (!auth.valid) {
		return new Response(
			JSON.stringify({ success: false, error: 'Unauthorized' }),
			{ status: 401, headers: corsHeaders }
		);
	}

	if (auth.userId) {
		context.waitUntil(trackActivity(context.env.BOOKINGS, auth.userId));
	}

	// Only super_admin can delete bookings
	if (auth.role !== 'super_admin') {
		return new Response(
			JSON.stringify({ success: false, error: 'Access denied' }),
			{ status: 403, headers: corsHeaders }
		);
	}

	try {
		const { id } = await context.request.json() as { id: string };

		const data = await context.env.BOOKINGS.get('bookings_list', 'json');
		const bookings: Booking[] = (data as Booking[]) || [];

		const bookingIndex = bookings.findIndex(b => b.id === id);
		if (bookingIndex === -1) {
			return new Response(
				JSON.stringify({ success: false, error: 'Booking not found' }),
				{ status: 404, headers: corsHeaders }
			);
		}

		const deletedBooking = bookings[bookingIndex];

		// Soft delete — set deletedAt timestamp instead of removing
		bookings[bookingIndex] = {
			...bookings[bookingIndex],
			deletedAt: new Date().toISOString(),
			_version: (bookings[bookingIndex]._version || 0) + 1,
		};
		await context.env.BOOKINGS.put('bookings_list', JSON.stringify(bookings));

		// Dual-write to monthly shard (migration period)
		const shardMonth = getShardMonth(deletedBooking.date);
		const shardBookings = await readShard<Booking>(context.env.BOOKINGS, 'bookings', shardMonth);
		const shardIdx = shardBookings.findIndex(b => b.id === id);
		if (shardIdx !== -1) {
			shardBookings[shardIdx] = bookings[bookingIndex];
		} else {
			shardBookings.push(bookings[bookingIndex]);
		}
		await writeShard(context.env.BOOKINGS, 'bookings', shardMonth, shardBookings);
		await ensureMonthInIndex(context.env.BOOKINGS, 'bookings', shardMonth);

		// Audit log
		logAction(context.env.BOOKINGS, {
			action: 'deleted',
			entity: 'booking',
			entityId: id,
			details: `Soft-deleted booking for ${deletedBooking.name} (${deletedBooking.date})`,
			performedBy: getPerformedBy(auth),
		}).catch(() => {});

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
