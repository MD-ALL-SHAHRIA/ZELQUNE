'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { type Locale } from '@/i18n/config';
import { formatNumber } from '@/i18n/format';
import { cn } from '@/shared/lib/cn';

const DESKTOP = '(min-width: 1024px) and (prefers-reduced-motion: no-preference)';
const subscribe = (fn: () => void) => {
  const mq = window.matchMedia(DESKTOP);
  mq.addEventListener('change', fn);
  return () => mq.removeEventListener('change', fn);
};

/** Each step holds still for a moment, then the ring turns to the next (0..1 -> 0..1). */
function linger(x: number): number {
  const y = Math.min(1, Math.max(0, (x - 0.3) / 0.4));
  return y * y * (3 - 2 * y);
}

/**
 * The process as an orbit (desktop): the section pins, a ring carries the numbered steps, and
 * scrolling turns the ring so the current step comes round to face its text, lit in amber with a
 * connector line. All steps stay in the document for screen readers (the current one is marked).
 * Phones and reduced motion get `fallback`, the plain timeline.
 */
export function OrbitProcess({
  lang,
  steps,
  header,
  fallback,
}: {
  lang: Locale;
  steps: { title: string; text: string }[];
  header: React.ReactNode;
  fallback: React.ReactNode;
}) {
  const desktop = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP).matches,
    () => false,
  );
  const outer = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const orbit = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const n = steps.length;

  useEffect(() => {
    const el = outer.current;
    const box = stage.current;
    const ring = orbit.current;
    if (!desktop || !el || !box || !ring) return;
    let frame = 0;
    const header = document.querySelector<HTMLElement>('.site-header')?.offsetHeight ?? 0;
    box.style.top = `${header}px`;
    box.style.height = `calc(100svh - ${header}px)`;
    el.style.height = `calc(100svh - ${header}px + ${(n - 1) * 70}svh)`;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const travel = el.offsetHeight - box.offsetHeight;
        const p = Math.min(1, Math.max(0, -el.getBoundingClientRect().top / Math.max(travel, 1)));
        const s = p * (n - 1);
        const t = Math.min(n - 1, Math.floor(s) + linger(s - Math.floor(s)));
        ring.style.setProperty('--t', String(t));
        setActive(Math.round(t));
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      el.style.height = '';
    };
  }, [desktop, n]);

  if (!desktop) return <>{fallback}</>;

  const num = (i: number) => formatNumber(i + 1, lang);
  return (
    <div ref={outer} className="relative">
      <div ref={stage} className="sticky flex items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-[1440px] grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-center gap-10 px-10">
          <div className="space-y-12">
            {header}
            <ol className="relative min-h-[15rem]">
              {steps.map((step, i) => (
                <li
                  key={step.title}
                  aria-current={i === active ? 'step' : undefined}
                  className={cn(
                    'absolute inset-x-0 top-0 space-y-4 transition-[opacity,translate] duration-700 ease-out-soft',
                    i === active
                      ? 'translate-y-0 opacity-100'
                      : cn(
                          'pointer-events-none opacity-0',
                          i < active ? '-translate-y-4' : 'translate-y-4',
                        ),
                  )}
                >
                  <p className="font-mono text-sm tracking-[0.2em] text-amber">
                    {num(i)} / {num(n - 1)}
                  </p>
                  <p className="font-display text-[clamp(2.2rem,1.6rem+2vw,3.4rem)] font-medium leading-[1.05]">
                    {step.title}
                  </p>
                  <p className="max-w-md text-lg leading-relaxed text-ivory/75">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>

          <div
            ref={orbit}
            aria-hidden
            className="orbit relative mx-auto aspect-square w-[min(68svh,560px)]"
            style={{ '--n': n, '--t': 0 } as React.CSSProperties}
          >
            {/* The ring, a softer inner ring, and a warm glow where the current step arrives. */}
            <span className="absolute inset-0 rounded-full border border-ivory/20" />
            <span className="absolute inset-[18%] rounded-full border border-ivory/[0.07]" />
            <span className="absolute top-1/2 left-0 size-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber/25 blur-3xl" />
            {/* Connector from the arrival point toward the text. */}
            <span className="absolute top-1/2 right-full h-px w-16 bg-[linear-gradient(90deg,transparent,var(--color-amber))]" />
            <span className="absolute inset-0 grid place-items-center">
              <span className="font-display text-[clamp(5rem,4rem+4vw,9rem)] leading-none text-ivory/[0.08]">
                {num(active)}
              </span>
            </span>
            {steps.map((step, i) => (
              <span
                key={step.title}
                className="orbit-badge absolute top-1/2 left-1/2"
                style={{ '--i': i } as React.CSSProperties}
              >
                <span
                  className={cn(
                    'grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border font-mono transition-[width,height,background-color,color,border-color] duration-500 ease-out-soft',
                    i === active
                      ? 'size-16 border-amber bg-amber text-lg text-night'
                      : 'size-11 border-ivory/35 bg-night text-sm text-ivory/70',
                  )}
                >
                  {num(i)}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
