'use client';

import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Fragment, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { cn } from '@/shared/lib/cn';

interface Photo {
  src: string;
  /** object-position on wide screens and on phones. */
  position: string;
  phonePosition: string;
}

interface Action {
  label: string;
  href: string;
}

export interface PanelSlide {
  kind: 'panels';
  name: string;
  left: string;
  right: string;
  top: string;
  side: string;
  main: Photo & { caption: string; href: string };
  cards: (Photo & { caption: string; href: string })[];
  primary: Action;
  secondary?: Action;
}

export interface FullSlide {
  kind: 'full';
  name: string;
  title: string;
  text: string;
  photo: Photo;
  primary: Action;
  secondary?: Action;
}

export type Slide = PanelSlide | FullSlide;

export interface SlideLabels {
  previous: string;
  next: string;
  pause: string;
  play: string;
  show: string;
}

const HOLD_MS = 7000;
const SWIPE_PX = 40;
const REDUCE = '(prefers-reduced-motion: reduce)';
function subscribeMotion(onChange: () => void) {
  const media = window.matchMedia(REDUCE);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

/**
 * Letters rise one after another out of their own line (each word is a mask, so nothing jumps).
 * Bangla rises word by word: splitting it into letters would break its joined characters.
 * Screen readers get the plain text from `label`.
 */
function Rise({ text, lang, from = 0 }: { text: string; lang: string; from?: number }) {
  let n = from;
  return (
    <>
      {text
        .split(/\s+/)
        .filter(Boolean)
        .map((word, w) => (
          <Fragment key={w}>
            {w ? ' ' : null}
            <span className="rise-word" aria-hidden>
              {lang === 'bn' ? (
                <span className="rise-ch" style={{ '--i': n++ } as React.CSSProperties}>
                  {word}
                </span>
              ) : (
                Array.from(word).map((ch, c) => (
                  <span key={c} className="rise-ch" style={{ '--i': n++ } as React.CSSProperties}>
                    {ch}
                  </span>
                ))
              )}
            </span>
          </Fragment>
        ))}
    </>
  );
}

/** A loader between the two words: eight short spokes that light up in turn. */
function Spark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className} fill="none" stroke="currentColor">
      {Array.from({ length: 8 }, (_, i) => (
        <line
          key={i}
          className="spark-spoke"
          x1="32"
          y1="8"
          x2="32"
          y2="22"
          strokeWidth="2"
          strokeLinecap="round"
          transform={`rotate(${i * 45} 32 32)`}
          style={{ '--s': i } as React.CSSProperties}
        />
      ))}
    </svg>
  );
}

function Actions({ slide, light }: { slide: Slide; light?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
      <Link
        href={slide.primary.href}
        className={cn(
          'group inline-flex h-14 items-center gap-3 px-7 text-[0.95rem] font-medium transition-colors',
          light
            ? 'bg-ivory text-espresso hover:bg-glow'
            : 'border border-ivory/60 text-ivory hover:bg-ivory hover:text-espresso',
        )}
      >
        {slide.primary.label}
        <ArrowUpRight
          aria-hidden
          className="size-4 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        />
      </Link>
      {slide.secondary ? (
        <Link
          href={slide.secondary.href}
          className="group inline-flex items-center gap-2 border-b border-ivory/40 pb-1 text-[0.95rem] text-ivory transition-colors hover:border-ivory"
        >
          {slide.secondary.label}
          <ArrowUpRight
            aria-hidden
            className="size-4 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </Link>
      ) : null}
    </div>
  );
}

/** Slide 1: the giant pair of words split around a tall photo of a lit panel. */
function Panels({
  s,
  lang,
  first,
  load,
}: {
  s: PanelSlide;
  lang: string;
  first: boolean;
  load: boolean;
}) {
  return (
    <div className="relative grid h-full grid-rows-[auto_auto_1fr] gap-6 px-5 pt-8 pb-28 md:px-10 lg:block lg:p-0">
      {/* Faint column lines, like a drawing sheet. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
        <span className="absolute inset-y-0 left-[34%] w-px bg-ivory/[0.07]" />
        <span className="absolute inset-y-0 left-[66%] w-px bg-ivory/[0.07]" />
        <span className="absolute inset-x-0 top-[52%] h-px bg-ivory/[0.07]" />
      </div>

      <p className="slide-early max-w-[22rem] text-[0.98rem] leading-snug text-ivory/80 lg:absolute lg:top-10 lg:left-10 lg:text-[1.05rem]">
        {s.top}
      </p>

      {/* The tall photo in the middle column; it opens out from a small frame in the centre. */}
      <figure className="slide-reveal relative order-3 aspect-[4/5] overflow-hidden bg-espresso lg:absolute lg:inset-y-0 lg:left-[34%] lg:aspect-auto lg:w-[32%]">
        {load ? (
          <Image
            src={s.main.src}
            alt={s.main.caption}
            fill
            preload={first}
            fetchPriority={first ? 'high' : 'low'}
            sizes="(min-width: 1024px) 32vw, 100vw"
            className="slide-zoom object-cover [object-position:var(--pos-sm)] lg:[object-position:var(--pos)]"
            style={
              { '--pos': s.main.position, '--pos-sm': s.main.phonePosition } as React.CSSProperties
            }
          />
        ) : null}
        <span
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(26,18,15,.35),transparent_30%,transparent_65%,rgba(26,18,15,.7))]"
        />
        <figcaption className="absolute inset-x-0 bottom-6 text-center lg:bottom-24">
          <Link
            href={s.main.href}
            className="text-[0.78rem] tracking-[0.22em] text-ivory/90 uppercase hover:text-ivory [:lang(bn)_&]:text-[0.9rem] [:lang(bn)_&]:tracking-normal"
          >
            {s.main.caption}
          </Link>
        </figcaption>
      </figure>

      {/* The giant words, over everything, meeting at the photo. */}
      <p
        aria-label={`${s.left} ${s.right}`}
        className="pointer-events-none relative z-10 order-2 flex items-baseline justify-between font-display text-[clamp(3.6rem,15vw,6rem)] leading-[0.9] font-normal tracking-[-0.035em] text-ivory lg:absolute lg:inset-x-10 lg:top-[27%] lg:text-[clamp(6rem,11.5vw,12.5rem)] [:lang(bn)_&]:leading-[1.15] [:lang(bn)_&]:tracking-normal"
      >
        <span className="rise">
          <Rise text={s.left} lang={lang} />
        </span>
        <Spark className="slide-spin hidden size-[3.4vw] max-h-14 max-w-14 text-ivory/90 lg:block" />
        <span className="rise">
          <Rise text={s.right} lang={lang} from={s.left.length} />
        </span>
      </p>

      {/* Two more pieces, small, bottom left. */}
      <ul className="order-4 hidden gap-[3%] lg:absolute lg:bottom-10 lg:left-10 lg:flex lg:w-[28%]">
        {s.cards.map((c, i) => (
          <li key={c.src} className="slide-card w-1/2" style={{ '--i': i } as React.CSSProperties}>
            <Link
              href={c.href}
              className="group relative block aspect-[3/4] overflow-hidden bg-espresso"
            >
              {load ? (
                <Image
                  src={c.src}
                  alt={c.caption}
                  fill
                  sizes="14vw"
                  className="object-cover transition-transform duration-[1.4s] ease-out group-hover:scale-105"
                  style={{ objectPosition: c.position }}
                />
              ) : null}
              <span
                aria-hidden
                className="absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,rgba(26,18,15,.75))]"
              />
              <span className="absolute inset-x-3 bottom-3 text-center text-[0.68rem] leading-tight tracking-[0.18em] text-ivory/85 uppercase [:lang(bn)_&]:text-[0.8rem] [:lang(bn)_&]:tracking-normal">
                {c.caption}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {/* The line and the way in, right column. */}
      <div className="slide-fade order-5 space-y-7 lg:absolute lg:top-[58%] lg:right-10 lg:w-[26%] lg:text-center">
        <p className="text-[1.05rem] leading-relaxed text-ivory/80">{s.side}</p>
        <div className="lg:flex lg:justify-center">
          <Actions slide={s} />
        </div>
      </div>
    </div>
  );
}

/** Slides 2–4: a full room, one very large headline, the words and two ways in. */
function Full({ s, lang, load }: { s: FullSlide; lang: string; load: boolean }) {
  return (
    <div className="relative flex h-full flex-col justify-end px-5 pt-[38svh] pb-28 md:px-10 lg:justify-between lg:pt-[15%] lg:pb-32">
      {load ? (
        <Image
          src={s.photo.src}
          alt=""
          fill
          sizes="100vw"
          className="slide-zoom -z-20 object-cover [object-position:var(--pos-sm)] lg:[object-position:var(--pos)]"
          style={
            { '--pos': s.photo.position, '--pos-sm': s.photo.phonePosition } as React.CSSProperties
          }
        />
      ) : null}
      <span
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(26,18,15,.55)_0%,rgba(26,18,15,.15)_35%,rgba(26,18,15,.35)_60%,rgba(26,18,15,.85)_100%)]"
      />
      <h2
        aria-label={s.title}
        className="rise font-sans text-[clamp(2.8rem,12vw,5rem)] leading-[0.92] font-semibold tracking-[-0.03em] text-ivory uppercase lg:text-center lg:text-[clamp(5rem,9.5vw,10.5rem)] [:lang(bn)_&]:font-semibold [:lang(bn)_&]:leading-[1.2] [:lang(bn)_&]:tracking-normal [:lang(bn)_&]:normal-case"
      >
        <Rise text={s.title} lang={lang} />
      </h2>
      <div className="slide-fade mt-8 max-w-xl space-y-7 lg:mt-0">
        <p className="text-[1.05rem] leading-relaxed text-ivory/90 sm:text-[1.15rem]">{s.text}</p>
        <Actions slide={s} light />
      </div>
    </div>
  );
}

/**
 * The home hero: four slides (our panels, then interior design, construction and bulk orders).
 * The first slide renders on the server with its photo preloaded (the LCP image); the other
 * slides' photos load after the page has. Changes every 7 s; pauses on hover, keyboard focus,
 * the pause button and a hidden tab, and never moves by itself for reduced motion.
 */
export function HeroSlides({
  slides,
  lang,
  labels,
  children,
}: {
  slides: Slide[];
  lang: string;
  labels: SlideLabels;
  /** The page's h1 (visually hidden: the slides carry the visible words). */
  children?: React.ReactNode;
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
  const running = ready && !paused && !held && !still && slides.length > 1;

  useEffect(() => {
    let timer = 0;
    const start = () => {
      timer = window.setTimeout(() => setReady(true), 600);
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
      if (document.visibilityState === 'visible') setIndex((i) => (i + 1) % slides.length);
    }, HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [running, index, slides.length]);

  const go = (i: number) => setIndex((i + slides.length) % slides.length);
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div
      ref={root}
      className="hero-slides relative isolate grid overflow-hidden bg-espresso text-ivory lg:h-[calc(100svh-11.5rem)] lg:min-h-[42rem] lg:max-h-[52rem]"
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
      {children}
      {slides.map((s, i) => {
        const on = i === index;
        return (
          <section
            key={s.name}
            aria-roledescription="slide"
            aria-label={`${pad(i + 1)} / ${pad(slides.length)}: ${s.name}`}
            aria-hidden={!on}
            inert={!on}
            // Every slide sits in the same grid cell, so the hero is as tall as the tallest one.
            className={cn('slide relative [grid-area:1/1]', on ? 'slide-on' : 'slide-off')}
          >
            {/* Re-keyed when it comes back, so its words rise again. */}
            <Fragment key={on ? `on-${index}` : 'off'}>
              {s.kind === 'panels' ? (
                <Panels s={s} lang={lang} first={i === 0} load={i === 0 || ready} />
              ) : (
                <Full s={s} lang={lang} load={ready} />
              )}
            </Fragment>
          </section>
        );
      })}

      {/* Where we are and the way round, in one small pill at the foot (clear of the words, the
          chat button and slide 1's tall photo caption). */}
      {slides.length > 1 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center pb-5 lg:pb-7">
          <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-ivory/15 bg-espresso/55 px-1.5 py-1 text-ivory backdrop-blur-md">
            <button
              type="button"
              aria-label={labels.previous}
              onClick={() => go(index - 1)}
              className="grid size-8 place-items-center rounded-full transition-colors hover:bg-ivory hover:text-espresso"
            >
              <ArrowLeft className="size-3.5" strokeWidth={1.5} />
            </button>
            <span className="px-1.5 text-[0.72rem] tracking-[0.16em] tabular-nums">
              {pad(index + 1)} <span className="text-ivory/50">/ {pad(slides.length)}</span>
            </span>
            <ul className="flex gap-1">
              {slides.map((s, i) => (
                <li key={s.name}>
                  <button
                    type="button"
                    aria-label={labels.show.replace('{name}', s.name)}
                    aria-current={i === index ? 'true' : undefined}
                    onClick={() => go(i)}
                    className="group block w-6 py-3"
                  >
                    <span className="relative block h-px w-full overflow-hidden bg-ivory/30 group-hover:bg-ivory/60">
                      {i === index ? (
                        <span
                          key={`${index}-${running}`}
                          className={cn(
                            'absolute inset-y-0 left-0 block w-full origin-left bg-ivory',
                            running ? 'slide-progress' : '',
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
              className="grid size-8 place-items-center rounded-full text-ivory/80 hover:text-ivory"
            >
              {paused ? (
                <Play className="size-3" strokeWidth={1.5} />
              ) : (
                <Pause className="size-3" strokeWidth={1.5} />
              )}
            </button>
            <button
              type="button"
              aria-label={labels.next}
              onClick={() => go(index + 1)}
              className="grid size-8 place-items-center rounded-full transition-colors hover:bg-ivory hover:text-espresso"
            >
              <ArrowRight className="size-3.5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
