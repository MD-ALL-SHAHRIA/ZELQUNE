'use client';

import { useEffect, useMemo, useState } from 'react';
import { type Locale } from '@/i18n/config';
import { fill, formatNumber } from '@/i18n/format';
import { type SaleMode } from '@/shared/api/types';
import { cn } from '@/shared/lib/cn';

export type Availability = 'all' | 'preOrder' | 'madeToOrder' | 'inStock';
export type SortKey = 'featured' | 'priceAsc' | 'priceDesc';

export const AVAILABILITY_MODE: Record<Exclude<Availability, 'all'>, SaleMode> = {
  preOrder: 'PRE_ORDER',
  madeToOrder: 'MADE_TO_ORDER',
  inStock: 'IN_STOCK',
};

export interface ListingItem {
  id: string;
  saleMode: SaleMode;
  pricePaisa: number | null;
  /** The product card, rendered on the server. */
  card: React.ReactNode;
}

export interface ListingCopy {
  results: string;
  availability: string;
  all: string;
  preOrder: string;
  madeToOrder: string;
  inStock: string;
  sort: string;
  featured: string;
  priceAsc: string;
  priceDesc: string;
  clear: string;
  empty: string;
}

const SORTS: SortKey[] = ['featured', 'priceAsc', 'priceDesc'];
const FILTERS: Availability[] = ['all', 'preOrder', 'madeToOrder', 'inStock'];

/** Pure filter + sort (featured keeps the catalog order). */
export function applyListing<T extends Pick<ListingItem, 'saleMode' | 'pricePaisa'>>(
  items: T[],
  availability: Availability,
  sort: SortKey,
): T[] {
  const filtered =
    availability === 'all'
      ? items
      : items.filter((i) => i.saleMode === AVAILABILITY_MODE[availability]);
  if (sort === 'featured') return filtered;
  const dir = sort === 'priceAsc' ? 1 : -1;
  // Products without a price go last either way.
  return [...filtered].sort((a, b) => {
    if (a.pricePaisa === null) return 1;
    if (b.pricePaisa === null) return -1;
    return (a.pricePaisa - b.pricePaisa) * dir;
  });
}

const label =
  'text-[0.68rem] font-medium uppercase tracking-[0.16em] text-stone [:lang(bn)_&]:text-[0.8rem] [:lang(bn)_&]:normal-case [:lang(bn)_&]:tracking-normal';

const selectClass =
  'h-10 w-full min-w-0 cursor-pointer appearance-none border border-line bg-paper bg-[length:10px] bg-[right_0.85rem_center] bg-no-repeat pl-3 pr-8 text-sm text-ink transition-colors hover:border-ink/40 focus-visible:border-ink';

const chevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6' fill='none' stroke='%2316120f' stroke-width='1.2'%3E%3Cpath d='M1 1l4 4 4-4'/%3E%3C/svg%3E\")";

/**
 * The listing toolbar (results, availability, sort, clear) and the grid. Filters and sorts the
 * products the server already rendered, so the page stays ISR; the choice is mirrored to the URL
 * (?availability=&sort=) for sharing and the back button, and read back after hydration.
 */
export function ListingGrid({
  items,
  copy,
  lang,
}: {
  items: ListingItem[];
  copy: ListingCopy;
  lang: Locale;
}) {
  const [availability, setAvailability] = useState<Availability>('all');
  const [sort, setSort] = useState<SortKey>('featured');

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const a = q.get('availability');
    const s = q.get('sort');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of the URL after hydration (the server never reads searchParams, so the page stays ISR)
    if (a && (FILTERS as string[]).includes(a)) setAvailability(a as Availability);
    if (s && (SORTS as string[]).includes(s)) setSort(s as SortKey);
  }, []);

  const update = (next: { availability?: Availability; sort?: SortKey }) => {
    const a = next.availability ?? availability;
    const s = next.sort ?? sort;
    setAvailability(a);
    setSort(s);
    const url = new URL(window.location.href);
    if (a === 'all') url.searchParams.delete('availability');
    else url.searchParams.set('availability', a);
    if (s === 'featured') url.searchParams.delete('sort');
    else url.searchParams.set('sort', s);
    window.history.replaceState(window.history.state, '', url);
  };

  // Only offer the availability options the list actually contains (never an empty "In stock").
  const counts = useMemo(() => {
    const c: Record<Availability, number> = {
      all: items.length,
      preOrder: 0,
      madeToOrder: 0,
      inStock: 0,
    };
    for (const i of items) {
      for (const key of ['preOrder', 'madeToOrder', 'inStock'] as const) {
        if (i.saleMode === AVAILABILITY_MODE[key]) c[key] += 1;
      }
    }
    return c;
  }, [items]);
  const options = FILTERS.filter((f) => f === 'all' || counts[f] > 0 || f === availability);
  const shown = useMemo(() => applyListing(items, availability, sort), [items, availability, sort]);
  const dirty = availability !== 'all' || sort !== 'featured';
  const n = (x: number) => formatNumber(x, lang);

  const clearButton = dirty ? (
    <button
      type="button"
      onClick={() => update({ availability: 'all', sort: 'featured' })}
      className="shrink-0 text-sm underline decoration-ink/30 underline-offset-[5px] transition hover:decoration-ink"
    >
      {copy.clear}
    </button>
  ) : null;

  return (
    <div>
      <div className="border-y border-line">
        {/* Desktop: one slim row. */}
        <div className="hidden h-16 items-center gap-8 md:flex">
          <p className="min-w-28 text-sm text-stone" aria-live="polite" data-testid="results-count">
            {fill(copy.results, { n: n(shown.length) })}
          </p>
          {options.length > 2 ? (
            <div role="group" aria-label={copy.availability} className="flex items-center gap-2">
              <span className={cn(label, 'mr-2')} aria-hidden>
                {copy.availability}
              </span>
              {options.map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={availability === f}
                  onClick={() => update({ availability: f })}
                  className={cn(
                    'h-9 border px-4 text-[0.82rem] transition-colors',
                    availability === f
                      ? 'border-ink bg-ink text-paper'
                      : 'border-line text-ink hover:border-ink/40',
                  )}
                >
                  {copy[f]}
                  <span
                    className={cn(
                      'ml-2 tabular-nums',
                      availability === f ? 'text-paper/60' : 'text-stone',
                    )}
                  >
                    {n(counts[f])}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
          <div className="ml-auto flex items-center gap-6">
            {clearButton}
            <label className="flex items-center gap-3">
              <span className={label}>{copy.sort}</span>
              <select
                value={sort}
                onChange={(e) => update({ sort: e.target.value as SortKey })}
                className={cn(selectClass, 'w-52')}
                style={{ backgroundImage: chevron }}
              >
                {SORTS.map((s) => (
                  <option key={s} value={s}>
                    {copy[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Mobile: a compact bar with two selects. */}
        <div className="space-y-3 py-3 md:hidden">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-stone" aria-live="polite" data-testid="results-count">
              {fill(copy.results, { n: n(shown.length) })}
            </p>
            {clearButton}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="min-w-0 space-y-1.5">
              <span className={cn(label, 'block')}>{copy.availability}</span>
              <select
                value={availability}
                onChange={(e) => update({ availability: e.target.value as Availability })}
                className={selectClass}
                style={{ backgroundImage: chevron }}
              >
                {options.map((f) => (
                  <option key={f} value={f}>
                    {copy[f]} ({n(counts[f])})
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-0 space-y-1.5">
              <span className={cn(label, 'block')}>{copy.sort}</span>
              <select
                value={sort}
                onChange={(e) => update({ sort: e.target.value as SortKey })}
                className={selectClass}
                style={{ backgroundImage: chevron }}
              >
                {SORTS.map((s) => (
                  <option key={s} value={s}>
                    {copy[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      {shown.length ? (
        <ul
          className="grid gap-x-5 gap-y-14 pt-10 sm:grid-cols-2 sm:gap-y-16 md:pt-12 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-20"
          data-testid="product-grid"
        >
          {shown.map((i) => (
            <li key={i.id} data-sale-mode-item={i.saleMode} data-price={i.pricePaisa ?? undefined}>
              {i.card}
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-start gap-5 py-20">
          <p className="font-display text-2xl font-light text-stone">{copy.empty}</p>
          {clearButton}
        </div>
      )}
    </div>
  );
}
