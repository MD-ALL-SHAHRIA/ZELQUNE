'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/shared/lib/cn';

const DESKTOP = '(min-width: 1024px) and (prefers-reduced-motion: no-preference)';

/**
 * Pinned horizontal scroll (desktop): the section holds still under the header while its
 * `[data-track]` row slides sideways with the page scroll, then lets go. Phones, small rows and
 * reduced motion keep the plain swipeable row. Transforms only, so nothing reflows.
 */
export function PinnedTrack({ children }: { children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const el = outer.current;
    const box = stage.current;
    const track = el?.querySelector<HTMLElement>('[data-track]');
    if (!el || !box || !track) return;
    const mq = window.matchMedia(DESKTOP);
    let distance = 0;
    let frame = 0;

    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!distance) return;
        const travel = el.offsetHeight - box.offsetHeight;
        const p = Math.min(1, Math.max(0, -el.getBoundingClientRect().top / Math.max(travel, 1)));
        track.style.translate = `${-p * distance}px 0`;
      });
    };
    const measure = () => {
      track.style.translate = '';
      const over = track.scrollWidth - track.clientWidth;
      const on = mq.matches && over > 40;
      setPinned(on);
      distance = on ? over : 0;
      const header = document.querySelector<HTMLElement>('.site-header')?.offsetHeight ?? 0;
      box.style.top = on ? `${header}px` : '';
      box.style.height = on ? `calc(100svh - ${header}px)` : '';
      el.style.height = on ? `calc(100svh - ${header}px + ${over}px)` : '';
      update();
    };

    // Keyboard: tabbing to a card that is off to the side scrolls the page until it is in view.
    const onFocus = (e: FocusEvent) => {
      if (!distance || !(e.target instanceof HTMLElement)) return;
      const item = e.target.closest<HTMLElement>('[data-track] > *');
      if (!item) return;
      const p = Math.min(1, Math.max(0, (item.offsetLeft - 40) / distance));
      const travel = el.offsetHeight - box.offsetHeight;
      const top = window.scrollY + el.getBoundingClientRect().top + p * travel;
      window.scrollTo({ top, behavior: 'instant' });
    };

    measure();
    el.addEventListener('focusin', onFocus);
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', measure);
    mq.addEventListener('change', measure);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('focusin', onFocus);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', measure);
      mq.removeEventListener('change', measure);
      track.style.translate = '';
    };
  }, []);

  return (
    <div ref={outer} data-pinned={pinned || undefined} className="group/pin relative">
      <div
        ref={stage}
        className={cn(pinned && 'sticky flex flex-col justify-center overflow-hidden')}
      >
        {children}
      </div>
    </div>
  );
}
