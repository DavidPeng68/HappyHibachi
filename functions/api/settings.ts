/**
 * Settings API - 系统设置管理
 * GET /api/settings - 获取公开设置（时间段等）
 * POST /api/settings - 更新设置（需要管理员权限）
 */

interface TimeSlot {
	id: string;
	label: string;
	startTime: string; // HH:MM
	endTime: string;   // HH:MM
	enabled: boolean;
}

interface SocialLinks {
	instagram: string;
	facebook: string;
	tiktok: string;
}

interface PromoBanner {
	enabled: boolean;
	text: string;
	emoji: string;
}

interface ContactInfo {
	phone: string;
	email: string;
	contactPerson: string;
}

interface GalleryImage {
	id: string;
	url: string;  // base64 或 URL
	caption: string;
	order: number;
}

interface FeatureToggles {
	photoShare: boolean;
	referralProgram: boolean;
	newsletter: boolean;
	specialOffer: boolean;
	instagramFeed: boolean;
	coupons: boolean;
}

interface BrandInfo {
	name: string;
	url: string;
	logoUrl: string;
	hashtag: string;
}

interface SEODefaults {
	title: string;
	description: string;
	keywords: string;
}

interface Settings {
	timeSlots: TimeSlot[];
	businessHours?: {
		open: string;
		close: string;
	};
	minGuests: number;
	maxGuests: number;
	pricePerPerson: number;
	minimumOrder: number;
	socialLinks: SocialLinks;
	promoBanner: PromoBanner;
	contactInfo: ContactInfo;
	galleryImages: GalleryImage[];
	featureToggles: FeatureToggles;
	brandInfo: BrandInfo;
	seoDefaults: SEODefaults;
}

interface Env {
	BOOKINGS: KVNamespace;
	ADMIN_PASSWORD: string;
	ALLOWED_ORIGINS?: string;
}

import { validateToken, getCorsHeaders } from './_auth';

// 默认设置
const DEFAULT_SETTINGS: Settings = {
	timeSlots: [
		{ id: 'afternoon', label: 'Afternoon', startTime: '13:00', endTime: '15:00', enabled: true },
		{ id: 'evening', label: 'Evening', startTime: '17:00', endTime: '19:00', enabled: true },
		{ id: 'night', label: 'Night', startTime: '19:00', endTime: '21:00', enabled: true },
	],
	minGuests: 10,
	maxGuests: 100,
	pricePerPerson: 60,
	minimumOrder: 600,
	socialLinks: {
		instagram: 'https://instagram.com/familyfriendshibachi',
		facebook: 'https://facebook.com/familyfriendshibachi',
		tiktok: 'https://tiktok.com/@familyfriendshibachi',
	},
	promoBanner: {
		enabled: true,
		text: 'Book Today & Get $30 OFF!',
		emoji: '🔥',
	},
	contactInfo: {
		phone: '909-615-6633',
		email: 'familyfriendshibachi@gmail.com',
		contactPerson: 'Family Friends Hibachi Team',
	},
	galleryImages: [],
	featureToggles: {
		photoShare: true,
		referralProgram: true,
		newsletter: true,
		specialOffer: true,
		instagramFeed: true,
		coupons: true,
	},
	brandInfo: {
		name: 'Family Friends Hibachi',
		url: 'https://familyfriendshibachi.com',
		logoUrl: '/icon.svg',
		hashtag: '#MORESAKEMOREHAPPY',
	},
	seoDefaults: {
		title: 'Family Friends Hibachi - At Home Hibachi Experience',
		description: 'Top Rated Hibachi At Home Experience. We bring our Hibachi Grill + Chef to your backyard. Serving California, Texas, and Florida.',
		keywords: 'hibachi, at home hibachi, hibachi catering, backyard hibachi, hibachi chef, California hibachi, Texas hibachi, Florida hibachi',
	},
};

// GET - 获取设置（公开）
export const onRequestGet: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);

	try {
		const settingsData = await context.env.BOOKINGS.get('app_settings', 'json');
		const settings: Settings = (settingsData as Settings) || DEFAULT_SETTINGS;

		// 只返回已启用的时间段
		const publicSettings = {
			...settings,
			timeSlots: settings.timeSlots.filter(slot => slot.enabled),
		};

		return new Response(
			JSON.stringify({ success: true, settings: publicSettings }),
			{ headers: corsHeaders }
		);
	} catch (error) {
		console.error('Get settings error:', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to get settings' }),
			{ status: 500, headers: corsHeaders }
		);
	}
};

// POST - 更新设置（需要管理员权限）
export const onRequestPost: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);

	// 验证身份
	const authHeader = context.request.headers.get('Authorization');
	if (!await validateToken(authHeader, context.env)) {
		return new Response(
			JSON.stringify({ success: false, error: 'Unauthorized' }),
			{ status: 401, headers: corsHeaders }
		);
	}

	try {
		const updates = await context.request.json() as Record<string, unknown>;

		const ALLOWED_KEYS = new Set<string>([
			'timeSlots', 'businessHours', 'minGuests', 'maxGuests',
			'pricePerPerson', 'minimumOrder', 'socialLinks', 'promoBanner',
			'contactInfo', 'galleryImages', 'featureToggles', 'brandInfo', 'seoDefaults',
		]);

		const unknownKeys = Object.keys(updates).filter(k => !ALLOWED_KEYS.has(k));
		if (unknownKeys.length > 0) {
			return new Response(
				JSON.stringify({ success: false, error: `Unknown settings keys: ${unknownKeys.join(', ')}` }),
				{ status: 400, headers: corsHeaders }
			);
		}

		if (updates.minGuests !== undefined && (typeof updates.minGuests !== 'number' || updates.minGuests < 1)) {
			return new Response(
				JSON.stringify({ success: false, error: 'minGuests must be a positive number' }),
				{ status: 400, headers: corsHeaders }
			);
		}
		if (updates.maxGuests !== undefined && (typeof updates.maxGuests !== 'number' || updates.maxGuests < 1)) {
			return new Response(
				JSON.stringify({ success: false, error: 'maxGuests must be a positive number' }),
				{ status: 400, headers: corsHeaders }
			);
		}
		if (updates.pricePerPerson !== undefined && (typeof updates.pricePerPerson !== 'number' || updates.pricePerPerson < 0)) {
			return new Response(
				JSON.stringify({ success: false, error: 'pricePerPerson must be a non-negative number' }),
				{ status: 400, headers: corsHeaders }
			);
		}
		if (updates.timeSlots !== undefined && !Array.isArray(updates.timeSlots)) {
			return new Response(
				JSON.stringify({ success: false, error: 'timeSlots must be an array' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		const existingData = await context.env.BOOKINGS.get('app_settings', 'json');
		const currentSettings: Settings = (existingData as Settings) || DEFAULT_SETTINGS;

		const newSettings: Settings = {
			...currentSettings,
			...(updates as Partial<Settings>),
		};

		await context.env.BOOKINGS.put('app_settings', JSON.stringify(newSettings));

		return new Response(
			JSON.stringify({ success: true, settings: newSettings }),
			{ headers: corsHeaders }
		);
	} catch (error) {
		console.error('Update settings error:', error);
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

