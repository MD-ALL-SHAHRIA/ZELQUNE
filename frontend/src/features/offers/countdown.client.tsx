'use client';

import { useSyncExternalStore } from 'react';
import { fill, formatNumber } from '@/i18n/format';
import { type Locale } from '@/i18n/config';
import { timeLeft } from './countdown';

// One shared one-second clock for every countdown on the page.
const listeners = new Set<() => void>();
let timer: number | undefined;
let now = Date.now();
function subscribe(cb: () => void) {
  listeners.add(cb);
  timer ??= window.setInterval(() => {
    now = Date.now();
    listeners.forEach((l) => l());
  }, 1000);
  return () => {
    listeners.delete(cb);
    if (!listeners.size) {
      window.clearInterval(timer);
      timer = undefined;
    }
  };
}

/**
 * A live countdown to a sale's real end time (never a fake timer). Renders nothing on the
 * server and after the end, so cached pages never show a stale clock.
 */
export function Countdown({
  endsAt,
  lang,
  copy,
  className,
}: {
  endsAt: string;
  lang: Locale;
  copy: { endsIn: string; time: string };
  className?: string;
}) {
  const t = useSyncExternalStore(
    subscribe,
    () => now,
    () => null,
  );
  const left = t === null ? null : timeLeft(endsAt, t);
  if (!left) return null;
  const time = fill(copy.time, {
    d: formatNumber(left.d, lang),
    hh: lang === 'bn' ? formatNumber(Number(left.hh), lang).padStart(2, '০') : left.hh,
    mm: lang === 'bn' ? formatNumber(Number(left.mm), lang).padStart(2, '০') : left.mm,
    ss: lang === 'bn' ? formatNumber(Number(left.ss), lang).padStart(2, '০') : left.ss,
  });
  return (
    <span className={className} suppressHydrationWarning>
      <time dateTime={endsAt}>{fill(copy.endsIn, { time })}</time>
    </span>
  );
}
