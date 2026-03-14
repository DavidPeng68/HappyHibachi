/**
 * Admin Settings API
 * PUT /api/admin/settings - 更新设置（需要 super_admin 权限）
 */

import { validateToken, requireSuperAdmin, getCorsHeaders } from '../_auth';

interface Env {
	BOOKINGS: KVNamespace;
	ADMIN_PASSWORD: string;
	ALLOWED_ORIGINS?: string;
}

interface Settings {
	timeSlots: Array<{
		id: string;
		label: string;
		startTime: string;
		endTime: string;
		enabled: boolean;
	}>;
	businessHours?: { open: string; close: string };
	minGuests: number;
	maxGuests: number;
	pricePerPerson: number;
	minimumOrder: number;
	socialLinks: { instagram: string; facebook: string; tiktok: string };
	promoBanner: { enabled: boolean; text: string; emoji: string };
	contactInfo: { phone: string; email: string; contactPerson: string };
	galleryImages: Array<{ id: string; url: string; caption: string; order: number }>;
	featureToggles: {
		photoShare: boolean;
		referralProgram: boolean;
		newsletter: boolean;
		specialOffer: boolean;
		instagramFeed: boolean;
		coupons: boolean;
	};
	brandInfo: { name: string; url: string; logoUrl: string; hashtag: string };
	seoDefaults: { title: string; description: string; keywords: string };
}

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
	promoBanner: { enabled: true, text: 'Book Today & Get $30 OFF!', emoji: '🔥' },
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

const ALLOWED_KEYS = new Set<string>([
	'timeSlots', 'businessHours', 'minGuests', 'maxGuests',
	'pricePerPerson', 'minimumOrder', 'socialLinks', 'promoBanner',
	'contactInfo', 'galleryImages', 'featureToggles', 'brandInfo', 'seoDefaults',
]);

// PUT - 更新设置
export const onRequestPut: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);

	const authHeader = context.request.headers.get('Authorization');
	const auth = await validateToken(authHeader, context.env);
	const denied = requireSuperAdmin(auth, corsHeaders);
	if (denied) return denied;

	try {
		const updates = await context.request.json() as Record<string, unknown>;

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
	const corsHeaders = getCorsHeaders(context.request, context.env);
	return new Response(null, {
		status: 204,
		headers: { ...corsHeaders, 'Access-Control-Allow-Methods': 'PUT, OPTIONS' },
	});
};
