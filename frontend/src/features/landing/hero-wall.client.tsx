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
  /** The photo's own wall tone; the hero wall glides to it while this piece hangs. */
  wall?: string;
}

interface Labels {
  now: string;
  view: string;
  pause: string;
  play: string;
  show: string;
}

const HOLD_MS = 4500;

const REDUCE = '(prefers-reduced-motion: reduce)';
function subscribeMotion(onChange: () => void) {
  const media = window.matchMedia(REDUCE);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

/**
 * "The Wall": one plaster wall in the hero where each piece is hung in turn. The first piece
 * renders on the server (the LCP image); the rest mount after the page has loaded, so they never
 * compete with it. Pauses on hover, on keyboard focus, with the pause button and while the tab
 * is hidden; never plays by itself for people who prefer reduced motion.
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
  const piece = pieces[index] ?? pieces[0];
  const running = ready && !paused && !held && !still && pieces.length > 1;

  // Mount the other pieces once the page is idle after load.
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

  // Hang the next piece every few seconds while running (and the tab is visible).
  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => {
      if (document.visibilityState === 'visible') setIndex((i) => (i + 1) % pieces.length);
    }, HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [running, index, pieces.length]);

  if (!piece) return null;
  const shown = ready ? pieces : pieces.slice(0, 1);

  return (
    <div
      ref={root}
      className="hero-wall contents"
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => {
        if (!root.current?.contains(e.relatedTarget as Node | null)) setHeld(false);
      }}
      style={{ '--piece-wall': piece.wall ?? 'var(--wall-base)' } as React.CSSProperties}
    >
      {/* The wall takes on the tone of the piece hanging on it (faded towards the words). */}
      <div aria-hidden className="wall-tint absolute inset-x-0 top-0 bottom-1/2 -z-20 lg:bottom-0 lg:left-[36%]" />
      {/* The piece on the wall, with its lamp glow; each photo's own wall melts into ours. */}
      <div className="relative order-1 mx-auto aspect-[3/4] w-full max-w-[19rem] sm:max-w-[24rem] lg:order-2 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-[min(44rem,calc(100svh-14rem))] lg:w-auto lg:max-w-none">
        <div
          aria-hidden
          key={`glow-${index}`}
          className="wall-glow absolute -inset-[16%] -z-10 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-glow)_55%,transparent),transparent)]"
        />
        {shown.map((p, i) => (
          <div
            key={p.src}
            aria-hidden={i !== index}
            className={cn(
              'wall-piece absolute inset-0',
              i === index ? 'wall-piece-on' : 'wall-piece-off',
            )}
          >
            <Image
              src={p.src}
              alt={i === index ? p.name : ''}
              fill
              preload={i === 0}
              fetchPriority={i === 0 ? 'high' : 'low'}
              sizes="(min-width: 1024px) 34rem, (min-width: 640px) 24rem, 19rem"
              className="wall-feather object-cover"
            />
          </div>
        ))}
      </div>

      {/* What hangs now, and the hairline bars that move between pieces (no numbers). */}
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
                    onClick={() => setIndex(i)}
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
