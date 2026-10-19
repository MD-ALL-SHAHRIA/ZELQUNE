import {
  type CartItemView,
  type CheckoutSnapshotResponse,
  type SaleMode,
  type VariantCheckoutSnapshot,
} from '@zelqune/contracts';

export interface PricedLine {
  variantId: string;
  qty: number;
  snapshot: VariantCheckoutSnapshot;
  unitPricePaisa: number;
}

export interface PricedCart {
  items: CartItemView[];
  lines: PricedLine[];
  subtotalPaisa: number;
  saleMode: SaleMode | null;
  mixedSaleModes: boolean;
  allAvailable: boolean;
}

/** Joins cart rows with live catalog data. Unsellable or unpriced variants become unavailable. */
export function priceCart(
  rows: { variantId: string; qty: number }[],
  snapshot: CheckoutSnapshotResponse,
): PricedCart {
  const lines: PricedLine[] = [];
  const items: CartItemView[] = rows.map(({ variantId, qty }) => {
    const s = snapshot[variantId];
    const unit = s?.price?.amountPaisa;
    if (s && unit !== undefined) lines.push({ variantId, qty, snapshot: s, unitPricePaisa: unit });
    return {
      variantId,
      qty,
      sku: s?.sku ?? null,
      productSlug: s?.productSlug ?? null,
      nameBn: s?.nameBn ?? null,
      nameEn: s?.nameEn ?? null,
      options: s?.options ?? {},
      saleMode: s?.saleMode ?? null,
      unitPrice: s?.price ?? null,
      lineTotalPaisa: unit === undefined ? null : unit * qty,
      available: unit !== undefined,
    };
  });
  const modes = new Set(lines.map((l) => l.snapshot.saleMode));
  return {
    items,
    lines,
    subtotalPaisa: lines.reduce((sum, l) => sum + l.unitPricePaisa * l.qty, 0),
    saleMode: modes.size === 1 ? [...modes][0] : null,
    mixedSaleModes: modes.size > 1,
    allAvailable: items.every((i) => i.available),
  };
}
