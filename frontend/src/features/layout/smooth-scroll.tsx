'use client';

import Lenis from 'lenis';
import { useEffect } from 'react';

/**
 * Weighted, gliding page scroll for mouse wheels and trackpads (Lenis). Touch keeps the
 * phone's own scroll, and visitors who ask for reduced motion keep the browser's. It pauses
 * while a dialog or sheet locks the page (Radix sets data-scroll-locked on <body>), and any
 * element marked data-lenis-prevent (lists inside dialogs, sideways strips) scrolls natively.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({ lerp: 0.075, wheelMultiplier: 0.9, anchors: true });
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
      lock.disconnect();
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);
  return null;
}
