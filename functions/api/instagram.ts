/**
 * Instagram API - Instagram 帖子管理（手动上传模式）
 * GET /api/instagram - 获取帖子列表
 * POST /api/instagram - 更新帖子（需要管理员权限）
 */

import { validateToken, requireSuperAdmin, getCorsHeaders } from './_auth';

interface InstagramPost {
	id: string;
	image: string; // base64 图片数据
	link: string;  // Instagram 帖子链接
	caption?: string; // 可选描述
}

interface InstagramSettings {
	handle: string;
	posts: InstagramPost[];
	updatedAt: string;
}

interface Env {
	BOOKINGS: KVNamespace;
	ADMIN_PASSWORD?: string;
	ALLOWED_ORIGINS?: string;
}

const DEFAULT_SETTINGS: InstagramSettings = {
	handle: 'familyfriendshibachi',
	posts: [],
	updatedAt: new Date().toISOString(),
};

// GET - 获取 Instagram 设置
export const onRequestGet: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);

	try {
		const data = await context.env.BOOKINGS.get('instagram_settings', 'json');
		const settings: InstagramSettings = (data as InstagramSettings) || DEFAULT_SETTINGS;

		return new Response(
			JSON.stringify({ success: true, settings }),
			{ headers: corsHeaders }
		);
	} catch (error) {
		console.error('Get Instagram settings error:', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to get Instagram settings' }),
			{ status: 500, headers: corsHeaders }
		);
	}
};

// POST - 更新 Instagram 设置
export const onRequestPost: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);

	// 验证身份
	const authHeader = context.request.headers.get('Authorization');
	const auth = await validateToken(authHeader, context.env);
	const denied = requireSuperAdmin(auth, corsHeaders);
	if (denied) return denied;

	try {
		const body = await context.request.json() as {
			handle?: string;
			posts?: InstagramPost[];
			action?: 'add' | 'update' | 'delete';
			post?: InstagramPost;
			postId?: string;
		};

		// 获取现有设置
		const existingData = await context.env.BOOKINGS.get('instagram_settings', 'json');
		const currentSettings: InstagramSettings = (existingData as InstagramSettings) || DEFAULT_SETTINGS;

		// 更新 handle
		if (body.handle !== undefined) {
			currentSettings.handle = body.handle.replace('@', '').trim();
		}

		// 批量更新帖子
		if (body.posts !== undefined) {
			currentSettings.posts = body.posts;
		}

		// 添加单个帖子
		if (body.action === 'add' && body.post) {
			const newPost: InstagramPost = {
				id: `post_${Date.now()}`,
				image: body.post.image,
				link: body.post.link,
				caption: body.post.caption,
			};
			currentSettings.posts.push(newPost);
		}

		// 更新单个帖子
		if (body.action === 'update' && body.post && body.postId) {
			const index = currentSettings.posts.findIndex(p => p.id === body.postId);
			if (index !== -1) {
				currentSettings.posts[index] = {
					...currentSettings.posts[index],
					...body.post,
				};
			}
		}

		// 删除单个帖子
		if (body.action === 'delete' && body.postId) {
			currentSettings.posts = currentSettings.posts.filter(p => p.id !== body.postId);
		}

		currentSettings.updatedAt = new Date().toISOString();

		// 保存
		await context.env.BOOKINGS.put('instagram_settings', JSON.stringify(currentSettings));

		return new Response(
			JSON.stringify({ success: true, settings: currentSettings }),
			{ headers: corsHeaders }
		);
	} catch (error) {
		console.error('Update Instagram settings error:', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to update settings' }),
			{ status: 500, headers: corsHeaders }
		);
	}
};

// OPTIONS - CORS
export const onRequestOptions: PagesFunction<Env> = async (context) => {
	return new Response(null, {
		status: 204,
		headers: getCorsHeaders(context.request, context.env),
	});
};
