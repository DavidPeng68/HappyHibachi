import type { MenuData } from '../types';

const API_BASE = '/api';

// Fallback menu data for local development when API is unavailable
const FALLBACK_MENU: MenuData = {
  version: 1,
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
    {
      id: 'item-chicken',
      categoryId: 'cat-regular',
      name: { en: 'Chicken' },
      description: { en: 'Tender chicken breast, marinated in our signature sauce' },
      price: 0,
      priceType: 'included',
      imageUrl: '/images/menu/chicken.jpg',
      tags: ['popular'],
      available: true,
      orderable: true,
      sortOrder: 1,
    },
    {
      id: 'item-steak',
      categoryId: 'cat-regular',
      name: { en: 'Steak' },
      description: { en: 'USDA Choice beef, perfectly seasoned' },
      price: 0,
      priceType: 'included',
      imageUrl: '/images/menu/steak.jpg',
      tags: ['popular'],
      available: true,
      orderable: true,
      sortOrder: 2,
    },
    {
      id: 'item-shrimp',
      categoryId: 'cat-regular',
      name: { en: 'Shrimp' },
      description: { en: 'Large shrimp, lightly seasoned and grilled to perfection' },
      price: 0,
      priceType: 'included',
      imageUrl: '/images/menu/shrimp.jpg',
      tags: ['popular'],
      available: true,
      orderable: true,
      sortOrder: 3,
    },
    {
      id: 'item-scallops',
      categoryId: 'cat-regular',
      name: { en: 'Scallops' },
      description: { en: 'Fresh sea scallops, seared to perfection' },
      price: 0,
      priceType: 'included',
      imageUrl: '/images/menu/scallops.jpg',
      tags: [],
      available: true,
      orderable: true,
      sortOrder: 4,
    },
    {
      id: 'item-salmon',
      categoryId: 'cat-regular',
      name: { en: 'Salmon' },
      description: { en: 'Wild-caught salmon fillet, lightly seasoned' },
      price: 0,
      priceType: 'included',
      imageUrl: '/images/menu/salmon.jpg',
      tags: [],
      available: true,
      orderable: true,
      sortOrder: 5,
    },
    {
      id: 'item-tofu',
      categoryId: 'cat-regular',
      name: { en: 'Tofu' },
      description: { en: 'Firm tofu, marinated and grilled' },
      price: 0,
      priceType: 'included',
      imageUrl: '/images/menu/tofu.jpg',
      tags: ['vegetarian'],
      available: true,
      orderable: true,
      sortOrder: 6,
    },
    {
      id: 'item-filet-mignon',
      categoryId: 'cat-premium',
      name: { en: 'Filet Mignon' },
      description: { en: 'USDA Prime filet mignon' },
      price: 5,
      priceType: 'upgrade',
      imageUrl: '/images/menu/filet-mignon-upgrade.jpg',
      tags: ['popular'],
      available: true,
      orderable: true,
      sortOrder: 1,
    },
    {
      id: 'item-lobster',
      categoryId: 'cat-premium',
      name: { en: 'Lobster Tail' },
      description: { en: 'Fresh lobster tail, pan-seared with clarified butter' },
      price: 10,
      priceType: 'upgrade',
      imageUrl: '/images/menu/spiny-lobster-tail-upgrade.jpg',
      tags: ['popular'],
      available: true,
      orderable: true,
      sortOrder: 2,
    },
    {
      id: 'item-gyoza',
      categoryId: 'cat-addons',
      name: { en: 'Gyoza (12pcs)' },
      description: { en: 'Pan-fried Japanese dumplings' },
      price: 15,
      priceType: 'per_item',
      imageUrl: '/images/menu/gyoza.jpg',
      tags: [],
      available: true,
      orderable: true,
      sortOrder: 1,
    },
    {
      id: 'item-edamame',
      categoryId: 'cat-addons',
      name: { en: 'Edamame' },
      description: { en: 'Steamed soybeans with sea salt' },
      price: 10,
      priceType: 'per_item',
      imageUrl: '/images/menu/edamame.jpg',
      tags: ['vegetarian'],
      available: true,
      orderable: true,
      sortOrder: 2,
    },
    {
      id: 'item-noodles',
      categoryId: 'cat-addons',
      name: { en: 'Noodles' },
      description: { en: 'Stir-fried hibachi noodles' },
      price: 5,
      priceType: 'per_person',
      imageUrl: '/images/menu/noodles.jpg',
      tags: [],
      available: true,
      orderable: true,
      sortOrder: 3,
    },
    {
      id: 'item-third-protein',
      categoryId: 'cat-addons',
      name: { en: '3rd Protein' },
      description: { en: 'Add an extra protein to your meal' },
      price: 10,
      priceType: 'per_person',
      imageUrl: '',
      tags: [],
      available: true,
      orderable: true,
      sortOrder: 4,
    },
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
    gratuitySuggested: 0.2,
    cancellationFee: 200,
    minimumOrder: 600,
    outdoorNote: { en: 'We cook outside only.' },
    weatherNote: {
      en: 'We provide services rain or shine, as long as there is a dry area for the chef to cook under.',
    },
  },
  updatedAt: new Date().toISOString(),
};

export async function fetchMenu(): Promise<MenuData> {
  try {
    const res = await fetch(`${API_BASE}/menu`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch menu');
    return data.menu;
  } catch {
    // Fallback to default menu when API is unavailable (e.g., local development)
    return FALLBACK_MENU;
  }
}

export async function updateMenu(menuData: MenuData, token: string): Promise<MenuData> {
  const res = await fetch(`${API_BASE}/menu`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(menuData),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to update menu');
  return data.menu;
}

export async function uploadMenuImage(file: File, itemId: string, token: string): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('itemId', itemId);

  const res = await fetch(`${API_BASE}/menu/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to upload image');
  return data.url;
}
