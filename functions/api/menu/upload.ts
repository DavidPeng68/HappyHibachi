/**
 * Menu Image Upload API
 * POST /api/menu/upload - Upload menu item image to R2
 */

import { validateToken, requireSuperAdmin, getCorsHeaders } from '../_auth';

interface Env {
	BOOKINGS: KVNamespace;
	PHOTOS: R2Bucket;
	ADMIN_PASSWORD: string;
	ALLOWED_ORIGINS?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);

	const authHeader = context.request.headers.get('Authorization');
	const auth = await validateToken(authHeader, context.env);
	const denied = requireSuperAdmin(auth, corsHeaders);
	if (denied) return denied;

	try {
		const formData = await context.request.formData();
		const file = formData.get('image') as File | null;
		const itemId = formData.get('itemId') as string | null;

		if (!file || !itemId) {
			return new Response(
				JSON.stringify({ success: false, error: 'Missing image file or itemId' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		// Validate file type
		const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
		if (!allowedTypes.includes(file.type)) {
			return new Response(
				JSON.stringify({ success: false, error: 'Invalid file type. Allowed: JPEG, PNG, WebP' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		// Validate file size (max 5MB)
		if (file.size > 5 * 1024 * 1024) {
			return new Response(
				JSON.stringify({ success: false, error: 'File too large. Maximum 5MB.' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		const ext = file.type === 'image/webp' ? 'webp' : file.type === 'image/png' ? 'png' : 'jpg';
		const key = `menu/${itemId}.${ext}`;

		await context.env.PHOTOS.put(key, file.stream(), {
			httpMetadata: {
				contentType: file.type,
				cacheControl: 'public, max-age=31536000',
			},
		});

		// Return the R2 key — the frontend constructs the full URL
		return new Response(
			JSON.stringify({ success: true, key, url: `/photos/${key}` }),
			{ headers: corsHeaders }
		);
	} catch (error) {
		console.error('Upload menu image error:', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to upload image' }),
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
