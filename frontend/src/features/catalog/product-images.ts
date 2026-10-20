import { SAMPLE } from '@/content/sample-images';
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
}

const SAMPLE_GALLERY = [SAMPLE.productTubes, SAMPLE.testTubes, SAMPLE.dayVase, SAMPLE.nightVase];

/** Real catalog photos always win; until uploaded, sample photos stand in (marked as samples). */
export function productImages(media: Media[], name: string, lang: Locale): ProductImage[] {
  if (media.length) {
    return media.map((m) => ({
      src: m.url,
      alt: (lang === 'bn' ? m.altBn : m.altEn) ?? name,
      sample: false,
    }));
  }
  return SAMPLE_GALLERY.map((s) => ({ src: s.src, alt: name, sample: true }));
}
