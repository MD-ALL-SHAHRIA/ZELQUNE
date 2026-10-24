'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';

/** Round prev/next arrows that scroll the collections row by one card. */
export function CollectionsArrows({
  targetId,
  labels,
}: {
  targetId: string;
  labels: { prev: string; next: string };
}) {
  const busy = useRef(false);
  const move = (dir: 1 | -1) => {
    const row = document.getElementById(targetId);
    const card = row?.querySelector('li');
    if (!row || !card || busy.current) return;
    busy.current = true;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    row.scrollBy({ left: dir * (card.clientWidth + 24), behavior: reduce ? 'auto' : 'smooth' });
    window.setTimeout(() => (busy.current = false), 350);
  };
  const button =
    'grid size-11 place-items-center rounded-full border border-ink/30 text-ink transition-colors duration-300 hover:border-ink hover:bg-ink hover:text-paper';
  return (
    <div className="flex gap-2">
      <button type="button" aria-label={labels.prev} onClick={() => move(-1)} className={button}>
        <ChevronLeft className="size-4" strokeWidth={1.3} />
      </button>
      <button type="button" aria-label={labels.next} onClick={() => move(1)} className={button}>
        <ChevronRight className="size-4" strokeWidth={1.3} />
      </button>
    </div>
  );
}
