import { createListenerMiddleware } from '@reduxjs/toolkit';
import { CART_COOKIE_MAX_AGE } from '@/features/cart/cart-rules';
import { deleteCookie, writeCookie } from '@/shared/lib/cookies';
import { COOKIE } from '@/shared/lib/visitor';
import { cartTokenChanged } from './slices/session';

/**
 * Side effects live here, not in components: persisting the cart token, and the analytics /
 * Pixel listeners registered by features/analytics.
 */
export const listener = createListenerMiddleware();

listener.startListening({
  actionCreator: cartTokenChanged,
  effect: ({ payload }) => {
    if (payload) writeCookie(COOKIE.cart, payload, CART_COOKIE_MAX_AGE);
    else deleteCookie(COOKIE.cart);
  },
});
