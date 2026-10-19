import { type Dictionary } from '@/i18n/dictionaries/en';

/** The slice of the dictionary the client cart needs (keeps the client payload small). */
export function cartCopy(dict: Dictionary) {
  return {
    cart: dict.cart,
    ui: dict.ui,
    variants: dict.product.variants,
    names: Object.fromEntries(
      Object.entries(dict.products).map(([slug, p]) => [slug, p?.name ?? slug]),
    ),
    qtyLimit: dict.product.qtyLimit,
    errors: dict.checkout.errors,
  };
}
export type CartCopy = ReturnType<typeof cartCopy>;

/** Gateway error code -> copy. */
export function cartErrorText(code: string, copy: CartCopy): string {
  if (code === 'QTY_LIMIT') return copy.qtyLimit;
  if (code === 'VARIANT_NOT_AVAILABLE' || code === 'OUT_OF_STOCK') return copy.errors.outOfStock;
  if (code === 'TOO_MANY_REQUESTS') return copy.errors.rateLimited;
  return copy.errors.generic;
}
