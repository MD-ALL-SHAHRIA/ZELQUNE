'use client';

import type { ImageLoaderProps } from 'next/image';

const PHONE_CUTS = ['moon-bonsai-panel', 'curve-walnut-shelf', 'half-moon-planter'];

/**
 * Global next/image loader. Unsplash sample photos are resized by Unsplash's own image CDN
 * (WebP/AVIF via auto=format), so our server never proxies large originals; everything else
 * (catalog media) goes through Next's optimizer as usual.
 */
export default function imageLoader({ src, width, quality }: ImageLoaderProps): string {
  if (src.startsWith('https://images.unsplash.com/')) {
    const url = new URL(src);
    url.searchParams.set('w', String(width));
    // Phone-sized sample photos are the LCP on slow mobile networks: a lighter default there.
    url.searchParams.set('q', String(quality ?? (width <= 828 ? 60 : 72)));
    url.searchParams.set('auto', 'format');
    url.searchParams.set('fit', 'crop');
    return url.toString();
  }
  // Our own sample renders (public/images/samples) are pre-sized WebP files under 100 KB, served
  // as they are. The three full renders also have a 640px phone cut (`-640.webp`, ~30 KB).
  if (src.startsWith('/images/')) {
    if (width <= 750 && PHONE_CUTS.some((name) => src.endsWith(`/${name}.webp`))) {
      return src.replace(/\.webp$/, '-640.webp');
    }
    // Hero scenes (public/images/hero) have a 1200px cut for phones and small laptops.
    if (width <= 1200 && src.startsWith('/images/hero/')) {
      return src.replace(/\.webp$/, '-1200.webp');
    }
    return `${src}?w=${width}`;
  }
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality ?? 75}`;
}
