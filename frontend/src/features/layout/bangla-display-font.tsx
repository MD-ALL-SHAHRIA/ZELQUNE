'use client';

import { useEffect } from 'react';

const BENGALI_RANGE =
  'U+0951-0952, U+0964-0965, U+0980-09FE, U+1CD0, U+1CD2, U+1CD5-1CD6, U+1CD8, U+1CE1, U+1CEA, ' +
  'U+1CED, U+1CF2, U+1CF5-1CF7, U+200C-200D, U+20B9, U+25CC, U+A8F1, U+11DF0-11DF1';

/**
 * Registers Tiro Bangla (Bangla display headings) once the page has loaded, so the font never
 * delays the first paint or the hero image on slow connections. Headings show in Hind Siliguri
 * until then. Rendered on /bn pages only.
 */
export function BanglaDisplayFont() {
  useEffect(() => {
    if ([...document.fonts].some((f) => f.family === 'Tiro Bangla')) return;
    const load = () => {
      const face = new FontFace(
        'Tiro Bangla',
        "url('/fonts/tiro-bangla-400-bengali.woff2') format('woff2')",
        // Tiro's Bangla is optically much larger than Cormorant's Latin at the same size.
        { unicodeRange: BENGALI_RANGE, display: 'swap', sizeAdjust: '88%' } as FontFaceDescriptors,
      );
      face
        .load()
        .then((loaded) => document.fonts.add(loaded))
        .catch(() => {});
    };
    if (document.readyState === 'complete') load();
    else window.addEventListener('load', load, { once: true });
    return () => window.removeEventListener('load', load);
  }, []);
  return null;
}
