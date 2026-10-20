/** Per-line limit for B2C carts (order-service MAX_LINE_QTY_B2C; bulk goes through RFQ). */
export const MAX_QTY = 10;
export const CART_COOKIE_MAX_AGE = 30 * 86_400;

export function clampQty(qty: number): number {
  return Math.max(0, Math.min(MAX_QTY, Math.trunc(qty)));
}

/** Gateway errors that mean the stored cart token is no longer usable. */
export function isLostCart(code: string): boolean {
  return code === 'CART_NOT_FOUND' || code === 'CART_TOKEN_REQUIRED' || code === 'CART_CHECKED_OUT';
}
