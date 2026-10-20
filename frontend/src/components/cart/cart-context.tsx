'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { api, ok, visitor } from '@/lib/api-browser';
import { ApiError, type Cart } from '@/lib/api-types';
import { CART_COOKIE_MAX_AGE, clampQty, isLostCart } from '@/lib/cart-rules';
import { deleteCookie, readCookie, writeCookie } from '@/lib/cookies';
import { COOKIE } from '@/lib/visitor';

/** Fired on every successful add so analytics/Pixel can listen without coupling to the cart. */
export const ADD_TO_CART_EVENT = 'zq:add-to-cart';
export interface AddToCartDetail {
  productId: string;
  variantId: string;
  qty: number;
  unitPricePaisa: number;
}

interface CartState {
  cart: Cart | null;
  /** Current guest cart token (checkout sends it to the gateway). */
  cartToken(): string | null;
  open: boolean;
  busy: boolean;
  error: string | null;
  setOpen(open: boolean): void;
  add(input: AddToCartDetail, options?: { openDrawer?: boolean }): Promise<boolean>;
  setQty(variantId: string, qty: number): Promise<void>;
  /** Called after checkout: the cart is closed server-side. */
  forget(): void;
}

const CartContext = createContext<CartState | null>(null);

export function useCart(): CartState {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart outside CartProvider');
  return value;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);

  const remember = useCallback((next: string | null) => {
    tokenRef.current = next;
    if (next) writeCookie(COOKIE.cart, next, CART_COOKIE_MAX_AGE);
    else deleteCookie(COOKIE.cart);
  }, []);

  const forget = useCallback(() => {
    remember(null);
    setCart(null);
  }, [remember]);

  useEffect(() => {
    const saved = readCookie(COOKIE.cart);
    if (!saved) return;
    tokenRef.current = saved;
    api
      .GET('/v1/carts/current', { params: { header: { 'x-cart-token': saved } } })
      .then((r) => setCart(ok(r)))
      .catch(() => forget());
  }, [forget]);

  const ensureToken = useCallback(async (): Promise<string> => {
    if (tokenRef.current) return tokenRef.current;
    // The price arm travels on the cart, so checkout charges the price the visitor saw.
    const { p } = visitor();
    const created = ok(await api.POST('/v1/carts', { body: p ? { p } : {} }));
    remember(created.cartToken);
    setCart(created.cart);
    return created.cartToken;
  }, [remember]);

  const write = useCallback(
    async (variantId: string, qty: number): Promise<Cart> => {
      // A cart that expired or was checked out elsewhere is replaced once, transparently.
      for (let attempt = 0; ; attempt++) {
        const header = { 'x-cart-token': await ensureToken() };
        try {
          return qty === 0
            ? ok(
                await api.DELETE('/v1/carts/current/items/{variantId}', {
                  params: { header, path: { variantId } },
                }),
              )
            : ok(
                await api.PUT('/v1/carts/current/items/{variantId}', {
                  params: { header, path: { variantId } },
                  body: { qty },
                }),
              );
        } catch (e) {
          if (attempt > 0 || !(e instanceof ApiError) || !isLostCart(e.code)) throw e;
          remember(null);
        }
      }
    },
    [ensureToken, remember],
  );

  const run = useCallback(async (job: () => Promise<Cart>): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      setCart(await job());
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? e.code : 'NETWORK');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const add = useCallback(
    async (input: AddToCartDetail, options: { openDrawer?: boolean } = {}) => {
      const current = cart?.items.find((i) => i.variantId === input.variantId)?.qty ?? 0;
      const done = await run(() => write(input.variantId, clampQty(current + input.qty)));
      if (done) {
        window.dispatchEvent(new CustomEvent(ADD_TO_CART_EVENT, { detail: input }));
        if (options.openDrawer !== false) setOpen(true);
      }
      return done;
    },
    [cart, run, write],
  );

  const setQty = useCallback(
    async (variantId: string, qty: number) => {
      await run(() => write(variantId, clampQty(qty)));
    },
    [run, write],
  );

  const cartToken = useCallback(() => tokenRef.current, []);
  const value = useMemo(
    () => ({ cart, cartToken, open, busy, error, setOpen, add, setQty, forget }),
    [cart, cartToken, open, busy, error, add, setQty, forget],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
