'use client';

import { useEffect, useRef, useState } from 'react';

/** Gutter from the page edge to the thread on wide screens, and on phones. */
const GUTTER = 28;
const GUTTER_SM = 12;
/** How far into the next section the diagonal crossing reaches. */
const CROSS = 110;

const clamp = (v: number) => Math.min(1, Math.max(0, v));

/**
 * The roadmap thread: one thin brass line that runs down the page through the sections that
 * follow the film, down one edge, across on a diagonal at each new section, down the other, and
 * draws itself as you scroll with a glowing point at its tip. Decoration only (aria-hidden);
 * drawn complete and still for reduced motion.
 */
export function ThreadLine({ children }: { children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const draw = useRef<SVGPathElement>(null);
  const dot = useRef<SVGGElement>(null);
  const [geo, setGeo] = useState<{ w: number; h: number; d: string } | null>(null);

  // Lay the thread along the sections (again whenever their size changes).
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const layout = () => {
      const w = el.clientWidth;
      const h = el.scrollHeight;
      const narrow = w < 768;
      const g = narrow ? GUTTER_SM : GUTTER;
      const sections = [...el.children].filter((c) => c.tagName !== 'svg') as HTMLElement[];
      if (narrow) {
        setGeo({ w, h, d: `M ${g} 0 V ${h}` });
        return;
      }
      let d = `M ${g} 0`;
      sections.forEach((s, i) => {
        const x = i % 2 ? w - g : g;
        const bottom = s.offsetTop + s.offsetHeight;
        const next = sections[i + 1];
        if (!next) {
          d += ` L ${x} ${h}`;
          return;
        }
        const nx = (i + 1) % 2 ? w - g : g;
        // Down this side, a soft corner, then across into the next section.
        d += ` L ${x} ${bottom - 40} Q ${x} ${bottom} ${x + (nx - x) * 0.06} ${bottom + 6}`;
        d += ` L ${nx - (nx - x) * 0.06} ${bottom + CROSS - 6} Q ${nx} ${bottom + CROSS} ${nx} ${bottom + CROSS + 40}`;
      });
      setGeo({ w, h, d });
    };
    layout();
    const watch = new ResizeObserver(layout);
    watch.observe(el);
    return () => watch.disconnect();
  }, []);

  // Draw it with the scroll, the glowing point riding the tip.
  useEffect(() => {
    const el = box.current;
    const path = draw.current;
    if (!el || !path || !geo) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const length = path.getTotalLength();
    let frame = 0;
    const paint = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      // The tip sits at 60% of the screen height.
      const p = still ? 1 : clamp((window.innerHeight * 0.6 - r.top) / r.height);
      path.style.strokeDashoffset = String(1 - p);
      const pt = path.getPointAtLength(p * length);
      if (dot.current) {
        dot.current.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
        dot.current.style.opacity = p > 0.002 && p < 0.998 ? '1' : '0';
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    paint();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [geo]);

  return (
    <div ref={box} className="relative">
      {children}
      {geo ? (
        <svg
          aria-hidden
          width={geo.w}
          height={geo.h}
          viewBox={`0 0 ${geo.w} ${geo.h}`}
          className="pointer-events-none absolute inset-0 z-10 overflow-visible"
        >
          <defs>
            <radialGradient id="thread-glow">
              <stop offset="0" stopColor="#ffd9a0" stopOpacity=".9" />
              <stop offset="1" stopColor="#e9b872" stopOpacity="0" />
            </radialGradient>
          </defs>
          <path d={geo.d} fill="none" stroke="#c99a5b" strokeOpacity=".22" strokeWidth="1" />
          <path
            ref={draw}
            d={geo.d}
            pathLength={1}
            fill="none"
            stroke="#d6a463"
            strokeWidth="1.5"
            strokeLinecap="round"
            style={{ strokeDasharray: 1, strokeDashoffset: 1 }}
          />
          <g ref={dot} style={{ opacity: 0, transition: 'opacity .3s' }}>
            <circle r="16" fill="url(#thread-glow)" />
            <circle r="4" fill="#ffe3b8" />
          </g>
        </svg>
      ) : null}
    </div>
  );
}
