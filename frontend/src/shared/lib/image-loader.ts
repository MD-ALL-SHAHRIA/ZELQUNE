'use client';

import type { ImageLoaderProps } from 'next/image';

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
  // Our own sample renders (public/images/samples) are pre-sized WebP files under 100 KB: served
  // as they are (the width only keeps next/image's per-width URLs distinct).
  if (src.startsWith('/images/')) return `${src}?w=${width}`;
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality ?? 75}`;
}
