import { createAction } from '@reduxjs/toolkit';

/** Domain events components dispatch; tracking reacts to them in ./listeners.ts. */
export const productViewed = createAction<{
  productId: string;
  variantId?: string;
  pricePaisa?: number;
}>('analytics/productViewed');
export const checkoutStarted = createAction<{ valuePaisa: number }>('analytics/checkoutStarted');
export const orderPlaced = createAction<{ code: string; totalPaisa: number }>(
  'analytics/orderPlaced',
);
export const pageViewed = createAction<{ path: string }>('analytics/pageViewed');
