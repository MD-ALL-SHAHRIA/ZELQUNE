'use client';

import { useEffect } from 'react';
import { pixel, sendEvent, toTaka } from '@/lib/analytics';

/** VIEW beacon + Pixel ViewContent once per product page view. */
export function ProductView({
  productId,
  variantId,
  pricePaisa,
}: {
  productId: string;
  variantId?: string;
  pricePaisa?: number;
}) {
  useEffect(() => {
    sendEvent('VIEW', { productId, ...(variantId ? { variantId } : {}) });
    pixel('ViewContent', {
      content_ids: [variantId ?? productId],
      content_type: 'product',
      ...(pricePaisa ? { value: toTaka(pricePaisa), currency: 'BDT' } : {}),
    });
  }, [productId, variantId, pricePaisa]);
  return null;
}
