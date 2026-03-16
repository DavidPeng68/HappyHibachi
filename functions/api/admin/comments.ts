import { validateToken, getCorsHeaders } from '../_auth';
import { logAction } from '../_auditLog';
import { trackActivity } from '../_activity';
import { createNotification } from '../_notifications';

interface Comment {
	id: string;
	bookingId: string;
	userId: string;
	displayName: string;
	content: string;
	createdAt: string;
}

interface Env {
	BOOKINGS: KVNamespace;
	ADMIN_PASSWORD?: string;
	ALLOWED_ORIGINS?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
	const { request, env } = context;
	const corsHeaders = getCorsHeaders(request, env);

	if (request.method === 'OPTIONS') {
		return new Response(null, { headers: corsHeaders });
	}

	const auth = await validateToken(request.headers.get('Authorization'), env);
	if (!auth.valid) {
		return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
			status: 401,
			headers: corsHeaders,
		});
	}

	if (auth.userId) {
		context.waitUntil(trackActivity(env.BOOKINGS, auth.userId));
	}

	const kv = env.BOOKINGS;

	// GET - fetch comments for a booking
	if (request.method === 'GET') {
		const url = new URL(request.url);
		const bookingId = url.searchParams.get('bookingId');
		if (!bookingId) {
			return new Response(JSON.stringify({ success: false, error: 'bookingId required' }), {
				status: 400,
				headers: corsHeaders,
			});
		}
		const comments = (await kv.get(`comments:${bookingId}`, 'json')) as Comment[] | null;
		return new Response(JSON.stringify({ success: true, comments: comments || [] }), {
			headers: corsHeaders,
		});
	}

	// POST - add a comment
	if (request.method === 'POST') {
		const body = (await request.json()) as {
			bookingId: string;
			content: string;
			displayName?: string;
			mentions?: string[];
		};
		if (!body.bookingId || !body.content?.trim()) {
			return new Response(
				JSON.stringify({ success: false, error: 'bookingId and content required' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		const comments =
			((await kv.get(`comments:${body.bookingId}`, 'json')) as Comment[] | null) || [];
		const newComment: Comment = {
			id: crypto.randomUUID(),
			bookingId: body.bookingId,
			userId: auth.userId || '__env__',
			displayName: body.displayName || 'Admin',
			content: body.content.trim(),
			createdAt: new Date().toISOString(),
		};
		comments.push(newComment);
		await kv.put(`comments:${body.bookingId}`, JSON.stringify(comments));

		// Send mention notifications (fire-and-forget)
		if (body.mentions?.length) {
			const mentionPromises = body.mentions
				.filter(uid => uid !== (auth.userId || '__env__')) // don't notify self
				.map(uid =>
					createNotification(
						kv,
						uid,
						'mention',
						'Mentioned in Comment',
						`${newComment.displayName} mentioned you in a comment`,
						body.bookingId
					)
				);
			context.waitUntil(Promise.allSettled(mentionPromises));
		}

		logAction(kv, {
			action: 'comment_added',
			entity: 'booking',
			entityId: body.bookingId,
			details: `Comment by ${newComment.displayName}`,
			performedBy: auth.userId || '__env__',
		}).catch(() => {});

		// Track specific action after successful comment creation
		if (auth.userId) {
			context.waitUntil(trackActivity(env.BOOKINGS, auth.userId, 'comment_add'));
		}

		return new Response(JSON.stringify({ success: true, comment: newComment }), {
			headers: corsHeaders,
		});
	}

	return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
		status: 405,
		headers: corsHeaders,
	});
};
