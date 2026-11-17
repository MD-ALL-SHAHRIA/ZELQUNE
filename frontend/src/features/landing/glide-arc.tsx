'use client';

import { useEffect, useRef } from 'react';

/**
 * Bends the product glide into a gentle arc (desktop pointers only): each piece turns toward
 * the middle of the screen and sits further back the closer it is to an edge. Runs only while
 * the strip is on screen; touch screens and reduced motion keep the flat strip.
 */
export function GlideArc({ label, children }: { label: string; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ok = matchMedia(
      '(pointer: fine) and (min-width: 1024px) and (prefers-reduced-motion: no-preference)',
    );
    if (!ok.matches) return;
    const items = [...el.querySelectorAll<HTMLElement>('.glide-item')];
    let frame = 0;
    const bend = () => {
      const half = innerWidth / 2;
      // All reads first, then all writes: one style pass per frame, not one per piece.
      const centres = items.map((item) => {
        const r = item.getBoundingClientRect();
        return r.left + r.width / 2;
      });
      items.forEach((item, i) => {
        const d = Math.max(-1.6, Math.min(1.6, (centres[i]! - half) / half));
        item.style.transform = `translate3d(0, ${(d * d * 26).toFixed(1)}px, ${(-d * d * 220).toFixed(1)}px) rotateY(${(-d * 34).toFixed(2)}deg)`;
      });
      frame = requestAnimationFrame(bend);
    };
    const seen = new IntersectionObserver(([e]) => {
      cancelAnimationFrame(frame);
      if (e?.isIntersecting) frame = requestAnimationFrame(bend);
    });
    seen.observe(el);
    el.dataset.arc = '';
    return () => {
      seen.disconnect();
      cancelAnimationFrame(frame);
      delete el.dataset.arc;
      for (const item of items) item.style.transform = '';
    };
  }, []);
  return (
    <section
      ref={ref}
      aria-label={label}
      data-loop
      className="glide overflow-hidden py-14 sm:py-20"
    >
      {children}
    </section>
  );
}
