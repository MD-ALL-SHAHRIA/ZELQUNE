'use client';

import { ArrowRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/shared/lib/cn';

export interface RoomSpot {
  slug: string;
  /** Marker position on the photo, in percent of its width / height. */
  x: number;
  y: number;
  name: string;
  price: string | null;
  href: string;
}

/**
 * The only client code of "shop the room": markers on the photo that each toggle a small card.
 * One card open at a time; Esc or a click outside closes it and returns focus to its marker.
 * On phones the card docks to the photo's foot so it never runs off the screen.
 */
export function RoomHotspots({ spots, view }: { spots: RoomSpot[]; view: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      root.current?.querySelector<HTMLButtonElement>(`[data-spot="${open}"]`)?.focus();
      setOpen(null);
    };
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  return (
    <div ref={root} className="absolute inset-0">
      {spots.map((s) => {
        const isOpen = open === s.slug;
        const cardId = `room-card-${s.slug}`;
        const right = s.x > 55;
        return (
          <div key={s.slug} className={cn('contents', isOpen && '[&>button]:z-30')}>
            <button
              type="button"
              data-spot={s.slug}
              aria-expanded={isOpen}
              aria-controls={cardId}
              aria-label={s.name}
              onClick={() => setOpen(isOpen ? null : s.slug)}
              className="group absolute z-10 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full focus-visible:outline-paper"
              style={{ left: `${s.x}%`, top: `${s.y}%` }}
            >
              <span
                aria-hidden
                className="absolute inset-1.5 rounded-full bg-ivory/40 motion-safe:animate-[room-pulse_2.8s_ease-out_infinite]"
              />
              <span
                aria-hidden
                className={cn(
                  'relative grid size-7 place-items-center rounded-full border border-ivory/80 shadow-[0_6px_20px_-6px_rgba(20,17,15,0.6)] transition-colors duration-300',
                  isOpen
                    ? 'tone-dark bg-night text-ivory'
                    : 'bg-paper text-ink group-hover:bg-glow',
                )}
              >
                <Plus
                  strokeWidth={1.5}
                  className={cn(
                    'size-3.5 transition-transform duration-300',
                    isOpen && 'rotate-45',
                  )}
                />
              </span>
            </button>
            <div
              id={cardId}
              hidden={!isOpen}
              className={cn(
                'absolute inset-x-3 bottom-3 z-20 bg-paper p-5 text-ink shadow-[0_30px_60px_-24px_rgba(20,17,15,0.55)] sm:inset-x-auto sm:bottom-auto sm:w-64 sm:-translate-y-1/2',
                right
                  ? 'sm:right-[calc(100%-var(--x)+1.75rem)]'
                  : 'sm:left-[calc(var(--x)+1.75rem)]',
                'sm:top-[var(--y)]',
              )}
              style={{ '--x': `${s.x}%`, '--y': `${s.y}%` } as React.CSSProperties}
            >
              <p className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="size-1.5 shrink-0 -translate-y-1 rounded-full bg-amber"
                />
                <span className="font-display text-2xl font-light leading-tight">{s.name}</span>
              </p>
              {s.price ? <p className="mt-1 pl-[1.125rem] text-sm text-stone">{s.price}</p> : null}
              <Link
                href={s.href}
                className="group/link mt-4 ml-7 inline-flex items-center gap-2 border-b border-ink pb-0.5 text-[0.75rem] font-medium uppercase tracking-[0.16em] [:lang(bn)_&]:text-[0.9rem]"
              >
                {view}
                <ArrowRight
                  aria-hidden
                  strokeWidth={1.25}
                  className="size-3.5 transition-transform duration-500 ease-out-soft group-hover/link:translate-x-1"
                />
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
