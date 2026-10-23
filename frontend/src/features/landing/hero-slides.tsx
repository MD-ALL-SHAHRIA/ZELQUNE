'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

/**
 * The hero's second and third room photos. They are mounted only after the page has loaded
 * (and never for people who prefer reduced motion), so they cannot compete with the first
 * photo (the LCP image). Until they arrive the first photo simply stays.
 * The crossfade itself is CSS (`hero-fade-*` keyframes in hero.tsx).
 */
export function HeroSlides({
  slides,
  sizes = '100vw',
}: {
  slides: { src: string; position?: string }[];
  sizes?: string;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let idle = 0;
    const start = () => {
      idle = window.setTimeout(() => setReady(true), 1200);
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
    return () => {
      window.removeEventListener('load', start);
      window.clearTimeout(idle);
    };
  }, []);

  if (!ready) return null;
  return (
    <>
      {slides.map((s, i) => (
        <div
          key={s.src}
          aria-hidden
          className="hero-slide absolute inset-0 -z-10 opacity-0"
          style={{ animationName: `hero-fade-${i + 2}` }}
        >
          <Image
            src={s.src}
            alt=""
            fill
            sizes={sizes}
            fetchPriority="low"
            className="hero-frame-img object-cover"
            style={{ objectPosition: s.position ?? 'center' }}
          />
        </div>
      ))}
    </>
  );
}
