import { type ExperimentKey, type ResolvedPrice } from '@zelqune/contracts';

export interface BasePriceRow {
  amountPaisa: number;
  compareAtPaisa: number | null;
  startsAt: Date;
  endsAt: Date | null;
}

export interface ExperimentRow {
  key: ExperimentKey;
  amountPaisa: number;
  active: boolean;
}

/** `?p=` value -> experiment bucket. Anything other than a/b (case-insensitive) is ignored. */
export function parseExperimentKey(p: string | undefined | null): ExperimentKey | null {
  const value = p?.trim().toLowerCase();
  return value === 'a' || value === 'b' ? value : null;
}

/** The base price in effect at `now`: inside its window, latest start wins. */
export function currentBasePrice(prices: BasePriceRow[], now: Date): BasePriceRow | null {
  let current: BasePriceRow | null = null;
  for (const price of prices) {
    const started = price.startsAt <= now;
    const notEnded = price.endsAt === null || price.endsAt > now;
    if (started && notEnded && (!current || price.startsAt > current.startsAt)) current = price;
  }
  return current;
}

/**
 * Resolves the price a visitor sees for one variant.
 * - `p=a|b` with an active experiment arm -> that amount, tagged with `experimentKey`.
 * - otherwise the current base price (experimentKey null).
 * - compareAt is only shown when it is above the shown amount (no fake discounts).
 */
export function resolvePrice(input: {
  prices: BasePriceRow[];
  experiments: ExperimentRow[];
  p?: string | null;
  now?: Date;
}): ResolvedPrice | null {
  const now = input.now ?? new Date();
  const base = currentBasePrice(input.prices, now);
  const key = parseExperimentKey(input.p);
  const arm = key ? input.experiments.find((e) => e.key === key && e.active) : undefined;

  const amountPaisa = arm ? arm.amountPaisa : base?.amountPaisa;
  if (amountPaisa === undefined) return null;
  const compareAt = base?.compareAtPaisa ?? null;

  return {
    amountPaisa,
    compareAtPaisa: compareAt !== null && compareAt > amountPaisa ? compareAt : null,
    currency: 'BDT',
    experimentKey: arm ? arm.key : null,
  };
}

/** Lowest price among variants (for "from ৳…" on listings). */
export function lowestPrice(prices: (ResolvedPrice | null)[]): ResolvedPrice | null {
  return prices.reduce<ResolvedPrice | null>(
    (min, price) => (price && (!min || price.amountPaisa < min.amountPaisa) ? price : min),
    null,
  );
}
