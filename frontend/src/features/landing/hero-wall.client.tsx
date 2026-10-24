'use client';

import { ArrowRight, Pause, Play } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { cn } from '@/shared/lib/cn';

export interface WallPiece {
  src: string;
  name: string;
  price?: string;
  href: string;
  /** The photo's real size, when known: the wall is shown whole at its own proportions. */
  width?: number;
  height?: number;
}

interface Labels {
  now: string;
  view: string;
  pause: string;
  play: string;
  show: string;
}

const HOLD_MS = 4500;
const SWIPE_PX = 40;

const REDUCE = '(prefers-reduced-motion: reduce)';
function subscribeMotion(onChange: () => void) {
  const media = window.matchMedia(REDUCE);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

/**
 * A gallery of walls: every piece's own photo, whole, in a row. The wall in front is in focus;
 * the next ones wait to the right, smaller and dimmer, running off the page. Every few seconds
 * the row slides to the next wall. The first photo renders on the server (the LCP image); the
 * rest mount after the page has loaded. Pauses on hover, keyboard focus, the pause button and a
 * hidden tab; never moves by itself for people who prefer reduced motion. Swipe on phones.
 */
export function HeroWall({ pieces, labels }: { pieces: WallPiece[]; labels: Labels }) {
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false);
  const still = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia(REDUCE).matches,
    () => false,
  );
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLUListElement>(null);
  const swipe = useRef<number | null>(null);
  const piece = pieces[index] ?? pieces[0];
  const running = ready && !paused && !held && !still && pieces.length > 1;

  // Mount the other walls once the page is idle after load.
  useEffect(() => {
    let timer = 0;
    const start = () => {
      timer = window.setTimeout(() => setReady(true), 900);
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
    return () => {
      window.removeEventListener('load', start);
      window.clearTimeout(timer);
    };
  }, []);

  // Slide the row so the active wall stands at the front (measured, as walls differ in width).
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const place = () => {
      const panel = el.children[index] as HTMLElement | undefined;
      el.style.transform = `translate3d(${-(panel?.offsetLeft ?? 0)}px,0,0)`;
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(el);
    return () => observer.disconnect();
  }, [index, ready]);

  // Bring the next wall forward every few seconds while running (and the tab is visible).
  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => {
      if (document.visibilityState === 'visible') setIndex((i) => (i + 1) % pieces.length);
    }, HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [running, index, pieces.length]);

  if (!piece) return null;
  const shown = ready ? pieces : pieces.slice(0, 1);
  const go = (i: number) => setIndex((i + pieces.length) % pieces.length);

  return (
    <div
      ref={root}
      className="contents"
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => {
        if (!root.current?.contains(e.relatedTarget as Node | null)) setHeld(false);
      }}
    >
      {/* The row of walls. Runs past the right edge of the page on purpose. */}
      <div
        className="gallery-clip order-1 min-w-0 touch-pan-y lg:order-2 lg:col-start-2 lg:row-span-2 lg:row-start-1"
        onPointerDown={(e) => {
          swipe.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (swipe.current === null) return;
          const dx = e.clientX - swipe.current;
          swipe.current = null;
          if (Math.abs(dx) > SWIPE_PX) go(index + (dx < 0 ? 1 : -1));
        }}
      >
        <ul
          ref={track}
          className="gallery-track flex h-[min(26rem,62svh)] items-center gap-5 sm:h-[30rem] sm:gap-7 lg:h-[min(40rem,calc(100svh-15rem))]"
        >
          {shown.map((p, i) => {
            const front = i === index;
            return (
              <li
                key={p.src}
                className={cn(
                  'gallery-wall relative h-full shrink-0 origin-left',
                  front ? 'gallery-wall-front' : 'gallery-wall-back',
                )}
                style={{ aspectRatio: p.width && p.height ? `${p.width} / ${p.height}` : '3 / 4' }}
              >
                <Link
                  href={p.href}
                  tabIndex={front ? 0 : -1}
                  aria-label={p.name}
                  onClick={(e) => {
                    if (!front) {
                      e.preventDefault();
                      go(i);
                    }
                  }}
                  className="block h-full w-full overflow-hidden bg-sand ring-1 ring-ink/10"
                >
                  <Image
                    src={p.src}
                    alt=""
                    fill
                    preload={i === 0}
                    fetchPriority={i === 0 ? 'high' : 'low'}
                    sizes="(min-width: 1024px) 28rem, (min-width: 640px) 22rem, 72vw"
                    className="object-cover"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* What hangs in front, and the hairline bars that move between walls (no numbers). */}
      <div className="order-3 w-full max-w-md lg:col-start-1 lg:row-start-2 lg:self-start">
        <div
          aria-live="polite"
          className="flex items-end justify-between gap-6 border-t border-ink/15 pt-4"
        >
          <div className="min-w-0">
            <p className="text-[0.66rem] font-medium uppercase tracking-eyebrow text-walnut [:lang(bn)_&]:text-[0.8rem] [:lang(bn)_&]:tracking-normal">
              {labels.now}
            </p>
            <p
              key={piece.src}
              className="wall-caption mt-2 truncate font-display text-2xl leading-tight sm:text-[1.75rem]"
            >
              {piece.name}
            </p>
            {piece.price ? (
              <p className="mt-1 text-sm tabular-nums text-ink/80">{piece.price}</p>
            ) : null}
          </div>
          <Link
            href={piece.href}
            className="group flex shrink-0 items-center gap-2 pb-1 text-[0.72rem] font-medium uppercase tracking-[0.16em] text-ink [:lang(bn)_&]:text-[0.9rem] [:lang(bn)_&]:normal-case [:lang(bn)_&]:tracking-normal"
          >
            <span className="link-underline">{labels.view}</span>
            <ArrowRight
              aria-hidden
              className="size-3.5 transition-transform duration-500 ease-out-soft group-hover:translate-x-1"
            />
          </Link>
        </div>
        {pieces.length > 1 ? (
          <div className="mt-3 flex items-center gap-3">
            <ul className="flex flex-1 gap-1.5">
              {pieces.map((p, i) => (
                <li key={p.src} className="flex-1">
                  <button
                    type="button"
                    aria-label={labels.show.replace('{name}', p.name)}
                    aria-current={i === index ? 'true' : undefined}
                    onClick={() => go(i)}
                    className="group block w-full py-3"
                  >
                    <span className="relative block h-px w-full overflow-hidden bg-ink/20 transition-colors group-hover:bg-ink/40">
                      {i === index ? (
                        <span
                          key={`${index}-${running}`}
                          className={cn(
                            'absolute inset-y-0 left-0 block w-full origin-left bg-walnut',
                            running ? 'wall-progress' : '',
                          )}
                          style={{ animationDuration: `${HOLD_MS}ms` }}
                        />
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setPaused((v) => !v)}
              aria-label={paused ? labels.play : labels.pause}
              className="-mr-2 grid size-9 shrink-0 place-items-center text-ink/70 transition-colors hover:text-ink"
            >
              {paused ? (
                <Play className="size-3.5" strokeWidth={1.4} />
              ) : (
                <Pause className="size-3.5" strokeWidth={1.4} />
              )}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
