import { type BeaconEventDto } from '@/store/api/generated';
import { api } from '@/store/api';
import { listener } from '@/store/listeners';
import { visitor } from '@/shared/lib/visitor-client';
import { cartItemAdded } from '@/features/cart/cart-thunks';
import { pixel, toTaka } from './analytics';
import { checkoutStarted, orderPlaced, pageViewed, productViewed } from './events';

/**
 * Anonymous funnel events (VIEW, ADD_TO_CART -> analytics-service) and Meta Pixel events.
 * Only the random session id, price arm, path and UTM are sent (ADR 0010).
 */
export function registerAnalyticsListeners(): void {
  const beacon = (
    dispatch: (action: unknown) => unknown,
    type: BeaconEventDto['type'],
    ids: { productId?: string; variantId?: string },
  ) => {
    const { sessionId, p, utm } = visitor();
    if (!sessionId) return;
    void dispatch(
      api.endpoints.publicB2BControllerBeacon.initiate({
        beaconEventDto: {
          type,
          sessionId,
          ...ids,
          ...(p ? { p } : {}),
          path: location.pathname.slice(0, 300),
          ...(utm ? { utm } : {}),
        },
      }),
    );
  };

  listener.startListening({
    actionCreator: productViewed,
    effect: ({ payload }, { dispatch }) => {
      beacon(dispatch, 'VIEW', {
        productId: payload.productId,
        ...(payload.variantId ? { variantId: payload.variantId } : {}),
      });
      pixel('ViewContent', {
        content_ids: [payload.variantId ?? payload.productId],
        content_type: 'product',
        ...(payload.pricePaisa ? { value: toTaka(payload.pricePaisa), currency: 'BDT' } : {}),
      });
    },
  });

  listener.startListening({
    actionCreator: cartItemAdded,
    effect: ({ payload }, { dispatch }) => {
      beacon(dispatch, 'ADD_TO_CART', {
        productId: payload.productId,
        variantId: payload.variantId,
      });
      pixel('AddToCart', {
        content_ids: [payload.variantId],
        content_type: 'product',
        value: toTaka(payload.unitPricePaisa * payload.qty),
        currency: 'BDT',
      });
    },
  });

  listener.startListening({
    actionCreator: checkoutStarted,
    effect: ({ payload }) =>
      pixel('InitiateCheckout', { value: toTaka(payload.valuePaisa), currency: 'BDT' }),
  });

  listener.startListening({
    actionCreator: orderPlaced,
    effect: ({ payload }) =>
      pixel('Purchase', { value: toTaka(payload.totalPaisa), currency: 'BDT' }),
  });

  listener.startListening({ actionCreator: pageViewed, effect: () => pixel('PageView') });
}
