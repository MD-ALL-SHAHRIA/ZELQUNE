'use client';

import { useEffect, useRef, useState } from 'react';

const BANGLA = /[ঀ-৿]/;
/** The whole heading takes at most this long to finish its wave, however long it is. */
const MAX_WAVE_MS = 700;

/**
 * A heading that writes itself in when it scrolls into view: each letter (each word in Bangla,
 * whose joined letters must never be split) fades up in a short wave. Screen readers get the
 * plain sentence once. Server HTML shows the text; only headings still below the fold are hidden
 * before they animate, and reduced motion skips it all (globals.css).
 */
export function SplitText({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [state, setState] = useState<'idle' | 'armed' | 'shown'>('idle');

  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const rect = el.getBoundingClientRect();
    // Already on screen when the page loads: leave it be (no flash).
    if (rect.top < window.innerHeight && rect.bottom > 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- arm once, off-screen, before it is seen
    setState('armed');
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setState('shown');
        io.disconnect();
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const byWord = BANGLA.test(text);
  const words = text.split(/\s+/).filter(Boolean);
  const count = byWord ? words.length : words.reduce((n, w) => n + Array.from(w).length, 0);
  const step = Math.min(byWord ? 70 : 24, MAX_WAVE_MS / Math.max(count, 1));
  let i = 0;

  return (
    <span
      ref={ref}
      className="split"
      data-state={state}
      style={{ '--split-step': `${step}ms` } as React.CSSProperties}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((word, w) => (
          <span key={w}>
            <span className="inline-block whitespace-nowrap">
              {byWord ? (
                <span className="split-piece" style={{ '--i': i++ } as React.CSSProperties}>
                  {word}
                </span>
              ) : (
                Array.from(word).map((ch, c) => (
                  <span
                    key={c}
                    className="split-piece"
                    style={{ '--i': i++ } as React.CSSProperties}
                  >
                    {ch}
                  </span>
                ))
              )}
            </span>
            {w < words.length - 1 ? ' ' : null}
          </span>
        ))}
      </span>
    </span>
  );
}
