/**
 * Gallery Image Serving API
 * GET /api/gallery?file={key} - 从 R2 返回图片（公开）
 */

import { getCorsHeaders } from './_auth';

interface Env {
	PHOTOS: R2Bucket;
	ALLOWED_ORIGINS?: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
	const url = new URL(context.request.url);
	const fileKey = url.searchParams.get('file');

	if (!fileKey || !fileKey.startsWith('gallery/')) {
		return new Response(JSON.stringify({ error: 'Invalid file key' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		const object = await context.env.PHOTOS.get(fileKey);
		if (!object) {
			return new Response('Not found', { status: 404 });
		}
		const headers = new Headers();
		headers.set('Content-Type', object.httpMetadata?.contentType || 'image/webp');
		headers.set('Cache-Control', 'public, max-age=31536000');
		return new Response(object.body, { headers });
	} catch {
		return new Response('Error', { status: 500 });
	}
};

export const onRequestOptions: PagesFunction<Env> = async (context) => {
	return new Response(null, {
		status: 204,
		headers: getCorsHeaders(context.request, context.env),
	});
};
