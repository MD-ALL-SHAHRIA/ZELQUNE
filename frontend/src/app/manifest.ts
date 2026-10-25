import type { MetadataRoute } from 'next';
import { en } from '@/i18n/dictionaries/en';

/** Install metadata (Add to Home Screen) in the brand's day colours. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Zelqune',
    short_name: 'Zelqune',
    description: en.brand.seoDescription,
    start_url: '/en',
    display: 'standalone',
    background_color: '#f7f1e8',
    theme_color: '#f7f1e8',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
