// Application Constants
import type { Region, FAQItem, Review, PricingTier, BusinessHours } from '../types';
import type { TFunction } from 'i18next';

// Animation timing constants
export const ANIMATION = {
  SCROLL_DELAY_MS: 100,
  SLIDE_INTERVAL_MS: 4000,
  TRANSITION_DURATION_MS: 300,
} as const;

// Pricing constants
export const PRICING = {
  PER_PERSON: Number(process.env.REACT_APP_PRICE_PER_PERSON) || 60,
  MINIMUM_ORDER: Number(process.env.REACT_APP_MINIMUM_ORDER) || 600,
  KIDS_PRICE: Number(process.env.REACT_APP_KIDS_PRICE) || 30,
  CREDIT_CARD_FEE: 0.04, // 4%
  GRATUITY_SUGGESTED: 0.2, // 20%
  CANCELLATION_FEE: 200,
} as const;

// Upgrade prices
export const UPGRADES = {
  FILET_MIGNON: 5,
  LOBSTER: 10,
  ORGANIC_CHICKEN: 5,
  PREMIUM_RIBEYE: 10,
  JUMBO_SHRIMP: 10,
  SALMON: 10,
  LARGE_SCALLOPS: 10,
  THIRD_PROTEIN: 10,
  THIRD_PROTEIN_FILET: 15,
  THIRD_PROTEIN_LOBSTER: 20,
  NOODLES: 5,
  GYOZA_12PCS: 15,
  EDAMAME: 10,
} as const;

// Business hours
export const BUSINESS_HOURS: BusinessHours = {
  afternoon: process.env.REACT_APP_HOURS_AFTERNOON || '1:00 PM - 3:00 PM',
  evening: process.env.REACT_APP_HOURS_EVENING || '4:00 PM - 6:00 PM',
  night: process.env.REACT_APP_HOURS_NIGHT || '7:00 PM - 9:00 PM',
};

/** Convert a city name to a URL slug (e.g. "Los Angeles" → "los-angeles") */
export const toSlug = (name: string): string => name.toLowerCase().replace(/\s+/g, '-');

/** Build a CityData object from a city name */
const city = (name: string) => ({ name, slug: toSlug(name) });

// Service regions
export const REGIONS: Region[] = [
  {
    id: 'california',
    name: 'CALIFORNIA',
    slug: 'california',
    cities: [
      city('Los Angeles'),
      city('Orange County'),
      city('San Francisco'),
      city('San Diego'),
      city('San Jose'),
      city('Sacramento'),
      city('Palm Springs'),
      city('Lake Tahoe'),
      city('Bay Area'),
      city('Central Valley'),
      city('Inland Empire'),
      city('Ventura County'),
      city('Santa Barbara'),
      city('Monterey'),
      city('Fresno'),
      city('Bakersfield'),
    ],
    hashLink: '#california',
  },
  {
    id: 'texas',
    name: 'TEXAS',
    slug: 'texas',
    cities: [
      city('Houston'),
      city('Dallas'),
      city('Fort Worth'),
      city('Austin'),
      city('San Antonio'),
      city('Arlington'),
      city('Plano'),
      city('Irving'),
      city('Corpus Christi'),
      city('Lubbock'),
      city('El Paso'),
      city('Amarillo'),
      city('Waco'),
      city('College Station'),
      city('Galveston'),
      city('Beaumont'),
    ],
    hashLink: '#texas',
  },
  {
    id: 'florida',
    name: 'FLORIDA',
    slug: 'florida',
    cities: [
      city('Miami'),
      city('Miami Beach'),
      city('Fort Lauderdale'),
      city('Hollywood'),
      city('Coral Gables'),
      city('Doral'),
      city('Hialeah'),
      city('Aventura'),
      city('Sunny Isles'),
      city('North Miami'),
      city('South Miami'),
      city('Kendall'),
      city('Homestead'),
      city('Key West'),
      city('Boca Raton'),
      city('West Palm Beach'),
    ],
    hashLink: '#florida',
  },
];

/** Look up a region + city by their slugs */
export const findBySlug = (stateSlug: string, citySlug?: string) => {
  const region = REGIONS.find((r) => r.slug === stateSlug);
  if (!region) return null;
  if (!citySlug) return { region, city: null };
  const cityData = region.cities.find((c) => c.slug === citySlug);
  return cityData ? { region, city: cityData } : null;
};

// Coupon tiers
export const COUPON_TIERS: PricingTier[] = [
  { guestRange: 'under 15 people', discount: 30 },
  { guestRange: '15-25 people', discount: 60 },
  { guestRange: '25-35 people', discount: 90 },
  { guestRange: '35+ people', discount: 120 },
];

// FAQ data
export const FAQ_ITEMS: FAQItem[] = [
  {
    id: 1,
    question: 'How much does your service cost?',
    answer: `Our service has a base price of $${PRICING.PER_PERSON} per person with a $${PRICING.MINIMUM_ORDER} minimum spend. Suggested gratuity is ${PRICING.GRATUITY_SUGGESTED * 100}% of total bill. Travel fees may apply and will vary based on your location. These fees will be determined after booking. Cash or Credit Card (with a ${PRICING.CREDIT_CARD_FEE * 100}% admin fee) are the accepted payment methods. If paying with credit card, it must be done 72 hours prior to the event! You cannot pay at the end of the party with credit card - must be done 72 hours prior.`,
  },
  {
    id: 2,
    question: 'What time will the chef arrive?',
    answer:
      'The chef will arrive approximately 10 minutes prior to reservation time. Our set up process is seamless and only takes a few minutes.',
  },
  {
    id: 3,
    question: 'Do you set up tables and chairs?',
    answer:
      'No we do not! We provide the chef, grill, food, sake and the best part - ENTERTAINMENT! Customers will provide utensils and table set ups. For more information on set ups please check out our Instagram @familyfriendshibachi to see how other customers set up!',
  },
  {
    id: 4,
    question: 'Do you cook inside homes?',
    answer:
      'We only cook on outside premises. Our experience is open to terraces, balconies, and under awnings. At this time we do not cook in any indoor premises. Although you can set your party up inside, the chef will cook outside! We are licensed and insured.',
  },
  {
    id: 5,
    question: 'Do you cook with nuts or sesame products?',
    answer:
      'No, our food does not contain any nuts or sesame products. Please notify the booking agent of any other food allergy a customer may have.',
  },
  {
    id: 6,
    question: 'Can you accommodate Gluten Free?',
    answer:
      'Yes we have serviced many gluten free customers. We ask that you bring your favorite gluten free soy sauce and teriyaki sauce for the chef to cook your portion separate!',
  },
  {
    id: 7,
    question: 'What if someone does not eat meat?',
    answer:
      'We can provide tofu to meet Vegetarian and Vegan needs. The price per person does not change. We will supplement their dishes with additional food such as extra veggies, salad, and noodles.',
  },
  {
    id: 8,
    question: 'Can the customer provide their own proteins?',
    answer:
      'Due to insurance and pricing requirements, we do not cook any outside protein or food at this time.',
  },
  {
    id: 9,
    question: 'How can I make a reservation?',
    answer:
      'All of our bookings are currently done through our website. If you are going to be 30+ guests, please book two reservations for the same date and time, so we can send two chefs. There are no extra fees for an additional chef.',
  },
  {
    id: 10,
    question: 'What is your cancellation policy?',
    answer: `48 hours notice for all cancellations and rescheduled parties or guest will be charged a fee of $${PRICING.CANCELLATION_FEE}.00. If it rains, customer is required to provide some type of covering for the chef to cook under so they can stay dry. We can cook under tents, and patios. Customer is responsible for canceling due to inclement weather within 48 hours of your party.`,
  },
];

// Customer reviews (default fallback, used when API is unavailable)
export const REVIEWS: Review[] = [
  {
    id: '1',
    name: 'Sarah M.',
    location: 'Los Angeles, CA',
    rating: 5,
    review:
      'Amazing experience! The chef was entertaining and the food was incredible. Our backyard party was a huge success!',
    event: 'Birthday Party',
  },
  {
    id: '2',
    name: 'Michael T.',
    location: 'Houston, TX',
    rating: 5,
    review:
      'Professional service from start to finish. The hibachi setup was perfect and the food was restaurant quality.',
    event: 'Corporate Event',
  },
  {
    id: '3',
    name: 'Jennifer L.',
    location: 'Miami, FL',
    rating: 5,
    review:
      'Best decision for our anniversary! The intimate hibachi experience was romantic and delicious.',
    event: 'Anniversary',
  },
  {
    id: '4',
    name: 'David R.',
    location: 'San Diego, CA',
    rating: 5,
    review:
      "Outstanding value for money. The chef's performance was spectacular and the food was fresh and flavorful.",
    event: 'Graduation Party',
  },
  {
    id: '5',
    name: 'Lisa K.',
    location: 'Austin, TX',
    rating: 5,
    review:
      "The best hibachi experience we've ever had! Fresh ingredients, amazing flavors, and the chef's entertainment skills were top-notch.",
    event: 'Graduation Party',
  },
  {
    id: '6',
    name: 'Robert C.',
    location: 'Orlando, FL',
    rating: 5,
    review:
      'Incredible value for money. The food was restaurant-quality and the service was impeccable. Our guests are still talking about it!',
    event: 'Birthday Party',
  },
  {
    id: '7',
    name: 'Angela W.',
    location: 'San Francisco, CA',
    rating: 5,
    review:
      'We hosted a 30-person team building event and it was flawless. The onion volcano trick had everyone cheering! Highly recommend for corporate gatherings.',
    event: 'Corporate Event',
  },
  {
    id: '8',
    name: 'Carlos R.',
    location: 'Dallas, TX',
    rating: 4,
    review:
      'Great food and entertainment. The chef was very skilled and personable. Only minor note — book early because weekends fill up fast!',
    event: 'Birthday Party',
  },
  {
    id: '9',
    name: 'Priya S.',
    location: 'Fort Lauderdale, FL',
    rating: 5,
    review:
      'Our kids absolutely loved it! The chef made it so interactive and fun. The food was fresh, delicious, and cooked right before our eyes.',
    event: 'Holiday Party',
  },
  {
    id: '10',
    name: 'James & Maria H.',
    location: 'Sacramento, CA',
    rating: 4,
    review:
      'Perfect for our wedding rehearsal dinner. Guests loved the interactive experience and the sake was flowing! Would use again for our anniversary.',
    event: 'Wedding Event',
  },
];

/** Get translated reviews (for default/fallback reviews only) */
export const getTranslatedReviews = (t: TFunction): Review[] => [
  {
    id: '1',
    name: 'Sarah M.',
    location: t('reviews.items.r1.location'),
    rating: 5,
    review: t('reviews.items.r1.review'),
    event: t('form.eventTypes.birthday'),
  },
  {
    id: '2',
    name: 'Michael T.',
    location: t('reviews.items.r2.location'),
    rating: 5,
    review: t('reviews.items.r2.review'),
    event: t('form.eventTypes.corporate'),
  },
  {
    id: '3',
    name: 'Jennifer L.',
    location: t('reviews.items.r3.location'),
    rating: 5,
    review: t('reviews.items.r3.review'),
    event: t('form.eventTypes.anniversary'),
  },
  {
    id: '4',
    name: 'David R.',
    location: t('reviews.items.r4.location'),
    rating: 5,
    review: t('reviews.items.r4.review'),
    event: t('form.eventTypes.graduation'),
  },
  {
    id: '5',
    name: 'Lisa K.',
    location: t('reviews.items.r5.location'),
    rating: 5,
    review: t('reviews.items.r5.review'),
    event: t('form.eventTypes.graduation'),
  },
  {
    id: '6',
    name: 'Robert C.',
    location: t('reviews.items.r6.location'),
    rating: 5,
    review: t('reviews.items.r6.review'),
    event: t('form.eventTypes.birthday'),
  },
  {
    id: '7',
    name: 'Angela W.',
    location: t('reviews.items.r7.location'),
    rating: 5,
    review: t('reviews.items.r7.review'),
    event: t('form.eventTypes.corporate'),
  },
  {
    id: '8',
    name: 'Carlos R.',
    location: t('reviews.items.r8.location'),
    rating: 4,
    review: t('reviews.items.r8.review'),
    event: t('form.eventTypes.birthday'),
  },
  {
    id: '9',
    name: 'Priya S.',
    location: t('reviews.items.r9.location'),
    rating: 5,
    review: t('reviews.items.r9.review'),
    event: t('form.eventTypes.holiday'),
  },
  {
    id: '10',
    name: 'James & Maria H.',
    location: t('reviews.items.r10.location'),
    rating: 4,
    review: t('reviews.items.r10.review'),
    event: t('form.eventTypes.wedding'),
  },
];

// Proteins list
export const PROTEINS = {
  BASE: ['Chicken', 'Steak', 'Shrimp', 'Scallops', 'Salmon', 'Tofu'],
  PREMIUM: [
    'Filet Mignon',
    'Lobster',
    'Organic Chicken',
    'Premium Ribeye',
    'Jumbo Shrimp',
    'Wild Alaska Salmon',
    'Large Scallops',
  ],
} as const;

// Navigation routes
export const ROUTES = {
  HOME: '/',
  FREE_ESTIMATE: '/free-estimate',
  BOOK_NOW: '/order', // Redirected: /book-now → /order (one-stop booking)
  MY_BOOKING: '/my-booking',
  PRIVACY: '/privacy',
  TERMS: '/terms',
  ADMIN: '/admin',
} as const;

// Section IDs for scroll navigation
export const SECTION_IDS = {
  MENU: 'menu',
  GALLERY: 'gallery',
  FAQ: 'faq',
  CONTACT: 'contact',
  REVIEWS: 'reviews',
} as const;
