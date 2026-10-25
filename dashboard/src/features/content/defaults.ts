import { type Schemas } from '@/lib/api';

export type HomeContent = Schemas['UpdateHomeContentDto']['content'];
export type Localized = HomeContent['announcement'];

/**
 * What the storefront shows today (its copy docs), used to pre-fill the editor before the first
 * save so the owner starts from the live site, not an empty form.
 */
export const DEFAULT_HOME: HomeContent = {
  announcement: {
    en: 'Pre-orders are open · ৳300 advance, the rest on delivery',
    bn: 'প্রি-অর্ডার চলছে · ৳৩০০ অগ্রিম, বাকি টাকা ডেলিভারিতে',
  },
  hero: {
    eyebrow: {
      en: 'Sculptural wall decor · Made to order',
      bn: 'ভাস্কর্যধর্মী দেয়াল সজ্জা · অর্ডারে বানানো',
    },
    heading: {
      en: 'Handcrafted wood and gentle light, for walls that tell a',
      bn: 'হাতে গড়া কাঠ আর নরম আলো, দেয়ালে বলুক এক',
    },
    accent: { en: 'quiet story.', bn: 'নিঃশব্দ গল্প।' },
    subline: {
      en: 'Sculptural wall pieces, made to order in Dhaka.',
      bn: 'ভাস্কর্যধর্মী দেয়াল সজ্জা, ঢাকায় অর্ডারে বানানো।',
    },
    scenes: [
      {
        assetId: null,
        productSlug: 'fluted-niche-panel',
        position: '76% 50%',
        phonePosition: '95% 50%',
      },
      {
        assetId: null,
        productSlug: 'half-moon-planter-light',
        position: '75% 50%',
        phonePosition: '93% 50%',
      },
      { assetId: null, productSlug: 'wave-shelf', position: '76% 50%', phonePosition: '95% 50%' },
    ],
  },
  trust: [
    {
      icon: 'hammer',
      title: { en: 'Handcrafted', bn: 'হাতে বানানো' },
      text: { en: 'Made after you order', bn: 'অর্ডারের পর বানানো' },
    },
    {
      icon: 'lightbulb',
      title: { en: 'Safe 5V light', bn: 'নিরাপদ ৫V আলো' },
      text: { en: 'No 220V inside the wood', bn: 'কাঠের ভেতরে ২২০V নেই' },
    },
    {
      icon: 'coins',
      title: { en: '৳300 advance', bn: '৳৩০০ অগ্রিম' },
      text: { en: 'The rest on delivery', bn: 'বাকি টাকা ডেলিভারিতে' },
    },
    {
      icon: 'truck',
      title: { en: 'Across Bangladesh', bn: 'সারা বাংলাদেশে' },
      text: { en: 'Delivered to all 64 districts', bn: '৬৪ জেলাতেই ডেলিভারি' },
    },
  ],
  collections: [
    { categorySlug: 'lighting', assetId: null },
    { categorySlug: 'shelves', assetId: null },
    { categorySlug: 'wall-panels', assetId: null },
  ],
  contact: { phone: '', whatsapp: '', email: '', facebook: '', instagram: '' },
};

export const TRUST_ICONS = [
  'hammer',
  'lightbulb',
  'coins',
  'truck',
  'leaf',
  'shield',
  'hand',
  'sparkles',
] as const;

/** The storefront's built-in scene photos, by product (shown until the owner uploads one). */
export function sampleScene(productSlug: string): string | undefined {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3100';
  const file: Record<string, string> = {
    'fluted-niche-panel': 'moon-v2-1200.webp',
    'half-moon-planter-light': 'half-v2-1200.webp',
    'wave-shelf': 'curve-v2-1200.webp',
  };
  return file[productSlug] ? `${site}/images/hero/${file[productSlug]}` : undefined;
}

/** The storefront's built-in collection covers, by category. */
export function sampleCover(categorySlug: string): string | undefined {
  const scene: Record<string, string> = {
    'wall-panels': 'fluted-niche-panel',
    lighting: 'half-moon-planter-light',
    shelves: 'wave-shelf',
  };
  return scene[categorySlug] ? sampleScene(scene[categorySlug]) : undefined;
}

/** The storefront's sample product photos, by product (until real photos are uploaded). */
export function sampleProductPhoto(productSlug: string): string | undefined {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3100';
  const file: Record<string, string> = {
    'alo-arch-panel': 'terra.webp',
    'diamond-shelf-pair': 'aurora.webp',
    'wave-shelf': 'curve-walnut-shelf-640.webp',
    'half-moon-planter-light': 'half-moon-planter-640.webp',
    'fluted-niche-panel': 'moon-bonsai-panel-640.webp',
    'capsule-vase-light': 'zenith.webp',
  };
  return file[productSlug] ? `${site}/images/samples/${file[productSlug]}` : undefined;
}
