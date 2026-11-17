'use client';

import { useEffect } from 'react';

const REVEAL_STEP_MS = 70;
const REVEAL_MAX_DELAY_MS = 280;

/**
 * The page's motion runtime (styles in globals.css, "Motion runtime"):
 * - `.reveal` elements arrive once, quickly, as they enter the screen; ones that enter together
 *   follow each other. Anything already on screen when a page opens (first load or a click to
 *   another page) is shown at once, so a new page never looks like it is still loading.
 * - `[data-loop]` regions (marquees, the product glide) pause while off screen.
 * Scrolling stays the browser's own (a smooth-scroll library fought trackpad momentum).
 * With reduced motion none of this runs: content is simply there.
 */
export function Motion() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const root = document.documentElement;

    const reveal = new IntersectionObserver(
      (entries) => {
        let n = 0;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          el.style.setProperty(
            '--reveal-delay',
            `${Math.min(n++ * REVEAL_STEP_MS, REVEAL_MAX_DELAY_MS)}ms`,
          );
          el.dataset.in = '';
          reveal.unobserve(el);
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    const loops = new IntersectionObserver((entries) => {
      for (const e of entries)
        (e.target as HTMLElement).toggleAttribute('data-offscreen', !e.isIntersecting);
    });
    const seen = new WeakSet<Element>();
    const track = () => {
      for (const el of document.querySelectorAll<HTMLElement>('.reveal:not([data-in])')) {
        if (seen.has(el)) continue;
        seen.add(el);
        const r = el.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) el.dataset.in = '';
        else reveal.observe(el);
      }
      for (const el of document.querySelectorAll<HTMLElement>('[data-loop]')) {
        if (seen.has(el)) continue;
        seen.add(el);
        loops.observe(el);
      }
    };
    track();
    root.classList.add('motion');
    // Client-side page changes bring new sections: one scan per frame, however many nodes.
    let pending = 0;
    const added = new MutationObserver(() => {
      if (!pending) pending = requestAnimationFrame(() => ((pending = 0), track()));
    });
    added.observe(document.body, { childList: true, subtree: true });

    return () => {
      reveal.disconnect();
      loops.disconnect();
      added.disconnect();
      cancelAnimationFrame(pending);
      root.classList.remove('motion');
    };
  }, []);
  return null;
}
