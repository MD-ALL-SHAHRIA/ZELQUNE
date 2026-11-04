'use client';

import { isSlowNetwork, subscribeNetwork } from '@/shared/lib/network';
import { ArrowDown } from 'lucide-react';
import Image from 'next/image';
import { type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { cn } from '@/shared/lib/cn';

export interface Chapter {
  title: string;
  text: string;
  /** A still of this chapter's shot (reduced motion, slow networks, before the film loads). */
  still: string;
}

export interface Film {
  /** Full HD, for larger screens. */
  src: string;
  /** A lighter 720p cut for phones. */
  small: string;
  poster: string;
  /** Seconds of film per chapter (the last chapter may run a little longer). */
  chapterSeconds: number;
}

const REDUCE = '(prefers-reduced-motion: reduce)';
function subscribeMotion(onChange: () => void) {
  const media = window.matchMedia(REDUCE);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
const digits = (n: number, lang: string) =>
  lang === 'bn' ? String(n).replace(/\d/g, (d) => BN_DIGITS[Number(d)]!) : String(n);

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/** Viewport heights of scrolling per chapter. */
const VH_PER_CHAPTER = 105;
/** How quickly the film catches up with the scroll (lower = heavier camera). */
const EASE = 0.08;

/**
 * "Step inside": a real house, filmed. The page opens on the building; scrolling walks up to it,
 * through the glass into the living room and on through the dining room, kitchen, bedroom and
 * bath. The film follows the scroll both ways (the stage stays put while the page scrolls), and
 * each room's words rise as it arrives. The room list jumps to a room. Reduced motion and data
 * saver get one still per chapter instead of the film.
 */
export function DesignJourney({
  intro,
  arrive,
  rooms,
  film,
  labels,
  lang,
}: {
  /** The page's opening words (the h1) over the building. */
  intro: { content: ReactNode; still: string };
  /** Walking up to the house. */
  arrive: Chapter;
  /** The rooms, in the film's order. */
  rooms: Chapter[];
  film: Film;
  labels: { scroll: string; section: string; room: string; rooms: string };
  lang: string;
}) {
  const reduced = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia(REDUCE).matches,
    () => false,
  );
  const slow = useSyncExternalStore(subscribeNetwork, isSlowNetwork, () => false);
  const still = reduced || slow;
  const root = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const words = useRef<(HTMLDivElement | null)[]>([]);
  const rail = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(0);
  const [pct, setPct] = useState<number | null>(null);
  const chapters = [arrive, ...rooms];
  const total = chapters.length + 1; // the intro is chapter 0

  useEffect(() => {
    if (still) return;
    const el = root.current;
    const v = video.current;
    if (!el || !v) return;
    let target = 0;
    let current = 0;
    let frame = 0;
    let shown = -1;
    let pending: number | null = null;
    const onSeeked = () => {
      if (pending !== null) {
        v.currentTime = pending;
        pending = null;
      }
    };
    const onReady = () => paint(current);
    // iPhones draw no frames from a paused film until it has played once.
    let warmed = false;
    const warm = () => {
      if (warmed) return;
      warmed = true;
      void v
        .play()
        .then(() => v.pause())
        .catch(() => undefined);
    };
    v.addEventListener('seeked', onSeeked);
    v.addEventListener('loadeddata', onReady);
    window.addEventListener('touchstart', warm, { once: true, passive: true });

    const measure = () => {
      const r = el.getBoundingClientRect();
      const run = el.offsetHeight - window.innerHeight;
      target = run > 0 ? clamp(-r.top / run) : 0;
    };

    const paint = (p: number) => {
      // Film time drives everything, so the words always match the shot on screen.
      const length = film.chapterSeconds * total + 0.8;
      const time = p * length;
      const t = time / film.chapterSeconds; // 0 … total
      const i = Math.min(total - 1, Math.floor(t));
      words.current.forEach((w, k) => {
        if (!w) return;
        const local = t - k;
        const o =
          k === 0
            ? 1 - smooth(0.45, 0.8, local)
            : smooth(0.12, 0.34, local) * (k === total - 1 ? 1 : 1 - smooth(0.78, 0.96, local));
        w.style.opacity = String(o);
        w.style.transform = `translate3d(0, ${((1 - o) * 32).toFixed(1)}px, 0)`;
        w.style.visibility = o < 0.01 ? 'hidden' : 'visible';
      });
      if (rail.current) rail.current.style.transform = `scaleY(${p})`;
      el.style.setProperty('--p', p.toFixed(4));
      if (v.duration) {
        // One seek at a time: a seek sent while another is running piles up and freezes.
        const want = Math.min(v.duration - 0.05, (time / length) * v.duration);
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
      if (Math.abs(target - current) < 0.0003) current = target;
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
      v.removeEventListener('seeked', onSeeked);
      v.removeEventListener('loadeddata', onReady);
      window.removeEventListener('touchstart', warm);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [still, total, film.chapterSeconds]);

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
  // ways), swap to it at the same frame. Phones get the 720p cut.
  useEffect(() => {
    const v = video.current;
    if (!v || still) return;
    const src = window.matchMedia('(min-width: 900px)').matches ? film.src : film.small;
    const ctrl = new AbortController();
    let url = '';
    v.src = src;
    setPct(0);
    void fetch(src, { signal: ctrl.signal })
      .then(async (r) => {
        if (!r.ok || !r.body) throw new Error(String(r.status));
        const size = Number(r.headers.get('content-length')) || 0;
        const reader = r.body.getReader();
        const parts: BlobPart[] = [];
        let got = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          parts.push(value);
          got += value.length;
          if (size) setPct(Math.min(99, Math.round((got / size) * 100)));
        }
        return new Blob(parts, { type: 'video/mp4' });
      })
      .then((b) => {
        setPct(null);
        url = URL.createObjectURL(b);
        const at = v.currentTime;
        v.src = url;
        v.addEventListener('loadedmetadata', () => (v.currentTime = at), { once: true });
      })
      .catch(() => setPct(null));
    return () => {
      ctrl.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [still, film.src, film.small]);

  /** Scroll to the moment a chapter's words are fully in. */
  const go = (k: number) => {
    const el = root.current;
    if (!el) return;
    const run = el.offsetHeight - window.innerHeight;
    const length = film.chapterSeconds * total + 0.8;
    const p = ((k + 0.45) * film.chapterSeconds) / length;
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + p * run, behavior: 'smooth' });
  };

  if (still) {
    return (
      <section aria-label={labels.section} className="tone-dark bg-night text-ivory">
        <div className="relative isolate flex min-h-[92svh] items-end px-5 pt-32 pb-16 sm:px-10">
          <Image
            src={intro.still}
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-10 object-cover"
          />
          <span aria-hidden className="absolute inset-0 -z-10 bg-night/55" />
          {intro.content}
        </div>
        {chapters.map((c, i) => (
          <div
            key={c.title}
            className="relative isolate flex min-h-[80svh] items-end overflow-hidden px-5 py-16 sm:px-10"
          >
            <Image src={c.still} alt="" fill sizes="100vw" className="-z-10 object-cover" />
            <span
              aria-hidden
              className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(26,18,15,.1),rgba(26,18,15,.82))]"
            />
            <ChapterWords
              c={c}
              label={
                i === 0
                  ? undefined
                  : labels.room
                      .replace('{n}', digits(i, lang))
                      .replace('{total}', digits(rooms.length, lang))
              }
            />
          </div>
        ))}
      </section>
    );
  }

  const roomIndex = active - 2; // −2 outside, −1 at the door
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
        <video
          ref={video}
          muted
          playsInline
          preload="auto"
          poster={film.poster}
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
          // A slow push as the page scrolls, so even a held frame keeps breathing.
          style={{ transform: 'scale(calc(1.04 - 0.04 * var(--p, 0)))' }}
        />
        {pct !== null ? (
          <div
            role="progressbar"
            aria-label={labels.section}
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            className="absolute inset-x-0 top-0 z-10 h-0.5 bg-ivory/10"
          >
            <span
              className="block h-full bg-glow transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        ) : null}
        {/* Shade for the words (left and bottom) and a soft vignette. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(26,18,15,.72)_0%,rgba(26,18,15,.38)_38%,transparent_64%),linear-gradient(0deg,rgba(26,18,15,.7)_0%,transparent_34%),radial-gradient(140%_110%_at_50%_45%,transparent_58%,rgba(18,12,10,.45))]"
        />

        {/* Chapter 0: the page's own opening words, over the building. */}
        <div
          ref={(n) => {
            words.current[0] = n;
          }}
          className="absolute inset-x-0 top-[9%] px-5 sm:px-10 lg:top-1/2 lg:-translate-y-1/2 lg:px-16"
        >
          {intro.content}
        </div>
        {chapters.map((c, i) => (
          <div
            key={c.title}
            ref={(n) => {
              words.current[i + 1] = n;
            }}
            style={{ opacity: 0, visibility: 'hidden' }}
            className="pointer-events-none absolute inset-x-0 bottom-28 px-5 sm:px-10 md:bottom-32 lg:bottom-44 lg:px-16"
          >
            <ChapterWords
              c={c}
              label={
                i === 0
                  ? undefined
                  : labels.room
                      .replace('{n}', digits(i, lang))
                      .replace('{total}', digits(rooms.length, lang))
              }
            />
          </div>
        ))}

        {/* The rooms: where we are, and a way to jump to any of them. */}
        <nav
          aria-label={labels.rooms}
          className={cn(
            'absolute inset-x-0 bottom-0 pr-24 pb-8 pl-5 transition-opacity duration-500 sm:pl-10 md:pb-9 lg:pb-28 lg:px-16',
            active === 0 ? 'opacity-0' : 'opacity-100',
          )}
        >
          <ol className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
            {rooms.map((r, k) => (
              <li key={r.title} className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => go(k + 2)}
                  tabIndex={active === 0 ? -1 : 0}
                  aria-current={roomIndex === k ? 'step' : undefined}
                  className="group block w-full py-3 text-left sm:pb-0"
                >
                  <span className="relative block h-px w-full bg-ivory/20">
                    <span
                      className={cn(
                        'absolute inset-0 origin-left bg-glow transition-transform duration-700',
                        roomIndex >= k ? 'scale-x-100' : 'scale-x-0',
                      )}
                    />
                  </span>
                  <span
                    className={cn(
                      'mt-2.5 hidden truncate text-[0.7rem] sm:block tracking-[0.16em] uppercase transition-colors sm:text-xs [:lang(bn)_&]:text-[0.8rem] [:lang(bn)_&]:tracking-normal [:lang(bn)_&]:normal-case',
                      roomIndex === k ? 'text-ivory' : 'text-ivory/55 group-hover:text-ivory/85',
                    )}
                  >
                    {r.title}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div
          aria-hidden
          className="absolute top-1/2 right-5 hidden h-[34svh] -translate-y-1/2 md:block md:right-8"
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
            'absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-[0.7rem] tracking-[0.24em] text-ivory/75 uppercase transition-opacity duration-500 [:lang(bn)_&]:tracking-normal [:lang(bn)_&]:normal-case',
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

function ChapterWords({ c, label }: { c: Chapter; label?: string }) {
  return (
    <div className="max-w-xl space-y-4">
      <p className="flex items-center gap-3 text-[0.72rem] tracking-[0.24em] text-glow uppercase tabular-nums [:lang(bn)_&]:text-[0.85rem] [:lang(bn)_&]:tracking-normal">
        <span aria-hidden className="h-px w-10 bg-glow" />
        {label}
      </p>
      <h2 className="font-display text-[clamp(2.6rem,6vw,5.4rem)] leading-[1] font-medium tracking-[-0.02em] [:lang(bn)_&]:leading-[1.2] [:lang(bn)_&]:tracking-normal">
        {c.title}
      </h2>
      <p className="text-[1.05rem] leading-relaxed text-ivory/85 sm:text-lg">{c.text}</p>
    </div>
  );
}
