'use client';

import { type ReactNode, useEffect, useRef } from 'react';

/** Resting drift, px per second. */
const DRIFT = 38;
/** How strongly a scrolled pixel pushes the ribbon. */
const SCROLL_PUSH = 14;
/** Most lean (degrees) at full speed. */
const MAX_SKEW = 7;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Moves the promise ribbon: a slow drift that answers the visitor. Scrolling pushes it the same
 * way (down: faster to the left; up: it turns and runs right) and it leans with its speed; it can
 * be grabbed and thrown (mouse or finger, vertical page scroll stays native); under the pointer
 * it eases to a stop. One transform per frame, nothing while off screen; with reduced motion it
 * never starts (the row then scrolls by hand, CSS).
 */
export function RibbonMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current;
    const t = track.current;
    if (!el || !t || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.dataset.live = '';
    let x = 0;
    let v = -DRIFT;
    let dir = -1;
    let hover = false;
    let drag: { last: number; at: number } | null = null;
    let lastY = window.scrollY;
    let last = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;
      if (dy && !drag) {
        dir = dy > 0 ? -1 : 1;
        v += -dy * SCROLL_PUSH * 0.06;
      }
      if (!drag) {
        const rest = hover ? 0 : dir * DRIFT;
        v += (rest - v) * Math.min(1, dt * (hover ? 5 : 2.2));
        x += v * dt;
      }
      const half = t.scrollWidth / 2;
      if (half > 0) {
        x %= half;
        if (x > 0) x -= half;
      }
      const skew = clamp(v / 140, -MAX_SKEW, MAX_SKEW);
      t.style.transform = `translate3d(${x.toFixed(2)}px,0,0) skewX(${skew.toFixed(2)}deg)`;
      frame = requestAnimationFrame(tick);
    };
    const start = () => {
      if (frame) return;
      last = performance.now();
      lastY = window.scrollY;
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const seen = new IntersectionObserver(([e]) => (e?.isIntersecting ? start() : stop()));
    seen.observe(el);

    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      drag = { last: e.clientX, at: e.timeStamp };
      v = 0;
      el.dataset.dragging = '';
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.last;
      const ms = Math.max(1, e.timeStamp - drag.at);
      if (Math.abs(dx) > 2 && !el.hasPointerCapture(e.pointerId)) el.setPointerCapture(e.pointerId);
      x += dx;
      v = (dx / ms) * 1000;
      drag = { last: e.clientX, at: e.timeStamp };
      if (dx) dir = dx < 0 ? -1 : 1;
    };
    const up = (e: PointerEvent) => {
      if (!drag) return;
      drag = null;
      v = clamp(v, -2400, 2400);
      delete el.dataset.dragging;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    };
    const enter = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') hover = true;
    };
    const leave = () => (hover = false);
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointerleave', leave);
    return () => {
      stop();
      seen.disconnect();
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('pointerenter', enter);
      el.removeEventListener('pointerleave', leave);
      delete el.dataset.live;
    };
  }, []);
  return (
    <div ref={root} className="ribbon-track">
      <div ref={track} className="ribbon-run flex w-max will-change-transform">
        {children}
      </div>
    </div>
  );
}
