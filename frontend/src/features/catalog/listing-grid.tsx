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
 * Sticky offset under the site header. The header can publish its height as --header-h; until it
 * does, these match its measured heights (mobile / desktop).
 */
const STICKY = 'top-[var(--header-h,6.875rem)] lg:top-[var(--header-h,8.625rem)]';

/** Position of the editorial tile: after the first row of products (or at the end). */
const EDITORIAL_AFTER = 3;
/** Editorial tile width by products-per-row remainder (2 columns on sm, 3 on lg). */
const SPAN_SM = ['sm:col-span-2', 'sm:col-span-1'] as const;
const SPAN_LG = ['lg:col-span-3', 'lg:col-span-2', 'lg:col-span-1'] as const;

/**
 * The listing toolbar (results, availability, sort, clear) and the grid. Filters and sorts the
 * products the server already rendered, so the page stays ISR; the choice is mirrored to the URL
 * (?availability=&sort=) for sharing and the back button, and read back after hydration.
 * The toolbar stays in reach (sticky under the header) while the grid scrolls; an optional
 * editorial tile breaks the grid rhythm once, in the unfiltered "featured" view only.
 */
export function ListingGrid({
  items,
  copy,
  lang,
  editorial,
  emptyAction,
}: {
  items: ListingItem[];
  copy: ListingCopy;
  lang: Locale;
  /** A wide editorial tile (server-rendered) shown once inside the grid. */
  editorial?: React.ReactNode;
  /** Shown in the empty state when nothing can be cleared (e.g. a link to all products). */
  emptyAction?: React.ReactNode;
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
  const showEditorial = !!editorial && !dirty && shown.length > 0;
  const editorialAt = Math.min(EDITORIAL_AFTER, shown.length);
  // The tile fills what the last row leaves open, so the grid always ends flush.
  const n2 = shown.length % 2;
  const n3 = shown.length % 3;

  const clearButton = dirty ? (
    <button
      type="button"
      onClick={() => update({ availability: 'all', sort: 'featured' })}
      className="shrink-0 text-sm underline decoration-ink/30 underline-offset-[5px] transition hover:decoration-ink"
    >
      {copy.clear}
    </button>
  ) : null;

  const results = (
    <p className="text-sm tabular-nums text-stone" aria-live="polite" data-testid="results-count">
      {fill(copy.results, { n: n(shown.length) })}
    </p>
  );

  return (
    <div>
      {/* Mobile: the count sits above the bar, so the sticky part stays one slim row. */}
      <div className="flex h-11 items-center justify-between gap-4 md:hidden">
        {results}
        {clearButton}
      </div>

      <div
        className={cn(
          'sticky z-20 -mx-5 border-y border-line bg-paper/95 px-5 backdrop-blur-md supports-[backdrop-filter]:bg-paper/85 md:mx-0 md:px-0',
          STICKY,
        )}
      >
        {/* Desktop: one slim row. */}
        <div className="hidden h-16 items-center gap-8 md:flex">
          <div className="min-w-28">{results}</div>
          {options.length > 2 ? (
            <div role="group" aria-label={copy.availability} className="flex items-center gap-1">
              <span className={cn(label, 'mr-4')} aria-hidden>
                {copy.availability}
              </span>
              {options.map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={availability === f}
                  onClick={() => update({ availability: f })}
                  className={cn(
                    'relative h-9 px-3.5 text-[0.84rem] transition-colors after:absolute after:inset-x-3.5 after:-bottom-px after:h-px after:origin-left after:bg-ink after:transition-transform after:duration-500 after:ease-out-soft',
                    availability === f
                      ? 'text-ink after:scale-x-100'
                      : 'text-ink/65 after:scale-x-0 hover:text-ink',
                  )}
                >
                  {copy[f]}
                  <sup className="ml-1 text-[0.62rem] tabular-nums text-stone">{n(counts[f])}</sup>
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
                className={cn(selectClass, 'w-52 border-transparent hover:border-line')}
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

        {/* Mobile: two selects with their labels floating inside, one row. */}
        <div className="grid grid-cols-2 divide-x divide-line md:hidden">
          <label className="relative block min-w-0">
            <span className={cn(label, 'pointer-events-none absolute left-0 top-2 text-[0.6rem]')}>
              {copy.availability}
            </span>
            <select
              value={availability}
              onChange={(e) => update({ availability: e.target.value as Availability })}
              className={cn(selectClass, 'h-14 border-0 pl-0 pt-4 pr-7')}
              style={{ backgroundImage: chevron, backgroundColor: 'transparent' }}
            >
              {options.map((f) => (
                <option key={f} value={f}>
                  {copy[f]} ({n(counts[f])})
                </option>
              ))}
            </select>
          </label>
          <label className="relative block min-w-0 pl-4">
            <span className={cn(label, 'pointer-events-none absolute left-4 top-2 text-[0.6rem]')}>
              {copy.sort}
            </span>
            <select
              value={sort}
              onChange={(e) => update({ sort: e.target.value as SortKey })}
              className={cn(selectClass, 'h-14 border-0 pl-0 pt-4 pr-7')}
              style={{ backgroundImage: chevron, backgroundColor: 'transparent' }}
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

      {shown.length ? (
        // The list is display:contents so the editorial tile can sit between products (CSS
        // order) while the list itself only ever holds products.
        <div className="grid gap-x-5 gap-y-14 pt-10 sm:grid-cols-2 sm:gap-y-16 md:pt-14 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-24">
          <ul className="contents" data-testid="product-grid">
            {shown.map((i, idx) => (
              <li
                key={i.id}
                data-sale-mode-item={i.saleMode}
                data-price={i.pricePaisa ?? undefined}
                style={showEditorial ? { order: idx < editorialAt ? idx : idx + 1 } : undefined}
              >
                {i.card}
              </li>
            ))}
          </ul>
          {showEditorial ? (
            <div className={cn(SPAN_SM[n2], SPAN_LG[n3])} style={{ order: editorialAt }}>
              {editorial}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="relative flex flex-col items-center gap-7 overflow-hidden py-24 text-center sm:py-32">
          {/* The arch, drawn as an empty frame: the room waiting for its piece. */}
          <span
            aria-hidden
            className="block h-28 w-20 rounded-t-full border border-walnut/30 bg-[linear-gradient(180deg,transparent_55%,color-mix(in_oklab,var(--color-glow)_55%,transparent))]"
          />
          <p className="max-w-md font-display text-3xl font-medium leading-snug text-ink/80 [:lang(bn)_&]:text-2xl">
            {copy.empty}
          </p>
          {clearButton ?? emptyAction}
        </div>
      )}
    </div>
  );
}
