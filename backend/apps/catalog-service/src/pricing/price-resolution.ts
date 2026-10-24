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

/** A promotion running now (catalog Promotion rows, loaded once per request). */
export interface LiveSale {
  id: string;
  nameEn: string;
  nameBn: string;
  kind: 'PERCENT' | 'FIXED';
  value: number;
  endsAt: Date;
  flash: boolean;
  /** null = every product. */
  productIds: ReadonlySet<string> | null;
}

/** The lowest price is ৳1: a sale never makes something free. */
const MIN_SALE_PAISA = 100;

const saleDiscount = (sale: LiveSale, amountPaisa: number): number =>
  sale.kind === 'PERCENT' ? Math.floor((amountPaisa * sale.value) / 100 / 100) * 100 : sale.value;

/**
 * Applies the best sale covering `productId` to a resolved price: the sale price becomes the
 * amount and the regular price is shown as compareAt (unless a higher compareAt already is).
 * Prices from a price experiment arm are left alone, so the A/B test stays clean.
 */
export function applySale(
  price: ResolvedPrice | null,
  productId: string,
  sales: readonly LiveSale[],
): ResolvedPrice | null {
  if (!price || price.experimentKey) return price;
  let best: { sale: LiveSale; amount: number } | null = null;
  for (const sale of sales) {
    if (sale.productIds && !sale.productIds.has(productId)) continue;
    const amount = Math.max(
      MIN_SALE_PAISA,
      price.amountPaisa - saleDiscount(sale, price.amountPaisa),
    );
    if (amount < price.amountPaisa && (!best || amount < best.amount)) best = { sale, amount };
  }
  if (!best) return { ...price, sale: null };
  const regular = price.amountPaisa;
  return {
    ...price,
    amountPaisa: best.amount,
    compareAtPaisa: Math.max(regular, price.compareAtPaisa ?? 0),
    sale: {
      promotionId: best.sale.id,
      nameEn: best.sale.nameEn,
      nameBn: best.sale.nameBn,
      endsAt: best.sale.endsAt.toISOString(),
      flash: best.sale.flash,
      regularPaisa: regular,
    },
  };
}

/** Lowest price among variants (for "from ৳…" on listings). */
export function lowestPrice(prices: (ResolvedPrice | null)[]): ResolvedPrice | null {
  return prices.reduce<ResolvedPrice | null>(
    (min, price) => (price && (!min || price.amountPaisa < min.amountPaisa) ? price : min),
    null,
  );
}
