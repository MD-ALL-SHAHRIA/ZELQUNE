import { SAMPLE, SAMPLE_PRODUCT_GALLERY } from '@/content/sample-images';
import { type Locale } from '@/i18n/config';

interface Media {
  url: string;
  altBn: string | null;
  altEn: string | null;
}

export interface ProductImage {
  src: string;
  alt: string;
  /** True while a sample photo stands in for the product (shown with a note). */
  sample: boolean;
  /** The file's real size, when known (owner renders), for the hero gallery. */
  width?: number;
  height?: number;
}

const DEFAULT_GALLERY = SAMPLE_PRODUCT_GALLERY['alo-arch-panel'] ?? [];

/**
 * Real catalog photos always win; until uploaded, lookalike sample photos chosen per product
 * stand in (marked as samples).
 */
export function productImages(
  media: Media[],
  name: string,
  lang: Locale,
  slug: string,
): ProductImage[] {
  if (media.length) {
    return media.map((m) => ({
      src: m.url,
      alt: (lang === 'bn' ? m.altBn : m.altEn) ?? name,
      sample: false,
    }));
  }
  const keys = SAMPLE_PRODUCT_GALLERY[slug] ?? DEFAULT_GALLERY;
  return keys.map((key) => {
    const sample: { src: string; w?: number; h?: number } = SAMPLE[key];
    return { src: sample.src, alt: name, sample: true, width: sample.w, height: sample.h };
  });
}
