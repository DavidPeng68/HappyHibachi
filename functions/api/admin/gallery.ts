/**
 * Admin Gallery API
 * POST /api/admin/gallery - 上传图片到 R2（需要 super_admin）
 * DELETE /api/admin/gallery - 从 R2 删除图片（需要 super_admin）
 */

import { validateToken, requireSuperAdmin, getCorsHeaders } from '../_auth';

interface Env {
	PHOTOS: R2Bucket;
	BOOKINGS: KVNamespace;
	ADMIN_PASSWORD: string;
	ALLOWED_ORIGINS?: string;
}

const ALLOWED_TYPES = new Set(['image/webp', 'image/jpeg', 'image/png', 'image/jpg']);
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB (compressed images are typically under 500KB)

// POST - 上传图片
export const onRequestPost: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);

	const authHeader = context.request.headers.get('Authorization');
	const auth = await validateToken(authHeader, context.env);
	const denied = requireSuperAdmin(auth, corsHeaders);
	if (denied) return denied;

	try {
		const formData = await context.request.formData();
		const file = formData.get('image') as File | null;

		if (!file) {
			return new Response(
				JSON.stringify({ success: false, error: 'No image provided' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		if (!ALLOWED_TYPES.has(file.type)) {
			return new Response(
				JSON.stringify({ success: false, error: 'Invalid file type. Allowed: webp, jpeg, png' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		if (file.size > MAX_FILE_SIZE) {
			return new Response(
				JSON.stringify({ success: false, error: 'File too large (max 2MB)' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		const ext = file.type === 'image/webp' ? 'webp' : file.type === 'image/png' ? 'png' : 'jpg';
		const key = `gallery/${crypto.randomUUID()}.${ext}`;

		await context.env.PHOTOS.put(key, file.stream(), {
			httpMetadata: { contentType: file.type },
		});

		const url = `/api/gallery?file=${encodeURIComponent(key)}`;

		return new Response(
			JSON.stringify({ success: true, key, url }),
			{ headers: corsHeaders }
		);
	} catch (error) {
		console.error('Gallery upload error:', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to upload image' }),
			{ status: 500, headers: corsHeaders }
		);
	}
};

// DELETE - 删除图片
export const onRequestDelete: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);

	const authHeader = context.request.headers.get('Authorization');
	const auth = await validateToken(authHeader, context.env);
	const denied = requireSuperAdmin(auth, corsHeaders);
	if (denied) return denied;

	try {
		const body = await context.request.json() as { keys?: string[] };
		const keys = body.keys || [];

		if (!Array.isArray(keys) || keys.length === 0) {
			return new Response(
				JSON.stringify({ success: false, error: 'No keys provided' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		// Only allow deleting gallery/ prefixed keys
		const invalidKeys = keys.filter(k => !k.startsWith('gallery/'));
		if (invalidKeys.length > 0) {
			return new Response(
				JSON.stringify({ success: false, error: 'Invalid keys: must start with gallery/' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		await Promise.all(keys.map(key => context.env.PHOTOS.delete(key)));

		return new Response(
			JSON.stringify({ success: true }),
			{ headers: corsHeaders }
		);
	} catch (error) {
		console.error('Gallery delete error:', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to delete images' }),
			{ status: 500, headers: corsHeaders }
		);
	}
};

// OPTIONS - CORS
export const onRequestOptions: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);
	return new Response(null, {
		status: 204,
		headers: { ...corsHeaders, 'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS' },
	});
};
