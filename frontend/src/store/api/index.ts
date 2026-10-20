import { gatewayApi } from './generated';

/**
 * Generated gateway endpoints with cache behaviour added: the cart query is the single source of
 * the cart; mutations that return the new cart write it straight into that cache entry instead
 * of refetching (see features/cart/cart-thunks.ts).
 */
export const api = gatewayApi.enhanceEndpoints({
  addTagTypes: ['Cart'],
  endpoints: {
    shopControllerCart: { providesTags: ['Cart'] },
    shopControllerCheckout: { invalidatesTags: ['Cart'] },
  },
});

export const {
  useShopControllerCartQuery: useCartQuery,
  useLazyShopControllerShippingEstimateQuery: useLazyShippingEstimateQuery,
  useShopControllerQuoteMutation: useCheckoutQuoteMutation,
  useShopControllerCheckoutMutation: useCheckoutMutation,
  useLazyShopControllerTrackQuery: useLazyTrackOrderQuery,
  usePublicB2BControllerRequestMutation: useRequestQuoteMutation,
  useLazyPublicB2BControllerTrackQuery: useLazyTrackQuoteQuery,
} = api;
