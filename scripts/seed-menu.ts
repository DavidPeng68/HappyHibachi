/**
 * Seed Menu Data Script
 *
 * Generates DEFAULT_MENU_DATA JSON from existing constants and scraped images.
 * Can be used to:
 * 1. Output JSON for manual KV insertion
 * 2. POST directly to the /api/menu endpoint
 *
 * Usage:
 *   npx tsx scripts/seed-menu.ts                    # Output JSON to stdout
 *   npx tsx scripts/seed-menu.ts --post URL TOKEN   # POST to API
 */

import * as fs from 'fs';
import * as path from 'path';

// Load image mapping
const mappingPath = path.join(__dirname, '../src/images/menu/_mapping.json');
const imageMapping: Record<string, { localPath: string; name: string; description: string; category: string }> =
	JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));

// Helper to create image URL from local path
function imageUrl(slug: string): string {
	const entry = imageMapping[slug];
	return entry ? `/images/menu/${slug}.jpg` : '';
}

// ---- Categories ----
const categories = [
	{
		id: 'regular-proteins',
		name: { en: 'Proteins' },
		description: { en: 'Choose 2 proteins per person' },
		slug: 'regular-proteins',
		sortOrder: 1,
		visible: true,
	},
	{
		id: 'premium',
		name: { en: 'Premium Upgrades' },
		description: { en: 'Upgrade to premium proteins for an additional charge' },
		slug: 'premium',
		sortOrder: 2,
		visible: true,
	},
	{
		id: 'add-ons',
		name: { en: 'Sides & Appetizers' },
		description: { en: 'Add extra sides to your meal' },
		slug: 'add-ons',
		sortOrder: 3,
		visible: true,
	},
];

// ---- Menu Items ----
const items = [
	// Regular proteins (included in base price)
	{
		id: 'chicken',
		categoryId: 'regular-proteins',
		name: { en: 'Chicken', zh: '鸡肉', es: 'Pollo', ko: '치킨', ja: 'チキン', vi: 'Gà', tl: 'Manok', hi: 'चिकन' },
		description: { en: 'Tender chicken breast, marinated in our signature sauce' },
		price: 0,
		priceType: 'included' as const,
		imageUrl: imageUrl('chicken'),
		tags: ['popular'],
		available: true,
		orderable: false,
		sortOrder: 1,
	},
	{
		id: 'steak',
		categoryId: 'regular-proteins',
		name: { en: 'Steak', zh: '牛排', es: 'Bistec', ko: '스테이크', ja: 'ステーキ', vi: 'Bò', tl: 'Steak', hi: 'स्टेक' },
		description: { en: 'USDA Choice beef, perfectly seasoned' },
		price: 0,
		priceType: 'included' as const,
		imageUrl: imageUrl('steak'),
		tags: ['popular'],
		available: true,
		orderable: false,
		sortOrder: 2,
	},
	{
		id: 'shrimp',
		categoryId: 'regular-proteins',
		name: { en: 'Shrimp', zh: '虾', es: 'Camarones', ko: '새우', ja: 'エビ', vi: 'Tôm', tl: 'Hipon', hi: 'झींगा' },
		description: { en: 'Large shrimp, lightly seasoned and grilled to perfection' },
		price: 0,
		priceType: 'included' as const,
		imageUrl: imageUrl('shrimp'),
		tags: ['popular'],
		available: true,
		orderable: false,
		sortOrder: 3,
	},
	{
		id: 'scallops',
		categoryId: 'regular-proteins',
		name: { en: 'Scallops', zh: '扇贝', es: 'Vieiras', ko: '가리비', ja: 'ホタテ', vi: 'Sò điệp', tl: 'Scallops', hi: 'स्कैलप्स' },
		description: { en: 'Fresh sea scallops, seared to perfection' },
		price: 0,
		priceType: 'included' as const,
		imageUrl: imageUrl('scallops'),
		tags: [],
		available: true,
		orderable: false,
		sortOrder: 4,
	},
	{
		id: 'salmon',
		categoryId: 'regular-proteins',
		name: { en: 'Salmon', zh: '三文鱼', es: 'Salmón', ko: '연어', ja: 'サーモン', vi: 'Cá hồi', tl: 'Salmon', hi: 'सैल्मन' },
		description: { en: 'Wild-caught salmon fillet, lightly seasoned' },
		price: 0,
		priceType: 'included' as const,
		imageUrl: imageUrl('salmon'),
		tags: [],
		available: true,
		orderable: false,
		sortOrder: 5,
	},
	{
		id: 'tofu',
		categoryId: 'regular-proteins',
		name: { en: 'Tofu', zh: '豆腐', es: 'Tofu', ko: '두부', ja: '豆腐', vi: 'Đậu phụ', tl: 'Tofu', hi: 'टोफू' },
		description: { en: 'Firm tofu, marinated and grilled' },
		price: 0,
		priceType: 'included' as const,
		imageUrl: imageUrl('tofu'),
		tags: ['vegetarian'],
		available: true,
		orderable: false,
		sortOrder: 6,
	},

	// Premium upgrades
	{
		id: 'filet-mignon',
		categoryId: 'premium',
		name: { en: 'Filet Mignon', zh: '菲力牛排', es: 'Filete Mignon', ko: '필레 미뇽', ja: 'フィレミニョン', vi: 'Thăn bò', tl: 'Filet Mignon', hi: 'फ़िले मिग्नॉन' },
		description: { en: 'USDA Prime filet mignon - the most tender cut' },
		price: 5,
		priceType: 'upgrade' as const,
		imageUrl: imageUrl('filet-mignon-upgrade'),
		tags: ['popular'],
		available: true,
		orderable: true,
		sortOrder: 1,
	},
	{
		id: 'lobster',
		categoryId: 'premium',
		name: { en: 'Lobster Tail', zh: '龙虾尾', es: 'Cola de Langosta', ko: '랍스터 테일', ja: 'ロブスターテール', vi: 'Đuôi tôm hùm', tl: 'Lobster Tail', hi: 'लॉबस्टर टेल' },
		description: { en: 'Fresh lobster tail, pan-seared with clarified butter' },
		price: 10,
		priceType: 'upgrade' as const,
		imageUrl: imageUrl('spiny-lobster-tail-upgrade'),
		tags: ['popular'],
		available: true,
		orderable: true,
		sortOrder: 2,
	},
	{
		id: 'premium-ribeye',
		categoryId: 'premium',
		name: { en: 'Premium Ribeye', zh: '顶级肋眼牛排', es: 'Ribeye Premium', ko: '프리미엄 립아이', ja: 'プレミアムリブアイ', vi: 'Thăn lưng bò', tl: 'Premium Ribeye', hi: 'प्रीमियम रिबआई' },
		description: { en: 'Premium ribeye steak, rich marbling and full flavor' },
		price: 10,
		priceType: 'upgrade' as const,
		imageUrl: '',
		tags: [],
		available: true,
		orderable: true,
		sortOrder: 3,
	},
	{
		id: 'jumbo-shrimp',
		categoryId: 'premium',
		name: { en: 'Jumbo Shrimp', zh: '特大虾', es: 'Camarones Jumbo', ko: '점보 새우', ja: 'ジャンボエビ', vi: 'Tôm càng', tl: 'Jumbo Shrimp', hi: 'जंबो झींगा' },
		description: { en: 'Extra-large tiger shrimp, perfectly grilled' },
		price: 10,
		priceType: 'upgrade' as const,
		imageUrl: '',
		tags: [],
		available: true,
		orderable: true,
		sortOrder: 4,
	},
	{
		id: 'wild-salmon',
		categoryId: 'premium',
		name: { en: 'Wild Alaska Salmon', zh: '阿拉斯加野生三文鱼', es: 'Salmón Salvaje de Alaska', ko: '알래스카 야생 연어', ja: 'アラスカ天然サーモン', vi: 'Cá hồi Alaska', tl: 'Wild Alaska Salmon', hi: 'वाइल्ड अलास्का सैल्मन' },
		description: { en: 'Wild-caught Alaska salmon, premium quality' },
		price: 10,
		priceType: 'upgrade' as const,
		imageUrl: '',
		tags: [],
		available: true,
		orderable: true,
		sortOrder: 5,
	},
	{
		id: 'large-scallops',
		categoryId: 'premium',
		name: { en: 'Large Scallops', zh: '大扇贝', es: 'Vieiras Grandes', ko: '대형 가리비', ja: '大ホタテ', vi: 'Sò điệp lớn', tl: 'Large Scallops', hi: 'लार्ज स्कैलप्स' },
		description: { en: 'U-10 jumbo sea scallops, perfectly seared' },
		price: 10,
		priceType: 'upgrade' as const,
		imageUrl: imageUrl('premium-sea-seallops-upgrade'),
		tags: [],
		available: true,
		orderable: true,
		sortOrder: 6,
	},

	// Add-ons
	{
		id: 'gyoza',
		categoryId: 'add-ons',
		name: { en: 'Gyoza (12pcs)', zh: '煎饺 (12个)', es: 'Gyoza (12 piezas)', ko: '교자 (12개)', ja: '餃子 (12個)', vi: 'Gyoza (12 chiếc)', tl: 'Gyoza (12pcs)', hi: 'ग्योज़ा (12 पीस)' },
		description: { en: 'Pan-fried Japanese dumplings' },
		price: 15,
		priceType: 'per_item' as const,
		imageUrl: imageUrl('gyoza'),
		tags: [],
		available: true,
		orderable: true,
		sortOrder: 1,
	},
	{
		id: 'edamame',
		categoryId: 'add-ons',
		name: { en: 'Edamame', zh: '毛豆', es: 'Edamame', ko: '에다마메', ja: '枝豆', vi: 'Đậu nành', tl: 'Edamame', hi: 'एडामामे' },
		description: { en: 'Steamed soybeans lightly salted' },
		price: 10,
		priceType: 'per_item' as const,
		imageUrl: imageUrl('edamame'),
		tags: ['vegetarian'],
		available: true,
		orderable: true,
		sortOrder: 2,
	},
	{
		id: 'noodles',
		categoryId: 'add-ons',
		name: { en: 'Noodles', zh: '面条', es: 'Fideos', ko: '면', ja: '焼きそば', vi: 'Mì', tl: 'Noodles', hi: 'नूडल्स' },
		description: { en: 'Stir-fried noodles with vegetables' },
		price: 5,
		priceType: 'per_person' as const,
		imageUrl: imageUrl('noodles'),
		tags: ['vegetarian'],
		available: true,
		orderable: true,
		sortOrder: 3,
	},
	{
		id: 'third-protein',
		categoryId: 'add-ons',
		name: { en: '3rd Protein', zh: '第三种蛋白质', es: '3ra Proteína', ko: '세 번째 단백질', ja: '3品目のたんぱく質', vi: 'Protein thứ 3', tl: '3rd Protein', hi: 'तीसरा प्रोटीन' },
		description: { en: 'Add a third protein choice to your meal' },
		price: 10,
		priceType: 'per_person' as const,
		imageUrl: '',
		tags: [],
		available: true,
		orderable: true,
		sortOrder: 4,
	},
];

// ---- Packages ----
const packages = [
	{
		id: 'regular',
		name: { en: 'Regular', zh: '标准套餐', es: 'Regular', ko: '레귤러', ja: 'レギュラー', vi: 'Thường', tl: 'Regular', hi: 'रेगुलर' },
		description: { en: '2 proteins per person with show included' },
		pricePerPerson: 60,
		minGuests: 10,
		maxGuests: null,
		features: [
			{ en: '2 proteins per person' },
			{ en: 'Show included' },
			{ en: '90 min service' },
			{ en: 'Salad, fried rice, vegetables' },
		],
		categoryIds: ['regular-proteins'],
		highlighted: false,
		sortOrder: 1,
		visible: true,
	},
	{
		id: 'premium',
		name: { en: 'Premium', zh: '高级套餐', es: 'Premium', ko: '프리미엄', ja: 'プレミアム', vi: 'Cao cấp', tl: 'Premium', hi: 'प्रीमियम' },
		description: { en: '2 premium proteins with extended service' },
		pricePerPerson: 80,
		minGuests: 10,
		maxGuests: null,
		features: [
			{ en: '2 premium proteins per person' },
			{ en: 'Filet Mignon, Lobster, Scallops' },
			{ en: 'Show included' },
			{ en: '120 min service' },
		],
		categoryIds: ['regular-proteins', 'premium'],
		highlighted: true,
		sortOrder: 2,
		visible: true,
	},
	{
		id: 'large-gathering',
		name: { en: 'Large Gathering', zh: '大型聚会', es: 'Gran Reunión', ko: '대규모 모임', ja: '大人数パーティー', vi: 'Tiệc lớn', tl: 'Malaking Pagtitipon', hi: 'बड़ा समारोह' },
		description: { en: '50+ guests buffet style' },
		pricePerPerson: 45,
		minGuests: 50,
		maxGuests: null,
		features: [
			{ en: '2 proteins per person' },
			{ en: 'Buffet style service' },
			{ en: 'Shows included' },
			{ en: '3-4 hours service' },
		],
		categoryIds: ['regular-proteins'],
		highlighted: false,
		sortOrder: 3,
		visible: true,
	},
	{
		id: 'intimate',
		name: { en: 'Intimate Party', zh: '私密聚会', es: 'Fiesta Íntima', ko: '소규모 파티', ja: 'プライベートパーティー', vi: 'Tiệc riêng tư', tl: 'Intimate Party', hi: 'छोटी पार्टी' },
		description: { en: '5-7 guests, all inclusive' },
		pricePerPerson: 0,
		minGuests: 5,
		maxGuests: 7,
		features: [
			{ en: 'Mixed proteins' },
			{ en: 'Salads, gyoza, edamame, noodles' },
			{ en: 'Same-price proteins can be substituted' },
			{ en: '$600 total' },
		],
		categoryIds: ['regular-proteins'],
		highlighted: false,
		sortOrder: 4,
		visible: true,
	},
];

// ---- Spotlights ----
const spotlights = [
	{
		id: 'fried-rice',
		menuItemId: '',
		title: { en: 'Signature Hibachi Fried Rice', zh: '招牌铁板炒饭' },
		subtitle: { en: 'Watch our chef create the famous fried rice with egg, vegetables, and our secret sauce' },
		imageUrl: '',
		sortOrder: 1,
		visible: true,
	},
];

// ---- Coupon Tiers ----
const couponTiers = [
	{ id: 'tier-1', guestRange: { en: 'under 15 people', zh: '15人以下' }, discount: 30, sortOrder: 1 },
	{ id: 'tier-2', guestRange: { en: '15-25 people', zh: '15-25人' }, discount: 60, sortOrder: 2 },
	{ id: 'tier-3', guestRange: { en: '25-35 people', zh: '25-35人' }, discount: 90, sortOrder: 3 },
	{ id: 'tier-4', guestRange: { en: '35+ people', zh: '35人以上' }, discount: 120, sortOrder: 4 },
];

// ---- Pricing Config ----
const pricing = {
	kidsPrice: 30,
	creditCardFee: 0.04,
	gratuitySuggested: 0.20,
	cancellationFee: 200,
	minimumOrder: 600,
	outdoorNote: { en: 'We cook outside only.', zh: '我们仅在户外烹饪。' },
	weatherNote: {
		en: 'We provide services rain or shine, as long as there is a dry area for the chef to cook under.',
		zh: '无论晴雨，只要有干燥的烹饪区域，我们都会提供服务。',
	},
};

// ---- Assemble MenuData ----
const menuData = {
	version: 1,
	packages,
	categories,
	items,
	spotlights,
	couponTiers,
	pricing,
	updatedAt: new Date().toISOString(),
};

// ---- CLI ----
const args = process.argv.slice(2);

if (args[0] === '--post' && args[1] && args[2]) {
	const url = args[1];
	const token = args[2];

	fetch(`${url}/api/menu`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${token}`,
		},
		body: JSON.stringify(menuData),
	})
		.then(async (res) => {
			const body = await res.json();
			if (res.ok && body.success) {
				console.log('Menu data seeded successfully!');
			} else {
				console.error('Failed to seed:', body);
				process.exit(1);
			}
		})
		.catch((err) => {
			console.error('Network error:', err);
			process.exit(1);
		});
} else {
	// Output JSON to stdout
	console.log(JSON.stringify(menuData, null, 2));
}
