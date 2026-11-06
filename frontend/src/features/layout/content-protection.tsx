'use client';

import { useEffect } from 'react';

/** Photos, videos and anything marked data-protect (the logo): what people try to save. */
const MEDIA = 'img, picture, video, [data-protect]';

/**
 * Discourages saving our photos and videos (Terms: Copyright): no "Save image" menu and no
 * dragging a picture out of the page. Covers every image, including ones added later, because it
 * listens on the document. Text stays selectable and the rest of the page keeps its normal menu.
 * It cannot stop screenshots; the copyright notice and the Terms do the rest.
 */
export function ContentProtection() {
  useEffect(() => {
    const block = (e: Event) => {
      if (e.target instanceof Element && e.target.closest(MEDIA)) e.preventDefault();
    };
    document.addEventListener('contextmenu', block);
    document.addEventListener('dragstart', block);
    return () => {
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('dragstart', block);
    };
  }, []);
  return null;
}
