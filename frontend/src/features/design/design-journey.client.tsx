'use client';

import { ArrowDown } from 'lucide-react';
import Image from 'next/image';
import { type ReactNode, useEffect, useRef, useSyncExternalStore } from 'react';
import { cn } from '@/shared/lib/cn';

export interface Scene {
  image: string;
  /** Where the next arch opens, as a fraction of the frame (0–1); the camera pushes in there. */
  focus: [number, number];
  title: string;
  text: string;
}

const REDUCE = '(prefers-reduced-motion: reduce)';
function subscribeMotion(onChange: () => void) {
  const media = window.matchMedia(REDUCE);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Viewport heights of scrolling per scene. */
const VH_PER_SCENE = 120;
/** How quickly the picture catches up with the scroll (lower = silkier). */
const EASE = 0.09;
/** Within each scene: hold, then step through the arch into the next one. */
const PUSH_FROM = 0.3;

/**
 * "Step inside": the design page opens on the building. Scrolling pushes the camera toward its
 * door, an arch (the brand's one curve) opens there onto the home, the home pushes in to a room,
 * and the room to its details — then the page carries on into the process. One sticky stage,
 * progress eased toward the scroll each frame, transforms and clip-paths only. Reduced motion
 * gets the scenes as a simple stack of photos with their words.
 */
export function DesignJourney({
  scenes,
  intro,
  scrollLabel,
}: {
  /** The first scene is the outside; its words are the page's intro (the h1). */
  scenes: Scene[];
  intro: ReactNode;
  scrollLabel: string;
}) {
  const reduced = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia(REDUCE).matches,
    () => false,
  );
  const root = useRef<HTMLElement>(null);
  const layers = useRef<(HTMLDivElement | null)[]>([]);
  const photos = useRef<(HTMLDivElement | null)[]>([]);
  const words = useRef<(HTMLDivElement | null)[]>([]);
  const rail = useRef<HTMLSpanElement>(null);
  const n = scenes.length;

  useEffect(() => {
    if (reduced) return;
    const el = root.current;
    if (!el) return;
    let target = 0;
    let current = 0;
    let frame = 0;

    const measure = () => {
      const r = el.getBoundingClientRect();
      const run = el.offsetHeight - window.innerHeight;
      target = run > 0 ? clamp(-r.top / run) : 0;
    };

    const paint = (p: number) => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      // 0 … n-1, with the last scene held a little at the end.
      const t = p * (n - 0.6);
      const door = Math.min(W, H) * 0.16; // the arch's width when it first appears
      scenes.forEach((s, k) => {
        const layer = layers.current[k];
        const photo = photos.current[k];
        const local = t - k;
        // Pushing in toward this scene's focus as the next arch opens.
        const push = k < n - 1 ? smooth(PUSH_FROM, 1, local) : 0;
        if (photo) {
          // Arriving: settle from slightly enlarged (depth), then push in toward the door.
          const settle = k === 0 ? 1 : lerp(1.3, 1, smooth(-1 + PUSH_FROM, 0.15, local));
          photo.style.transform = `scale(${(settle * (1 + push * 2.4)).toFixed(4)})`;
        }
        if (layer && k > 0) {
          // This scene appears through an arch at the previous scene's focus, growing to the frame.
          const prev = scenes[k - 1]!;
          const g = smooth(PUSH_FROM + 0.15, 1, local + 1);
          const w = lerp(door, W, g);
          const h = lerp(door * 1.45, H, g);
          const cx = lerp(prev.focus[0] * W, W / 2, g);
          const cy = lerp(prev.focus[1] * H, H / 2, g);
          const top = cy - h / 2;
          const left = cx - w / 2;
          const r = lerp(w / 2, 0, g);
          layer.style.clipPath = `inset(${top.toFixed(1)}px ${(W - left - w).toFixed(1)}px ${(H - top - h).toFixed(1)}px ${left.toFixed(1)}px round ${r.toFixed(1)}px ${r.toFixed(1)}px 0 0)`;
          layer.style.opacity = String(smooth(PUSH_FROM + 0.1, PUSH_FROM + 0.25, local + 1));
        }
        const w = words.current[k];
        if (w) {
          const o =
            k === 0
              ? 1 - smooth(0.05, PUSH_FROM + 0.1, local)
              : smooth(-0.2, 0.05, local) * (k === n - 1 ? 1 : 1 - smooth(0.5, 0.7, local));
          w.style.opacity = String(o);
          w.style.transform = `translate3d(0, ${((1 - o) * 24).toFixed(1)}px, 0)`;
          w.style.visibility = o < 0.01 ? 'hidden' : 'visible';
        }
      });
      if (rail.current) rail.current.style.transform = `scaleY(${p})`;
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
    const onResize = () => {
      measure();
      current = target;
      paint(current);
    };
    measure();
    current = target;
    paint(current);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [reduced, n, scenes]);

  if (reduced) {
    return (
      <section className="tone-dark bg-night text-ivory">
        {scenes.map((s, k) => (
          <div key={s.image} className="relative isolate flex min-h-[80svh] items-end">
            <Image
              src={s.image}
              alt=""
              fill
              sizes="100vw"
              preload={k === 0}
              className="-z-10 object-cover"
            />
            <div aria-hidden className="absolute inset-0 -z-10 bg-night/45" />
            <div className="w-full px-5 pb-12 pt-32 sm:px-10">
              {k === 0 ? intro : <SceneWords scene={s} />}
            </div>
          </div>
        ))}
      </section>
    );
  }

  return (
    <section
      ref={root}
      className="tone-dark relative bg-night text-ivory"
      style={{ height: `${n * VH_PER_SCENE}svh` }}
    >
      <div className="sticky top-0 h-svh overflow-hidden">
        {scenes.map((s, k) => (
          <div
            key={s.image}
            ref={(node) => {
              layers.current[k] = node;
            }}
            className="absolute inset-0 overflow-hidden will-change-[clip-path]"
            style={k > 0 ? { clipPath: 'inset(50% 50% 50% 50%)', opacity: 0 } : undefined}
          >
            <div
              ref={(node) => {
                photos.current[k] = node;
              }}
              className="absolute inset-0 will-change-transform"
              style={{ transformOrigin: `${s.focus[0] * 100}% ${s.focus[1] * 100}%` }}
            >
              <Image
                src={s.image}
                alt=""
                fill
                sizes="100vw"
                preload={k === 0}
                className="object-cover"
                style={{ objectPosition: `${s.focus[0] * 100}% ${s.focus[1] * 100}%` }}
              />
            </div>
            <div
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(180deg,rgba(43,30,25,0.35)_0%,rgba(43,30,25,0)_30%,rgba(43,30,25,0.25)_55%,rgba(43,30,25,0.85)_100%)]"
            />
          </div>
        ))}

        {scenes.map((s, k) => (
          <div
            key={`w-${s.image}`}
            ref={(node) => {
              words.current[k] = node;
            }}
            className={cn(
              'absolute inset-x-0 bottom-0 px-5 pb-14 sm:px-10 sm:pb-16 lg:px-16',
              k > 0 && 'pointer-events-none',
            )}
            style={k > 0 ? { opacity: 0, visibility: 'hidden' } : undefined}
          >
            {k === 0 ? (
              <>
                {intro}
                <p className="mt-8 flex items-center gap-2 text-sm text-ivory/75">
                  <ArrowDown aria-hidden className="size-3.5 animate-bounce" />
                  {scrollLabel}
                </p>
              </>
            ) : (
              <SceneWords scene={s} />
            )}
          </div>
        ))}

        {/* Progress rail. */}
        <div aria-hidden className="absolute right-5 top-1/2 hidden h-40 -translate-y-1/2 sm:block">
          <span className="absolute inset-0 w-px bg-ivory/25" />
          <span ref={rail} className="absolute inset-0 w-px origin-top scale-y-0 bg-amber" />
        </div>
      </div>
    </section>
  );
}

function SceneWords({ scene }: { scene: Scene }) {
  return (
    <div className="max-w-xl space-y-4">
      <span aria-hidden className="block h-px w-10 bg-amber" />
      <h2 className="font-display text-4xl font-medium leading-tight sm:text-5xl">{scene.title}</h2>
      <p className="text-base leading-relaxed text-ivory/85 sm:text-lg">{scene.text}</p>
    </div>
  );
}
