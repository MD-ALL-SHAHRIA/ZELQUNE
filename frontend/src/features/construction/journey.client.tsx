'use client';

import { ArrowDown } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { cn } from '@/shared/lib/cn';
import { BuildingScene } from './building-scene';

interface Film {
  src: string;
  poster?: string;
}

export interface Chapter {
  title: string;
  text: string;
  image: string;
  /** Where the words sit over the scene. */
  side: 'left' | 'right';
}

const REDUCE = '(prefers-reduced-motion: reduce)';
function subscribeMotion(onChange: () => void) {
  const media = window.matchMedia(REDUCE);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
/** "03" (or "০৩" on Bangla pages). */
const two = (n: number, lang: string) => {
  const t = String(n).padStart(2, '0');
  return lang === 'bn' ? t.replace(/\d/g, (d) => BN_DIGITS[Number(d)]!) : t;
};

/** The site's theme (night when the visitor chose it), kept in step with the toggle. */
function subscribeTheme(onChange: () => void) {
  const watch = new MutationObserver(onChange);
  watch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => watch.disconnect();
}

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/** Viewport heights of scrolling per chapter. */
const VH_PER_CHAPTER = 110;
/** How quickly the picture catches up with the scroll (lower = silkier). */
const EASE = 0.085;

/**
 * "From land to living": a scroll-driven camera journey through the build. The stage stays on
 * screen while the page scrolls; each chapter's scene slowly pushes in and dissolves into the
 * next, and its words rise and fade as it passes. With a fly-through `video`, scrolling plays
 * the film instead (frames follow the scroll, both ways). Progress eases toward the scroll
 * position every frame, so it glides without taking over the scroll itself. For reduced motion
 * the chapters are simply stacked.
 */
export function ConstructionJourney({
  intro,
  chapters,
  room,
  video,
  labels,
  lang,
}: {
  /** The page's opening words (the h1) over the first scene. */
  intro: { eyebrow: string; title: string; text: string; button: string; image: string };
  chapters: Chapter[];
  /** The room inside the building the camera flies into (Interiors and Handover). */
  room: string;
  /** A fly-through film per theme: bright and clean by day, warm and moody by night. */
  video?: { day: Film; night: Film };
  labels: { stage: string; scroll: string; section: string; approved: string };
  /** Bangla pages count in Bangla digits. */
  lang: string;
}) {
  const still = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia(REDUCE).matches,
    () => false,
  );
  const root = useRef<HTMLElement>(null);
  const words = useRef<(HTMLDivElement | null)[]>([]);
  const rail = useRef<HTMLSpanElement>(null);
  const film = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(0);
  const dark = useSyncExternalStore(
    subscribeTheme,
    () => document.documentElement.dataset.theme === 'dark',
    () => false,
  );
  const reel = video ? (dark ? video.night : video.day) : undefined;
  const total = chapters.length + 1; // the intro is chapter 0

  useEffect(() => {
    if (still) return;
    const el = root.current;
    if (!el) return;
    let target = 0;
    let current = 0;
    let frame = 0;
    let shown = -1;
    let pending: number | null = null;
    const v = film.current;
    const onSeeked = () => {
      if (v && pending !== null) {
        v.currentTime = pending;
        pending = null;
      }
    };
    // Show the right frame as soon as the film can play (and again after a source swap).
    const onReady = () => paint(current);
    // iPhones draw no frames from a paused film until it has played once.
    let warmed = false;
    const warm = () => {
      if (warmed || !v) return;
      warmed = true;
      void v
        .play()
        .then(() => v.pause())
        .catch(() => undefined);
    };
    v?.addEventListener('seeked', onSeeked);
    v?.addEventListener('loadeddata', onReady);
    window.addEventListener('touchstart', warm, { once: true, passive: true });

    const measure = () => {
      const r = el.getBoundingClientRect();
      const run = el.offsetHeight - window.innerHeight;
      target = run > 0 ? clamp(-r.top / run) : 0;
    };

    const paint = (p: number) => {
      const t = p * total; // 0 … total
      const i = Math.min(total - 1, Math.floor(t));
      // One building, drawn as it is made (BuildingScene reads these from the stage).
      el.style.setProperty('--p', p.toFixed(4));
      el.style.setProperty('--z', smooth(0.72, 0.84, p).toFixed(4));
      el.style.setProperty('--room', smooth(0.8, 0.86, p).toFixed(4));
      words.current.forEach((w, k) => {
        if (!w) return;
        const local = t - k;
        const o =
          k === 0
            ? 1 - smooth(0.55, 0.85, local)
            : smooth(0.08, 0.3, local) * (1 - smooth(0.72, 0.92, local));
        w.style.opacity = String(o);
        w.style.transform = `translate3d(0, ${(1 - o) * 28}px, 0)`;
      });
      if (rail.current) rail.current.style.transform = `scaleY(${p})`;
      const v = film.current;
      if (v && v.duration) {
        // One seek at a time: a seek sent while another is running piles up and freezes.
        const want = p * (v.duration - 0.05);
        if (v.seeking) pending = want;
        else if (Math.abs(v.currentTime - want) > 0.01) v.currentTime = want;
      }
      if (i !== shown) {
        shown = i;
        setActive(i);
      }
    };

    const tick = () => {
      current += (target - current) * EASE;
      if (Math.abs(target - current) < 0.0004) current = target;
      paint(current);
      frame = current === target ? 0 : requestAnimationFrame(tick);
    };
    const onScroll = () => {
      measure();
      if (!frame) frame = requestAnimationFrame(tick);
    };

    measure();
    current = target;
    paint(current);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      v?.removeEventListener('seeked', onSeeked);
      v?.removeEventListener('loadeddata', onReady);
      window.removeEventListener('touchstart', warm);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [still, total]);

  // The stage sits just under the sticky site header (its height changes with the screen).
  useEffect(() => {
    const el = root.current;
    const header = document.querySelector<HTMLElement>('.site-header');
    if (!el || !header) return;
    const set = () => el.style.setProperty('--hdr', `${header.offsetHeight}px`);
    set();
    const watch = new ResizeObserver(set);
    watch.observe(header);
    return () => watch.disconnect();
  }, [still]);

  // Play from the stream straight away; once the whole film is in memory (smooth seeking both
  // ways), swap to it at the same frame.
  useEffect(() => {
    const v = film.current;
    if (!reel || !v || still) return;
    let url = '';
    let alive = true;
    v.src = reel.src;
    void fetch(reel.src)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then((b) => {
        if (!alive) return;
        url = URL.createObjectURL(b);
        const at = v.currentTime;
        v.src = url;
        v.addEventListener('loadedmetadata', () => (v.currentTime = at), { once: true });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [reel, still]);

  if (still) {
    return (
      <section aria-label={labels.section} className="tone-dark bg-night text-ivory">
        <IntroWords intro={intro} />
        {chapters.map((c, i) => (
          <div
            key={c.title}
            className="relative isolate flex min-h-[80svh] items-end overflow-hidden px-5 py-16 md:px-10"
          >
            <Image src={c.image} alt="" fill sizes="100vw" className="-z-10 object-cover" />
            <span
              aria-hidden
              className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(26,18,15,.2),rgba(26,18,15,.8))]"
            />
            <ChapterWords
              c={c}
              n={i + 1}
              total={chapters.length}
              stage={labels.stage}
              lang={lang}
            />
          </div>
        ))}
      </section>
    );
  }

  return (
    <section
      ref={root}
      aria-label={labels.section}
      className="tone-dark relative bg-night text-ivory"
      style={{ height: `${total * VH_PER_CHAPTER}svh` }}
    >
      <div
        className="sticky overflow-hidden"
        style={{ top: 'var(--hdr, 0px)', height: 'calc(100svh - var(--hdr, 0px))' }}
      >
        {/* The scenes (or the film), full screen. */}
        {video ? (
          <video
            ref={film}
            muted
            playsInline
            preload="auto"
            poster={reel?.poster}
            className="absolute inset-0 h-full w-full object-cover"
            aria-hidden
          />
        ) : (
          <>
            <BuildingScene approved={labels.approved} />
            {/* Inside that building: the room the camera flies into, with our panel on the wall. */}
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                opacity: 'var(--room, 0)',
                transform: 'scale(calc(1.18 - 0.18 * var(--room, 0)))',
              }}
            >
              <Image
                src={room}
                alt=""
                fill
                sizes="100vw"
                className="object-cover object-[70%_50%]"
              />
            </div>
          </>
        )}
        {/* Shade under the words, which sit at the top. */}
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0',
            dark || !video
              ? 'bg-[linear-gradient(180deg,rgba(20,13,10,.85)_0%,rgba(20,13,10,.45)_26%,transparent_46%)]'
              : 'bg-[linear-gradient(180deg,rgba(40,26,18,.62)_0%,rgba(40,26,18,.28)_26%,transparent_44%)]',
          )}
        />
        {/* Shade for the words, top and bottom; a soft vignette. */}
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0',
            dark || !video
              ? 'bg-[linear-gradient(180deg,rgba(26,18,15,.55)_0%,rgba(26,18,15,0)_30%,rgba(26,18,15,0)_55%,rgba(26,18,15,.7)_100%),radial-gradient(130%_100%_at_50%_45%,transparent_55%,rgba(18,12,10,.5))]'
              : 'bg-[linear-gradient(180deg,transparent_60%,rgba(40,26,18,.45)_100%)]',
          )}
        />

        {/* Chapter 0: the page's own opening words. */}
        <div
          ref={(n) => {
            words.current[0] = n;
          }}
          className="absolute inset-x-0 top-[7%] px-5 md:px-10"
        >
          <IntroWords intro={intro} />
        </div>
        {chapters.map((c, i) => (
          <div
            key={c.title}
            ref={(n) => {
              words.current[i + 1] = n;
            }}
            style={{ opacity: 0 }}
            className={cn(
              'pointer-events-none absolute inset-x-0 top-[7%] px-5 md:px-10',
              c.side === 'right' && 'flex justify-end text-right',
            )}
          >
            <ChapterWords
              c={c}
              n={i + 1}
              total={chapters.length}
              stage={labels.stage}
              lang={lang}
            />
          </div>
        ))}

        {/* Where we are: the stage chip (bottom left) and a thin progress rail (right). */}
        <div className="absolute bottom-6 left-5 md:bottom-8 md:left-10">
          <div
            aria-live="polite"
            className="flex items-center gap-3 rounded-md border border-ivory/15 bg-espresso/45 py-2 pr-4 pl-3 backdrop-blur-md"
          >
            <span aria-hidden className="h-7 w-px bg-glow" />
            <span className="leading-tight">
              <span className="block text-[0.9rem] text-ivory">
                {active === 0 ? intro.eyebrow : chapters[active - 1]?.title}
              </span>
              <span className="block text-[0.7rem] tracking-[0.14em] text-ivory/60 uppercase tabular-nums [:lang(bn)_&]:tracking-normal [:lang(bn)_&]:normal-case">
                {active === 0
                  ? labels.scroll
                  : labels.stage
                      .replace('{n}', two(active, lang))
                      .replace('{total}', two(chapters.length, lang))}
              </span>
            </span>
          </div>
        </div>
        <div
          aria-hidden
          className="absolute top-1/2 right-5 hidden h-[38svh] -translate-y-1/2 md:block md:right-8"
        >
          <span className="absolute inset-0 w-px bg-ivory/20" />
          <span
            ref={rail}
            className="absolute inset-0 w-px origin-top bg-glow"
            style={{ transform: 'scaleY(0)' }}
          />
        </div>
        <div
          aria-hidden
          className={cn(
            'absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[0.7rem] tracking-[0.24em] text-ivory/70 uppercase transition-opacity duration-500 md:flex [:lang(bn)_&]:tracking-normal [:lang(bn)_&]:normal-case',
            active === 0 ? 'opacity-100' : 'opacity-0',
          )}
        >
          {labels.scroll}
          <ArrowDown className="size-4 animate-bounce" strokeWidth={1.3} />
        </div>
      </div>
    </section>
  );
}

function IntroWords({
  intro,
}: {
  intro: { eyebrow: string; title: string; text: string; button: string };
}) {
  return (
    <div className="max-w-3xl space-y-6">
      <p className="flex items-center gap-4 text-[0.75rem] tracking-[0.24em] text-ivory/80 uppercase [:lang(bn)_&]:text-[0.9rem] [:lang(bn)_&]:tracking-normal">
        <span aria-hidden className="h-px w-10 bg-glow" />
        {intro.eyebrow}
      </p>
      <h1 className="font-display text-[clamp(2.8rem,7vw,6.2rem)] leading-[0.98] font-normal tracking-[-0.02em] text-balance [:lang(bn)_&]:leading-[1.2] [:lang(bn)_&]:tracking-normal">
        {intro.title}
      </h1>
      <p className="max-w-xl text-[1.05rem] leading-relaxed text-ivory/85 sm:text-lg">
        {intro.text}
      </p>
      <a
        href="#start"
        className="inline-flex h-13 items-center gap-3 bg-ivory px-7 text-[0.95rem] text-espresso transition-colors hover:bg-glow"
      >
        {intro.button}
        <span aria-hidden>↓</span>
      </a>
    </div>
  );
}

function ChapterWords({
  c,
  n,
  total,
  stage,
  lang,
}: {
  c: Chapter;
  n: number;
  total: number;
  stage: string;
  lang: string;
}) {
  return (
    <div className="max-w-xl space-y-5">
      <p className="text-[0.72rem] tracking-[0.24em] text-glow uppercase tabular-nums [:lang(bn)_&]:text-[0.85rem] [:lang(bn)_&]:tracking-normal">
        {stage.replace('{n}', two(n, lang)).replace('{total}', two(total, lang))}
      </p>
      <h2 className="font-display text-[clamp(2.6rem,6.2vw,5.6rem)] leading-[1] font-normal tracking-[-0.02em] [:lang(bn)_&]:leading-[1.2] [:lang(bn)_&]:tracking-normal">
        {c.title}
      </h2>
      <p className="text-[1.05rem] leading-relaxed text-ivory/85 sm:text-lg">{c.text}</p>
    </div>
  );
}
