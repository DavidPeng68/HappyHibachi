/**
 * Admin Notifications API
 * GET  /api/admin/notifications — returns user's notifications (auth required)
 * PATCH /api/admin/notifications — mark notification(s) as read
 */

import { validateToken, getCorsHeaders } from '../_auth';
import { readNotifications, writeNotifications } from '../_notifications';
import { trackActivity } from '../_activity';

interface Env {
  BOOKINGS: KVNamespace;
  ADMIN_PASSWORD?: string;
  ALLOWED_ORIGINS?: string;
}

// ---------------------------------------------------------------------------
// GET — Fetch notifications for the authenticated user
// ---------------------------------------------------------------------------

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request, context.env);

  const authHeader = context.request.headers.get('Authorization');
  const auth = await validateToken(authHeader, context.env);
  if (!auth.valid || !auth.userId) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: corsHeaders }
    );
  }

  if (auth.userId) {
    context.waitUntil(trackActivity(context.env.BOOKINGS, auth.userId));
  }

  try {
    const notifications = await readNotifications(context.env.BOOKINGS, auth.userId);
    return new Response(
      JSON.stringify({ success: true, notifications }),
      { headers: corsHeaders }
    );
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch notifications' }),
      { status: 500, headers: corsHeaders }
    );
  }
};

// ---------------------------------------------------------------------------
// PATCH — Mark notifications as read
// Body: { ids: string[] } or { markAllRead: true }
// ---------------------------------------------------------------------------

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request, context.env);

  const authHeader = context.request.headers.get('Authorization');
  const auth = await validateToken(authHeader, context.env);
  if (!auth.valid || !auth.userId) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: corsHeaders }
    );
  }

  if (auth.userId) {
    context.waitUntil(trackActivity(context.env.BOOKINGS, auth.userId));
  }

  try {
    const body = await context.request.json() as { ids?: string[]; markAllRead?: boolean };
    const notifications = await readNotifications(context.env.BOOKINGS, auth.userId);

    if (body.markAllRead) {
      for (const n of notifications) {
        n.read = true;
      }
    } else if (body.ids && Array.isArray(body.ids)) {
      const idSet = new Set(body.ids);
      for (const n of notifications) {
        if (idSet.has(n.id)) {
          n.read = true;
        }
      }
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Provide ids or markAllRead' }),
        { status: 400, headers: corsHeaders }
      );
    }

    await writeNotifications(context.env.BOOKINGS, auth.userId, notifications);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: corsHeaders }
    );
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to update notifications' }),
      { status: 500, headers: corsHeaders }
    );
  }
};

// ---------------------------------------------------------------------------
// OPTIONS — CORS preflight
// ---------------------------------------------------------------------------

export const onRequestOptions: PagesFunction<Env> = async (context) => {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(context.request, context.env),
  });
};
