import { createAction } from '@reduxjs/toolkit';
import { toApiError } from '@/shared/api/errors';
import { type Cart } from '@/shared/api/types';
import { visitor } from '@/shared/lib/visitor-client';
import { api } from '@/store/api';
import { cartTokenChanged } from '@/store/slices/session';
import { setCartOpen } from '@/store/slices/ui';
import type { AppDispatch, RootState } from '@/store/store';
import { createAppThunk } from '@/store/thunk';
import { clampQty, isLostCart } from './cart-rules';

export interface AddToCartInput {
  productId: string;
  variantId: string;
  qty: number;
  unitPricePaisa: number;
  /** "Pre-order now" goes straight to checkout instead of opening the drawer. */
  openDrawer?: boolean;
}

/** Fired after a successful add; analytics listens to it (features/analytics/listeners.ts). */
export const cartItemAdded = createAction<AddToCartInput>('cart/itemAdded');

const cartArg = (token: string) => ({ 'x-cart-token': token });

export function selectCart(state: RootState): Cart | undefined {
  const token = state.session.cartToken;
  return token ? api.endpoints.shopControllerCart.select(cartArg(token))(state).data : undefined;
}

async function ensureToken(dispatch: AppDispatch, getState: () => RootState): Promise<string> {
  const existing = getState().session.cartToken;
  if (existing) return existing;
  const { p } = visitor();
  // The price arm travels on the cart, so checkout charges the price the visitor saw.
  const created = await dispatch(
    api.endpoints.shopControllerCreateCart.initiate({ createCartRequestDto: p ? { p } : {} }),
  ).unwrap();
  dispatch(cartTokenChanged(created.cartToken));
  dispatch(
    api.util.upsertQueryData('shopControllerCart', cartArg(created.cartToken), created.cart),
  );
  return created.cartToken;
}

/** Sets one line's quantity (0 removes it); replaces a lost or checked-out cart once. */
async function writeLine(
  dispatch: AppDispatch,
  getState: () => RootState,
  variantId: string,
  qty: number,
): Promise<Cart> {
  for (let attempt = 0; ; attempt++) {
    const token = await ensureToken(dispatch, getState);
    try {
      const cart =
        qty === 0
          ? await dispatch(
              api.endpoints.shopControllerRemoveItem.initiate({ variantId, ...cartArg(token) }),
            ).unwrap()
          : await dispatch(
              api.endpoints.shopControllerSetItem.initiate({
                variantId,
                ...cartArg(token),
                setCartItemDto: { qty },
              }),
            ).unwrap();
      dispatch(api.util.upsertQueryData('shopControllerCart', cartArg(token), cart));
      return cart;
    } catch (error) {
      const apiError = toApiError(error);
      if (attempt > 0 || !isLostCart(apiError.code)) throw apiError;
      dispatch(cartTokenChanged(null));
    }
  }
}

export const addToCart = createAppThunk(
  'cart/add',
  async (input: AddToCartInput, { dispatch, getState, rejectWithValue }) => {
    const current = selectCart(getState())?.items.find((i) => i.variantId === input.variantId);
    try {
      await writeLine(
        dispatch,
        getState,
        input.variantId,
        clampQty((current?.qty ?? 0) + input.qty),
      );
    } catch (error) {
      return rejectWithValue(toApiError(error).code);
    }
    dispatch(cartItemAdded(input));
    if (input.openDrawer !== false) dispatch(setCartOpen(true));
  },
);

export const setLineQty = createAppThunk(
  'cart/setQty',
  async (input: { variantId: string; qty: number }, { dispatch, getState, rejectWithValue }) => {
    try {
      await writeLine(dispatch, getState, input.variantId, clampQty(input.qty));
    } catch (error) {
      return rejectWithValue(toApiError(error).code);
    }
  },
);

/** After checkout the server closes the cart; start fresh next time. */
export const forgetCart = () => cartTokenChanged(null);
