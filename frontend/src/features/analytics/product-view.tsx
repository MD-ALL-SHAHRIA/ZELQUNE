'use client';

import { useEffect } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { productViewed } from './events';

/** Reports one product view (VIEW beacon + Pixel ViewContent via the analytics listeners). */
export function ProductView(props: { productId: string; variantId?: string; pricePaisa?: number }) {
  const dispatch = useAppDispatch();
  const { productId, variantId, pricePaisa } = props;
  useEffect(() => {
    dispatch(productViewed({ productId, variantId, pricePaisa }));
  }, [dispatch, productId, variantId, pricePaisa]);
  return null;
}
