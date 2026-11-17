'use client';

import Lenis from 'lenis';
import { useEffect } from 'react';

const REVEAL_STEP_MS = 70;
const REVEAL_MAX_DELAY_MS = 280;

/**
 * The page's motion runtime (styles in globals.css, "Motion runtime"):
 * - Weighted, gliding scroll for mouse wheels and trackpads (Lenis). Touch keeps the phone's
 *   own scroll. Paused while a dialog or sheet locks the page (Radix sets data-scroll-locked).
 * - `.reveal` elements arrive once, quickly, as they enter the screen; ones that enter together
 *   follow each other. Anything already on screen at load is shown at once (no LCP delay).
 * - `[data-loop]` regions (marquees, the product glide) pause while off screen.
 * With reduced motion none of this runs: content is simply there and the browser scrolls.
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
    const track = (scope: ParentNode) => {
      for (const el of scope.querySelectorAll<HTMLElement>('.reveal:not([data-in])')) {
        const r = el.getBoundingClientRect();
        if (!root.classList.contains('motion') && r.top < innerHeight && r.bottom > 0)
          el.dataset.in = '';
        else reveal.observe(el);
      }
      for (const el of scope.querySelectorAll<HTMLElement>('[data-loop]')) loops.observe(el);
    };
    track(document);
    root.classList.add('motion');
    // Client-side page changes bring new sections.
    const added = new MutationObserver((records) => {
      for (const r of records)
        for (const node of r.addedNodes) if (node instanceof HTMLElement) track(node);
    });
    added.observe(document.body, { childList: true, subtree: true });

    const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, anchors: true });
    let frame = requestAnimationFrame(function raf(time) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    });
    const lock = new MutationObserver(() => {
      if (document.body.hasAttribute('data-scroll-locked')) lenis.stop();
      else lenis.start();
    });
    lock.observe(document.body, { attributes: true, attributeFilter: ['data-scroll-locked'] });

    return () => {
      reveal.disconnect();
      loops.disconnect();
      added.disconnect();
      lock.disconnect();
      cancelAnimationFrame(frame);
      lenis.destroy();
      root.classList.remove('motion');
    };
  }, []);
  return null;
}
