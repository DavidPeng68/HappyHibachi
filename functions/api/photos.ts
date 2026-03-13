/**
 * Photo Share API - Customer photo uploads with R2 storage
 * POST /api/photos - Upload photos (public, rate-limited)
 * GET /api/photos - List submissions (admin only)
 * PATCH /api/photos - Approve/reject submission (admin only)
 * DELETE /api/photos - Remove submission (admin only)
 */

import { validateToken, getCorsHeaders } from './_auth';
import { checkRateLimit } from './_rateLimit';

interface PhotoSubmission {
	id: string;
	email: string;
	instagramHandle?: string;
	photos: Array<{ key: string; url: string }>;
	status: 'pending' | 'approved' | 'rejected';
	submittedAt: string;
	reviewedAt?: string;
	rewardApplied: boolean;
}

interface Env {
	BOOKINGS: KVNamespace;
	PHOTOS: R2Bucket;
	ADMIN_PASSWORD?: string;
	ALLOWED_ORIGINS?: string;
}

const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// POST - Upload photos
export const onRequestPost: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);

	const rateLimited = await checkRateLimit(context.request, context.env.BOOKINGS, corsHeaders);
	if (rateLimited) return rateLimited;

	try {
		const formData = await context.request.formData();
		const email = formData.get('email') as string;
		const instagramHandle = formData.get('instagramHandle') as string | null;
		const files = formData.getAll('photos') as File[];

		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return new Response(
				JSON.stringify({ success: false, error: 'Valid email is required' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		if (!files.length) {
			return new Response(
				JSON.stringify({ success: false, error: 'At least one photo is required' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		if (files.length > MAX_FILES) {
			return new Response(
				JSON.stringify({ success: false, error: `Maximum ${MAX_FILES} photos allowed` }),
				{ status: 400, headers: corsHeaders }
			);
		}

		for (const file of files) {
			if (!ALLOWED_TYPES.includes(file.type)) {
				return new Response(
					JSON.stringify({ success: false, error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF` }),
					{ status: 400, headers: corsHeaders }
				);
			}
			if (file.size > MAX_FILE_SIZE) {
				return new Response(
					JSON.stringify({ success: false, error: 'Each file must be under 5MB' }),
					{ status: 400, headers: corsHeaders }
				);
			}
		}

		const submissionId = crypto.randomUUID();
		const photos: Array<{ key: string; url: string }> = [];

		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			const ext = file.type.split('/')[1] || 'jpg';
			const key = `photos/${submissionId}/${i}.${ext}`;

			await context.env.PHOTOS.put(key, file.stream(), {
				httpMetadata: { contentType: file.type },
			});

			photos.push({ key, url: `/api/photos?file=${encodeURIComponent(key)}` });
		}

		const submission: PhotoSubmission = {
			id: submissionId,
			email: email.toLowerCase(),
			instagramHandle: instagramHandle?.replace('@', '').trim() || undefined,
			photos,
			status: 'pending',
			submittedAt: new Date().toISOString(),
			rewardApplied: false,
		};

		const existing = await context.env.BOOKINGS.get('photo_submissions', 'json');
		const submissions: PhotoSubmission[] = (existing as PhotoSubmission[]) || [];
		submissions.unshift(submission);
		await context.env.BOOKINGS.put('photo_submissions', JSON.stringify(submissions));

		return new Response(
			JSON.stringify({ success: true, message: 'Photos submitted for review!' }),
			{ headers: corsHeaders }
		);
	} catch (error) {
		console.error('Photo upload error:', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to upload photos' }),
			{ status: 500, headers: corsHeaders }
		);
	}
};

// GET - List submissions (admin) or serve an image file
export const onRequestGet: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);
	const url = new URL(context.request.url);
	const fileKey = url.searchParams.get('file');

	if (fileKey) {
		try {
			const object = await context.env.PHOTOS.get(fileKey);
			if (!object) {
				return new Response('Not found', { status: 404 });
			}
			const headers = new Headers();
			headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
			headers.set('Cache-Control', 'public, max-age=31536000');
			return new Response(object.body, { headers });
		} catch {
			return new Response('Error', { status: 500 });
		}
	}

	const authHeader = context.request.headers.get('Authorization');
	if (!await validateToken(authHeader, context.env)) {
		return new Response(
			JSON.stringify({ success: false, error: 'Unauthorized' }),
			{ status: 401, headers: corsHeaders }
		);
	}

	try {
		const data = await context.env.BOOKINGS.get('photo_submissions', 'json');
		const submissions: PhotoSubmission[] = (data as PhotoSubmission[]) || [];

		return new Response(
			JSON.stringify({ success: true, submissions }),
			{ headers: corsHeaders }
		);
	} catch (error) {
		console.error('Photo list error:', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to list submissions' }),
			{ status: 500, headers: corsHeaders }
		);
	}
};

// PATCH - Approve/reject submission (admin only)
export const onRequestPatch: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);

	const authHeader = context.request.headers.get('Authorization');
	if (!await validateToken(authHeader, context.env)) {
		return new Response(
			JSON.stringify({ success: false, error: 'Unauthorized' }),
			{ status: 401, headers: corsHeaders }
		);
	}

	try {
		const { id, status, applyReward } = await context.request.json() as {
			id: string;
			status: 'approved' | 'rejected';
			applyReward?: boolean;
		};

		if (!id || !['approved', 'rejected'].includes(status)) {
			return new Response(
				JSON.stringify({ success: false, error: 'Valid id and status required' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		const data = await context.env.BOOKINGS.get('photo_submissions', 'json');
		const submissions: PhotoSubmission[] = (data as PhotoSubmission[]) || [];

		const submission = submissions.find(s => s.id === id);
		if (!submission) {
			return new Response(
				JSON.stringify({ success: false, error: 'Submission not found' }),
				{ status: 404, headers: corsHeaders }
			);
		}

		submission.status = status;
		submission.reviewedAt = new Date().toISOString();
		if (applyReward && status === 'approved') {
			submission.rewardApplied = true;
		}

		await context.env.BOOKINGS.put('photo_submissions', JSON.stringify(submissions));

		return new Response(
			JSON.stringify({ success: true, submission }),
			{ headers: corsHeaders }
		);
	} catch (error) {
		console.error('Photo review error:', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to review submission' }),
			{ status: 500, headers: corsHeaders }
		);
	}
};

// DELETE - Remove submission and R2 objects (admin only)
export const onRequestDelete: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);

	const authHeader = context.request.headers.get('Authorization');
	if (!await validateToken(authHeader, context.env)) {
		return new Response(
			JSON.stringify({ success: false, error: 'Unauthorized' }),
			{ status: 401, headers: corsHeaders }
		);
	}

	try {
		const { id } = await context.request.json() as { id: string };

		const data = await context.env.BOOKINGS.get('photo_submissions', 'json');
		let submissions: PhotoSubmission[] = (data as PhotoSubmission[]) || [];

		const submission = submissions.find(s => s.id === id);
		if (!submission) {
			return new Response(
				JSON.stringify({ success: false, error: 'Submission not found' }),
				{ status: 404, headers: corsHeaders }
			);
		}

		for (const photo of submission.photos) {
			await context.env.PHOTOS.delete(photo.key).catch(() => {});
		}

		submissions = submissions.filter(s => s.id !== id);
		await context.env.BOOKINGS.put('photo_submissions', JSON.stringify(submissions));

		return new Response(
			JSON.stringify({ success: true }),
			{ headers: corsHeaders }
		);
	} catch (error) {
		console.error('Photo delete error:', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to delete submission' }),
			{ status: 500, headers: corsHeaders }
		);
	}
};

export const onRequestOptions: PagesFunction<Env> = async (context) => {
	return new Response(null, { status: 204, headers: getCorsHeaders(context.request, context.env) });
};
