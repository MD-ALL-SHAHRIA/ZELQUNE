'use client';

import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { cn } from '@/shared/lib/cn';

export interface Scene {
  src: string;
  position: string;
  name: string;
  price?: string;
  href: string;
}

interface Labels {
  now: string;
  view: string;
  pause: string;
  play: string;
  show: string;
  previous: string;
  next: string;
}

const HOLD_MS = 6000;
const SWIPE_PX = 40;

const REDUCE = '(prefers-reduced-motion: reduce)';
function subscribeMotion(onChange: () => void) {
  const media = window.matchMedia(REDUCE);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

/**
 * Full-bleed room scenes, each with one of our pieces lit on the wall, cross-fading with a slow
 * drift. The first scene renders on the server (the LCP image); the rest mount after the page
 * has loaded. Pauses on hover, keyboard focus, the pause button and a hidden tab; never moves by
 * itself for people who prefer reduced motion. Arrows on larger screens, swipe on phones.
 */
export function HeroScenes({
  scenes,
  labels,
  children,
}: {
  scenes: Scene[];
  labels: Labels;
  /** The words, laid over the scenes. */
  children: React.ReactNode;
}) {
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
  const swipe = useRef<number | null>(null);
  const scene = scenes[index] ?? scenes[0];
  const running = ready && !paused && !held && !still && scenes.length > 1;

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

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => {
      if (document.visibilityState === 'visible') setIndex((i) => (i + 1) % scenes.length);
    }, HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [running, index, scenes.length]);

  if (!scene) return null;
  const shown = ready ? scenes : scenes.slice(0, 1);
  const go = (i: number) => setIndex((i + scenes.length) % scenes.length);

  return (
    <div
      ref={root}
      className="relative isolate flex flex-col justify-end overflow-hidden bg-espresso pt-[46svh] text-ivory lg:h-[calc(100svh-11.5rem)] lg:min-h-[34rem] lg:max-h-[47.5rem] lg:justify-center lg:pt-0"
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => {
        if (!root.current?.contains(e.relatedTarget as Node | null)) setHeld(false);
      }}
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
      {shown.map((s, i) => (
        <div
          key={s.src}
          aria-hidden
          className={cn(
            'scene absolute inset-x-0 top-0 -z-20 h-[58svh] overflow-hidden lg:inset-0 lg:h-auto',
            i === index ? 'scene-on' : 'scene-off',
          )}
        >
          <Image
            src={s.src}
            alt=""
            fill
            preload={i === 0}
            fetchPriority={i === 0 ? 'high' : 'low'}
            sizes="100vw"
            className="scene-drift object-cover"
            style={{ objectPosition: s.position }}
          />
        </div>
      ))}
      {/* Warm shade under the words: from the left on wide screens, from the foot on phones. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-[58svh] bg-[linear-gradient(180deg,rgba(43,30,25,0)_45%,rgba(43,30,25,0.75)_80%,#3b2922_100%)] lg:inset-0 lg:h-auto lg:bg-[linear-gradient(90deg,rgba(43,30,25,0.78)_0%,rgba(43,30,25,0.5)_32%,rgba(43,30,25,0)_58%),linear-gradient(0deg,rgba(43,30,25,0.45)_0%,rgba(43,30,25,0)_30%)]"
      />

      {children}

      {/* Foot of the hero: bars + pause (left); what hangs now + arrows (right). */}
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-5 pb-6 md:px-10 lg:absolute lg:inset-x-0 lg:bottom-0 lg:flex-row lg:items-end lg:justify-between lg:pb-9">
        {scenes.length > 1 ? (
          <div className="flex w-full max-w-[16rem] items-center gap-3">
            <ul className="flex flex-1 gap-1.5">
              {scenes.map((s, i) => (
                <li key={s.src} className="flex-1">
                  <button
                    type="button"
                    aria-label={labels.show.replace('{name}', s.name)}
                    aria-current={i === index ? 'true' : undefined}
                    onClick={() => go(i)}
                    className="group block w-full py-3"
                  >
                    <span className="relative block h-px w-full overflow-hidden bg-ivory/35 transition-colors group-hover:bg-ivory/60">
                      {i === index ? (
                        <span
                          key={`${index}-${running}`}
                          className={cn(
                            'absolute inset-y-0 left-0 block w-full origin-left bg-ivory',
                            running ? 'scene-progress' : '',
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
              className="grid size-9 shrink-0 place-items-center text-ivory/80 transition-colors hover:text-ivory"
            >
              {paused ? (
                <Play className="size-3.5" strokeWidth={1.4} />
              ) : (
                <Pause className="size-3.5" strokeWidth={1.4} />
              )}
            </button>
          </div>
        ) : null}

        <div className="flex items-end justify-between gap-6 lg:justify-end">
          <div aria-live="polite" className="min-w-0 lg:text-right">
            <p className="text-[0.62rem] font-medium uppercase tracking-eyebrow text-ivory/75 [:lang(bn)_&]:text-[0.78rem] [:lang(bn)_&]:tracking-normal">
              {labels.now}
            </p>
            <p
              key={scene.src}
              className="scene-caption mt-1.5 truncate font-display text-xl leading-tight sm:text-2xl"
            >
              {scene.name}
            </p>
            <p className="mt-1 flex items-center gap-3 text-[0.8rem] text-ivory/85 lg:justify-end">
              {scene.price ? <span className="tabular-nums">{scene.price}</span> : null}
              <Link
                href={scene.href}
                className="group inline-flex items-center gap-1.5 font-medium uppercase tracking-[0.16em] text-ivory [:lang(bn)_&]:normal-case [:lang(bn)_&]:tracking-normal"
              >
                <span className="link-underline text-[0.68rem] [:lang(bn)_&]:text-[0.85rem]">
                  {labels.view}
                </span>
                <ArrowRight
                  aria-hidden
                  className="size-3 transition-transform duration-500 ease-out-soft group-hover:translate-x-1"
                />
              </Link>
            </p>
          </div>
          {scenes.length > 1 ? (
            <div className="hidden gap-2 sm:flex">
              <button
                type="button"
                aria-label={labels.previous}
                onClick={() => go(index - 1)}
                className="grid size-11 place-items-center border border-ivory/60 text-ivory transition-colors hover:bg-ivory hover:text-espresso"
              >
                <ChevronLeft className="size-4" strokeWidth={1.3} />
              </button>
              <button
                type="button"
                aria-label={labels.next}
                onClick={() => go(index + 1)}
                className="grid size-11 place-items-center border border-ivory/60 text-ivory transition-colors hover:bg-ivory hover:text-espresso"
              >
                <ChevronRight className="size-4" strokeWidth={1.3} />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
