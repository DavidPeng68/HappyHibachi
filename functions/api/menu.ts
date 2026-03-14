/**
 * Menu API - 菜单数据管理
 * GET  /api/menu - 获取菜单数据（公开）
 * POST /api/menu - 更新菜单数据（需要管理员权限）
 */

import { validateToken, requireSuperAdmin, getCorsHeaders } from './_auth';

interface Env {
	BOOKINGS: KVNamespace;
	PHOTOS: R2Bucket;
	ADMIN_PASSWORD: string;
	ALLOWED_ORIGINS?: string;
}

// Default menu data generated from existing constants
const DEFAULT_MENU_DATA = {
	version: 1 as const,
	packages: [
		{
			id: 'pkg-regular',
			name: { en: 'Regular' },
			description: { en: 'Classic hibachi experience with 2 proteins per person' },
			pricePerPerson: 60,
			minGuests: 10,
			maxGuests: null,
			features: [
				{ en: '2 proteins per person' },
				{ en: 'Fried rice & hibachi vegetables' },
				{ en: 'Salad with ginger dressing' },
				{ en: 'Game & show included' },
				{ en: '90 min service' },
			],
			categoryIds: ['cat-regular', 'cat-addons'],
			highlighted: false,
			sortOrder: 1,
			visible: true,
			proteinCount: 2,
			kidsPrice: null,
			flatPrice: null,
			serviceDuration: 90,
			serviceType: 'hibachi',
		},
		{
			id: 'pkg-premium',
			name: { en: 'Premium' },
			description: { en: 'Elevated experience with premium proteins' },
			pricePerPerson: 80,
			minGuests: 10,
			maxGuests: null,
			features: [
				{ en: '2 premium proteins per person' },
				{ en: 'Fried rice & hibachi vegetables' },
				{ en: 'Salad with ginger dressing' },
				{ en: 'Game & show included' },
				{ en: '120 min service' },
			],
			categoryIds: ['cat-regular', 'cat-premium', 'cat-addons'],
			highlighted: true,
			sortOrder: 2,
			visible: true,
			proteinCount: 2,
			kidsPrice: null,
			flatPrice: null,
			serviceDuration: 120,
			serviceType: 'hibachi',
		},
		{
			id: 'pkg-large',
			name: { en: 'Large Gathering' },
			description: { en: 'Buffet-style service for large parties' },
			pricePerPerson: 45,
			minGuests: 50,
			maxGuests: null,
			features: [
				{ en: '2 proteins per person' },
				{ en: 'Buffet-style service' },
				{ en: 'Shows included' },
				{ en: '3-4 hours service' },
			],
			categoryIds: ['cat-regular', 'cat-addons'],
			highlighted: false,
			sortOrder: 3,
			visible: true,
			proteinCount: 2,
			kidsPrice: null,
			flatPrice: null,
			serviceDuration: 210,
			serviceType: 'buffet',
		},
		{
			id: 'pkg-intimate',
			name: { en: 'Intimate Party' },
			description: { en: 'Perfect for small gatherings' },
			pricePerPerson: 0,
			minGuests: 5,
			maxGuests: 7,
			features: [
				{ en: '5-7 guests' },
				{ en: 'Salads, gyoza, edamame, noodles' },
				{ en: 'Mixed proteins' },
				{ en: '$600 total' },
			],
			categoryIds: ['cat-regular', 'cat-addons'],
			highlighted: false,
			sortOrder: 4,
			visible: true,
			proteinCount: 3,
			kidsPrice: null,
			flatPrice: 600,
			serviceDuration: 90,
			serviceType: 'hibachi',
		},
	],
	categories: [
		{
			id: 'cat-regular',
			name: { en: 'Regular Proteins' },
			description: { en: 'Included with all packages' },
			slug: 'regular-proteins',
			sortOrder: 1,
			visible: true,
		},
		{
			id: 'cat-premium',
			name: { en: 'Premium Proteins' },
			description: { en: 'Upgrade your experience' },
			slug: 'premium-proteins',
			sortOrder: 2,
			visible: true,
		},
		{
			id: 'cat-addons',
			name: { en: 'Sides & Add-ons' },
			description: { en: 'Extra dishes to complement your meal' },
			slug: 'sides-addons',
			sortOrder: 3,
			visible: true,
		},
	],
	items: [
		// Regular proteins
		{ id: 'item-chicken', categoryId: 'cat-regular', name: { en: 'Chicken' }, description: { en: 'Tender chicken breast, marinated in our signature sauce' }, price: 0, priceType: 'included' as const, imageUrl: '/images/menu/chicken.jpg', tags: ['popular'], available: true, orderable: true, sortOrder: 1 },
		{ id: 'item-steak', categoryId: 'cat-regular', name: { en: 'Steak' }, description: { en: 'USDA Choice beef, perfectly seasoned' }, price: 0, priceType: 'included' as const, imageUrl: '/images/menu/steak.jpg', tags: ['popular'], available: true, orderable: true, sortOrder: 2 },
		{ id: 'item-shrimp', categoryId: 'cat-regular', name: { en: 'Shrimp' }, description: { en: 'Large shrimp, lightly seasoned and grilled to perfection' }, price: 0, priceType: 'included' as const, imageUrl: '/images/menu/shrimp.jpg', tags: ['popular'], available: true, orderable: true, sortOrder: 3 },
		{ id: 'item-scallops', categoryId: 'cat-regular', name: { en: 'Scallops' }, description: { en: 'Fresh sea scallops, seared to perfection' }, price: 0, priceType: 'included' as const, imageUrl: '/images/menu/scallops.jpg', tags: [], available: true, orderable: true, sortOrder: 4 },
		{ id: 'item-salmon', categoryId: 'cat-regular', name: { en: 'Salmon' }, description: { en: 'Wild-caught salmon fillet, lightly seasoned' }, price: 0, priceType: 'included' as const, imageUrl: '/images/menu/salmon.jpg', tags: [], available: true, orderable: true, sortOrder: 5 },
		{ id: 'item-tofu', categoryId: 'cat-regular', name: { en: 'Tofu' }, description: { en: 'Firm tofu, marinated and grilled' }, price: 0, priceType: 'included' as const, imageUrl: '/images/menu/tofu.jpg', tags: ['vegetarian'], available: true, orderable: true, sortOrder: 6 },
		// Premium proteins
		{ id: 'item-filet-mignon', categoryId: 'cat-premium', name: { en: 'Filet Mignon' }, description: { en: 'USDA Prime filet mignon - the most tender cut' }, price: 5, priceType: 'upgrade' as const, imageUrl: '/images/menu/filet-mignon-upgrade.jpg', tags: ['popular'], available: true, orderable: true, sortOrder: 1 },
		{ id: 'item-lobster', categoryId: 'cat-premium', name: { en: 'Lobster Tail' }, description: { en: 'Fresh lobster tail, pan-seared with clarified butter' }, price: 10, priceType: 'upgrade' as const, imageUrl: '/images/menu/spiny-lobster-tail-upgrade.jpg', tags: ['popular'], available: true, orderable: true, sortOrder: 2 },
		{ id: 'item-organic-chicken', categoryId: 'cat-premium', name: { en: 'Organic Chicken' }, description: { en: 'Free-range organic chicken breast' }, price: 5, priceType: 'upgrade' as const, imageUrl: '/images/menu/chicken.jpg', tags: [], available: true, orderable: true, sortOrder: 3 },
		{ id: 'item-premium-ribeye', categoryId: 'cat-premium', name: { en: 'Premium Ribeye' }, description: { en: 'Richly marbled ribeye steak' }, price: 10, priceType: 'upgrade' as const, imageUrl: '/images/menu/steak.jpg', tags: [], available: true, orderable: true, sortOrder: 4 },
		{ id: 'item-jumbo-shrimp', categoryId: 'cat-premium', name: { en: 'Jumbo Shrimp' }, description: { en: 'Extra-large tiger shrimp, perfectly grilled' }, price: 10, priceType: 'upgrade' as const, imageUrl: '/images/menu/shrimp.jpg', tags: [], available: true, orderable: true, sortOrder: 5 },
		{ id: 'item-wild-salmon', categoryId: 'cat-premium', name: { en: 'Wild Alaska Salmon' }, description: { en: 'Premium wild-caught Alaskan salmon' }, price: 10, priceType: 'upgrade' as const, imageUrl: '/images/menu/salmon.jpg', tags: [], available: true, orderable: true, sortOrder: 6 },
		{ id: 'item-large-scallops', categoryId: 'cat-premium', name: { en: 'Large Scallops' }, description: { en: 'U-10 jumbo sea scallops, perfectly seared' }, price: 10, priceType: 'upgrade' as const, imageUrl: '/images/menu/premium-sea-seallops-upgrade.jpg', tags: [], available: true, orderable: true, sortOrder: 7 },
		// Add-ons
		{ id: 'item-gyoza', categoryId: 'cat-addons', name: { en: 'Gyoza (12pcs)' }, description: { en: 'Pan-fried Japanese dumplings' }, price: 15, priceType: 'per_item' as const, imageUrl: '/images/menu/gyoza.jpg', tags: [], available: true, orderable: true, sortOrder: 1 },
		{ id: 'item-edamame', categoryId: 'cat-addons', name: { en: 'Edamame' }, description: { en: 'Steamed soybeans with sea salt' }, price: 10, priceType: 'per_item' as const, imageUrl: '/images/menu/edamame.jpg', tags: ['vegetarian'], available: true, orderable: true, sortOrder: 2 },
		{ id: 'item-noodles', categoryId: 'cat-addons', name: { en: 'Noodles' }, description: { en: 'Stir-fried hibachi noodles' }, price: 5, priceType: 'per_person' as const, imageUrl: '/images/menu/noodles.jpg', tags: [], available: true, orderable: true, sortOrder: 3 },
		{ id: 'item-third-protein', categoryId: 'cat-addons', name: { en: '3rd Protein' }, description: { en: 'Add an extra protein to your meal' }, price: 10, priceType: 'per_person' as const, imageUrl: '', tags: [], available: true, orderable: true, sortOrder: 4 },
	],
	spotlights: [],
	couponTiers: [
		{ id: 'coupon-1', guestRange: { en: 'under 15 people' }, discount: 30, sortOrder: 1 },
		{ id: 'coupon-2', guestRange: { en: '15-25 people' }, discount: 60, sortOrder: 2 },
		{ id: 'coupon-3', guestRange: { en: '25-35 people' }, discount: 90, sortOrder: 3 },
		{ id: 'coupon-4', guestRange: { en: '35+ people' }, discount: 120, sortOrder: 4 },
	],
	pricing: {
		kidsPrice: 30,
		creditCardFee: 0.04,
		gratuitySuggested: 0.20,
		cancellationFee: 200,
		minimumOrder: 600,
		outdoorNote: { en: 'We cook outside only.' },
		weatherNote: { en: 'We provide services rain or shine, as long as there is a dry area for the chef to cook under.' },
	},
	updatedAt: new Date().toISOString(),
};

// GET - 获取菜单数据（公开）
export const onRequestGet: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);

	try {
		const menuData = await context.env.BOOKINGS.get('menu_data', 'json');

		return new Response(
			JSON.stringify({ success: true, menu: menuData || DEFAULT_MENU_DATA }),
			{
				headers: {
					...corsHeaders,
					'Cache-Control': 'public, max-age=300',
				},
			}
		);
	} catch (error) {
		console.error('Get menu error:', error);
		return new Response(
			JSON.stringify({ success: true, menu: DEFAULT_MENU_DATA }),
			{ headers: corsHeaders }
		);
	}
};

// POST - 更新菜单数据（需要管理员权限）
export const onRequestPost: PagesFunction<Env> = async (context) => {
	const corsHeaders = getCorsHeaders(context.request, context.env);

	const authHeader = context.request.headers.get('Authorization');
	const auth = await validateToken(authHeader, context.env);
	const denied = requireSuperAdmin(auth, corsHeaders);
	if (denied) return denied;

	try {
		const menuData = await context.request.json();

		if (!menuData || typeof menuData !== 'object') {
			return new Response(
				JSON.stringify({ success: false, error: 'Invalid menu data' }),
				{ status: 400, headers: corsHeaders }
			);
		}

		// Ensure version and timestamp
		const dataToSave = {
			...menuData,
			version: 1,
			updatedAt: new Date().toISOString(),
		};

		await context.env.BOOKINGS.put('menu_data', JSON.stringify(dataToSave));

		return new Response(
			JSON.stringify({ success: true, menu: dataToSave }),
			{ headers: corsHeaders }
		);
	} catch (error) {
		console.error('Update menu error:', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to update menu' }),
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
