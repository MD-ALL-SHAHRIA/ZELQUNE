'use client';

import { skipToken } from '@reduxjs/toolkit/query';
import { useState } from 'react';
import { useCartQuery } from '@/store/api';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setCartOpen } from '@/store/slices/ui';
import { addToCart, type AddToCartInput, setLineQty } from './cart-thunks';

/** Cart state and actions for components; all logic lives in the thunks. */
export function useCart() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((s) => s.session.cartToken);
  const open = useAppSelector((s) => s.ui.cartOpen);
  const { data: cart } = useCartQuery(token ? { 'x-cart-token': token } : skipToken);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: ReturnType<typeof addToCart> | ReturnType<typeof setLineQty>) {
    setBusy(true);
    setError(null);
    const result = await dispatch(action);
    setBusy(false);
    if (result.meta.requestStatus === 'rejected') {
      setError((result.payload as string | undefined) ?? 'NETWORK');
      return false;
    }
    return true;
  }

  return {
    cart,
    token,
    open,
    busy,
    error,
    count: cart?.items.reduce((n, i) => n + i.qty, 0) ?? 0,
    setOpen: (value: boolean) => dispatch(setCartOpen(value)),
    add: (input: AddToCartInput) => run(addToCart(input)),
    setQty: (variantId: string, qty: number) => run(setLineQty({ variantId, qty })),
  };
}
