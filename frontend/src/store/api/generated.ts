import { baseApi as api } from './base';
const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
    catalogControllerCategories: build.query<
      CatalogControllerCategoriesApiResponse,
      CatalogControllerCategoriesApiArg
    >({
      query: () => ({ url: `/v1/catalog/categories` }),
    }),
    catalogControllerProducts: build.query<
      CatalogControllerProductsApiResponse,
      CatalogControllerProductsApiArg
    >({
      query: (queryArg) => ({
        url: `/v1/catalog/products`,
        params: {
          category: queryArg.category,
          saleMode: queryArg.saleMode,
          page: queryArg.page,
          limit: queryArg.limit,
          p: queryArg.p,
        },
      }),
    }),
    catalogControllerProduct: build.query<
      CatalogControllerProductApiResponse,
      CatalogControllerProductApiArg
    >({
      query: (queryArg) => ({
        url: `/v1/catalog/products/${queryArg.slug}`,
        params: {
          p: queryArg.p,
        },
      }),
    }),
    shopControllerDistricts: build.query<
      ShopControllerDistrictsApiResponse,
      ShopControllerDistrictsApiArg
    >({
      query: () => ({ url: `/v1/shipping/districts` }),
    }),
    shopControllerShippingEstimate: build.query<
      ShopControllerShippingEstimateApiResponse,
      ShopControllerShippingEstimateApiArg
    >({
      query: (queryArg) => ({
        url: `/v1/shipping/estimate`,
        params: {
          district: queryArg.district,
          variantId: queryArg.variantId,
          qty: queryArg.qty,
        },
      }),
    }),
    shopControllerCreateCart: build.mutation<
      ShopControllerCreateCartApiResponse,
      ShopControllerCreateCartApiArg
    >({
      query: (queryArg) => ({
        url: `/v1/carts`,
        method: 'POST',
        body: queryArg.createCartRequestDto,
      }),
    }),
    shopControllerCart: build.query<ShopControllerCartApiResponse, ShopControllerCartApiArg>({
      query: (queryArg) => ({
        url: `/v1/carts/current`,
        headers: {
          'x-cart-token': queryArg['x-cart-token'],
        },
      }),
    }),
    shopControllerSetItem: build.mutation<
      ShopControllerSetItemApiResponse,
      ShopControllerSetItemApiArg
    >({
      query: (queryArg) => ({
        url: `/v1/carts/current/items/${queryArg.variantId}`,
        method: 'PUT',
        body: queryArg.setCartItemDto,
        headers: {
          'x-cart-token': queryArg['x-cart-token'],
        },
      }),
    }),
    shopControllerRemoveItem: build.mutation<
      ShopControllerRemoveItemApiResponse,
      ShopControllerRemoveItemApiArg
    >({
      query: (queryArg) => ({
        url: `/v1/carts/current/items/${queryArg.variantId}`,
        method: 'DELETE',
        headers: {
          'x-cart-token': queryArg['x-cart-token'],
        },
      }),
    }),
    shopControllerQuote: build.mutation<ShopControllerQuoteApiResponse, ShopControllerQuoteApiArg>({
      query: (queryArg) => ({
        url: `/v1/carts/current/quote`,
        method: 'POST',
        body: queryArg.quoteRequestDto,
        headers: {
          'x-cart-token': queryArg['x-cart-token'],
        },
      }),
    }),
    shopControllerCheckout: build.mutation<
      ShopControllerCheckoutApiResponse,
      ShopControllerCheckoutApiArg
    >({
      query: (queryArg) => ({
        url: `/v1/checkout`,
        method: 'POST',
        body: queryArg.checkoutRequestDto,
        headers: {
          'idempotency-key': queryArg['idempotency-key'],
          'x-cart-token': queryArg['x-cart-token'],
          'cf-turnstile-response': queryArg['cf-turnstile-response'],
        },
      }),
    }),
    shopControllerTrack: build.query<ShopControllerTrackApiResponse, ShopControllerTrackApiArg>({
      query: (queryArg) => ({
        url: `/v1/orders/track`,
        params: {
          code: queryArg.code,
          phone: queryArg.phone,
        },
      }),
    }),
    publicB2BControllerRequest: build.mutation<
      PublicB2BControllerRequestApiResponse,
      PublicB2BControllerRequestApiArg
    >({
      query: (queryArg) => ({
        url: `/v1/quote-requests`,
        method: 'POST',
        body: queryArg.rfqRequestDto,
        headers: {
          'cf-turnstile-response': queryArg['cf-turnstile-response'],
        },
      }),
    }),
    publicB2BControllerTrack: build.query<
      PublicB2BControllerTrackApiResponse,
      PublicB2BControllerTrackApiArg
    >({
      query: (queryArg) => ({
        url: `/v1/quote-requests/track`,
        params: {
          code: queryArg.code,
          phone: queryArg.phone,
        },
      }),
    }),
    publicB2BControllerBeacon: build.mutation<
      PublicB2BControllerBeaconApiResponse,
      PublicB2BControllerBeaconApiArg
    >({
      query: (queryArg) => ({ url: `/v1/events`, method: 'POST', body: queryArg.beaconEventDto }),
    }),
  }),
  overrideExisting: false,
});
export { injectedRtkApi as gatewayApi };
export type CatalogControllerCategoriesApiResponse =
  /** status 200  */ CategoryListResponseDtoOutput;
export type CatalogControllerCategoriesApiArg = void;
export type CatalogControllerProductsApiResponse = /** status 200  */ ProductListResponseDtoOutput;
export type CatalogControllerProductsApiArg = {
  category?: string;
  saleMode?: 'IN_STOCK' | 'MADE_TO_ORDER' | 'PRE_ORDER';
  page?: number;
  limit?: number;
  p?: string;
};
export type CatalogControllerProductApiResponse = /** status 200  */ ProductDetailDtoOutput;
export type CatalogControllerProductApiArg = {
  slug: string;
  p?: string;
};
export type ShopControllerDistrictsApiResponse = /** status 200  */ DistrictListDtoOutput;
export type ShopControllerDistrictsApiArg = void;
export type ShopControllerShippingEstimateApiResponse =
  /** status 200  */ ShippingEstimateDtoOutput;
export type ShopControllerShippingEstimateApiArg = {
  district: string;
  variantId: string;
  qty?: number;
};
export type ShopControllerCreateCartApiResponse = /** status 201  */ CreateCartResponseDtoOutput;
export type ShopControllerCreateCartApiArg = {
  createCartRequestDto: CreateCartRequestDto;
};
export type ShopControllerCartApiResponse = /** status 200  */ CartDtoOutput;
export type ShopControllerCartApiArg = {
  /** Guest cart token from POST /v1/carts */
  'x-cart-token': string;
};
export type ShopControllerSetItemApiResponse = /** status 200  */ CartDtoOutput;
export type ShopControllerSetItemApiArg = {
  variantId: string;
  /** Guest cart token from POST /v1/carts */
  'x-cart-token': string;
  setCartItemDto: SetCartItemDto;
};
export type ShopControllerRemoveItemApiResponse = /** status 200  */ CartDtoOutput;
export type ShopControllerRemoveItemApiArg = {
  variantId: string;
  /** Guest cart token from POST /v1/carts */
  'x-cart-token': string;
};
export type ShopControllerQuoteApiResponse = /** status 200  */ CheckoutQuoteDtoOutput;
export type ShopControllerQuoteApiArg = {
  /** Guest cart token from POST /v1/carts */
  'x-cart-token': string;
  quoteRequestDto: QuoteRequestDto;
};
export type ShopControllerCheckoutApiResponse = /** status 201  */ CheckoutResponseDtoOutput;
export type ShopControllerCheckoutApiArg = {
  /** Unique per checkout attempt (8-128 chars) */
  'idempotency-key': string;
  /** Guest cart token from POST /v1/carts */
  'x-cart-token': string;
  /** Cloudflare Turnstile token */
  'cf-turnstile-response': string;
  checkoutRequestDto: CheckoutRequestDto;
};
export type ShopControllerTrackApiResponse = /** status 200  */ OrderTrackingDtoOutput;
export type ShopControllerTrackApiArg = {
  code: string;
  phone: string;
};
export type PublicB2BControllerRequestApiResponse = /** status 201  */ RfqResponseDtoOutput;
export type PublicB2BControllerRequestApiArg = {
  /** Cloudflare Turnstile token */
  'cf-turnstile-response': string;
  rfqRequestDto: RfqRequestDto;
};
export type PublicB2BControllerTrackApiResponse = /** status 200  */ PublicQuoteDtoOutput;
export type PublicB2BControllerTrackApiArg = {
  code: string;
  phone: string;
};
export type PublicB2BControllerBeaconApiResponse = unknown;
export type PublicB2BControllerBeaconApiArg = {
  beaconEventDto: BeaconEventDto;
};
export type CategoryListResponseDtoOutput = {
  items: {
    id: string;
    parentId: string | null;
    slug: string;
    nameBn: string;
    nameEn: string;
    position: number;
  }[];
};
export type ProductListResponseDtoOutput = {
  items: {
    id: string;
    slug: string;
    nameBn: string;
    nameEn: string;
    saleMode: 'IN_STOCK' | 'MADE_TO_ORDER' | 'PRE_ORDER';
    leadTimeDays: number | null;
    fromPrice: {
      amountPaisa: number;
      compareAtPaisa: number | null;
      currency: 'BDT';
      experimentKey: ('a' | 'b' | null) | null;
    } | null;
    primaryMedia: {
      id: string;
      url: string;
      mimeType: string;
      altBn: string | null;
      altEn: string | null;
      position: number;
      variantId: string | null;
    } | null;
  }[];
  page: number;
  limit: number;
  total: number;
};
export type ProductDetailDtoOutput = {
  id: string;
  slug: string;
  nameBn: string;
  nameEn: string;
  saleMode: 'IN_STOCK' | 'MADE_TO_ORDER' | 'PRE_ORDER';
  leadTimeDays: number | null;
  fromPrice: {
    amountPaisa: number;
    compareAtPaisa: number | null;
    currency: 'BDT';
    experimentKey: ('a' | 'b' | null) | null;
  } | null;
  primaryMedia: {
    id: string;
    url: string;
    mimeType: string;
    altBn: string | null;
    altEn: string | null;
    position: number;
    variantId: string | null;
  } | null;
  descriptionBn: string | null;
  descriptionEn: string | null;
  seo: {
    titleBn: string | null;
    titleEn: string | null;
    descriptionBn: string | null;
    descriptionEn: string | null;
  };
  categories: {
    id: string;
    slug: string;
    nameBn: string;
    nameEn: string;
  }[];
  variants: {
    id: string;
    sku: string;
    options: {
      [key: string]: string;
    };
    weightGrams: number | null;
    dimensions: {
      widthMm: number | null;
      heightMm: number | null;
      depthMm: number | null;
    };
    position: number;
    price: {
      amountPaisa: number;
      compareAtPaisa: number | null;
      currency: 'BDT';
      experimentKey: ('a' | 'b' | null) | null;
    } | null;
  }[];
  media: {
    id: string;
    url: string;
    mimeType: string;
    altBn: string | null;
    altEn: string | null;
    position: number;
    variantId: string | null;
  }[];
};
export type DistrictListDtoOutput = {
  items: {
    code: string;
    nameBn: string;
    nameEn: string;
    division: string;
  }[];
};
export type ShippingEstimateDtoOutput = {
  district: string;
  zone: 'DHAKA' | 'SUBURB' | 'OUTSIDE';
  chargeableWeightGrams: number;
  feePaisa: number;
};
export type CreateCartResponseDtoOutput = {
  cartToken: string;
  cart: {
    id: string;
    items: {
      variantId: string;
      qty: number;
      sku: string | null;
      productSlug: string | null;
      nameBn: string | null;
      nameEn: string | null;
      options: {
        [key: string]: string;
      };
      saleMode: ('IN_STOCK' | 'MADE_TO_ORDER' | 'PRE_ORDER' | null) | null;
      unitPrice: {
        amountPaisa: number;
        compareAtPaisa: number | null;
        currency: 'BDT';
        experimentKey: ('a' | 'b' | null) | null;
      } | null;
      lineTotalPaisa: number | null;
      available: boolean;
    }[];
    subtotalPaisa: number;
    saleMode: ('IN_STOCK' | 'MADE_TO_ORDER' | 'PRE_ORDER' | null) | null;
    mixedSaleModes: boolean;
    experimentKey: ('a' | 'b' | null) | null;
  };
};
export type CreateCartRequestDto = {
  p?: string;
};
export type CartDtoOutput = {
  id: string;
  items: {
    variantId: string;
    qty: number;
    sku: string | null;
    productSlug: string | null;
    nameBn: string | null;
    nameEn: string | null;
    options: {
      [key: string]: string;
    };
    saleMode: ('IN_STOCK' | 'MADE_TO_ORDER' | 'PRE_ORDER' | null) | null;
    unitPrice: {
      amountPaisa: number;
      compareAtPaisa: number | null;
      currency: 'BDT';
      experimentKey: ('a' | 'b' | null) | null;
    } | null;
    lineTotalPaisa: number | null;
    available: boolean;
  }[];
  subtotalPaisa: number;
  saleMode: ('IN_STOCK' | 'MADE_TO_ORDER' | 'PRE_ORDER' | null) | null;
  mixedSaleModes: boolean;
  experimentKey: ('a' | 'b' | null) | null;
};
export type SetCartItemDto = {
  qty: number;
};
export type CheckoutQuoteDtoOutput = {
  saleMode: 'IN_STOCK' | 'MADE_TO_ORDER' | 'PRE_ORDER';
  subtotalPaisa: number;
  shippingFeePaisa: number;
  totalPaisa: number;
  advanceRequiredPaisa: number;
  zone: 'DHAKA' | 'SUBURB' | 'OUTSIDE';
  chargeableWeightGrams: number;
  allowedPaymentMethods: ('COD' | 'BKASH_MANUAL' | 'NAGAD_MANUAL')[];
  paymentInstructions: {
    bkash: {
      number: string;
      accountType: string;
    } | null;
    nagad: {
      number: string;
      accountType: string;
    } | null;
  };
};
export type QuoteRequestDto = {
  district: string;
  area: string;
};
export type CheckoutResponseDtoOutput = {
  orderCode: string;
  status:
    | 'PENDING_PAYMENT'
    | 'CONFIRMED'
    | 'IN_PRODUCTION'
    | 'READY_TO_SHIP'
    | 'SHIPPED'
    | 'DELIVERED'
    | 'CANCELLED'
    | 'RETURN_REQUESTED'
    | 'RETURNED'
    | 'REFUNDED';
  saleMode: 'IN_STOCK' | 'MADE_TO_ORDER' | 'PRE_ORDER';
  totals: {
    subtotalPaisa: number;
    discountPaisa: number;
    shippingFeePaisa: number;
    totalPaisa: number;
    advanceRequiredPaisa: number;
  };
  payment: {
    id: string;
    method: 'COD' | 'BKASH_MANUAL' | 'NAGAD_MANUAL';
    kind: 'ADVANCE' | 'FULL' | 'COD';
    status:
      | 'SUBMITTED'
      | 'VERIFIED'
      | 'REJECTED'
      | 'COD_PENDING'
      | 'COD_CONFIRMED'
      | 'COLLECTED'
      | 'VOID';
    amountPaisa: number;
    trxIdLast4: string | null;
  } | null;
};
export type CheckoutRequestDto = {
  customer: {
    name: string;
    phone: string;
  };
  address: {
    district: string;
    area: string;
    line: string;
    note?: string | null;
  };
  paymentMethod: 'COD' | 'BKASH_MANUAL' | 'NAGAD_MANUAL';
  trxId?: string | null;
  payerPhone?: string | null;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  };
  sessionId?: string;
};
export type OrderTrackingDtoOutput = {
  code: string;
  status:
    | 'PENDING_PAYMENT'
    | 'CONFIRMED'
    | 'IN_PRODUCTION'
    | 'READY_TO_SHIP'
    | 'SHIPPED'
    | 'DELIVERED'
    | 'CANCELLED'
    | 'RETURN_REQUESTED'
    | 'RETURNED'
    | 'REFUNDED';
  saleMode: 'IN_STOCK' | 'MADE_TO_ORDER' | 'PRE_ORDER';
  placedAt: string;
  items: {
    sku: string;
    nameBn: string;
    nameEn: string;
    options: {
      [key: string]: string;
    };
    qty: number;
    unitPricePaisa: number;
    lineTotalPaisa: number;
  }[];
  totals: {
    subtotalPaisa: number;
    discountPaisa: number;
    shippingFeePaisa: number;
    totalPaisa: number;
    advanceRequiredPaisa: number;
  };
  history: {
    status:
      | 'PENDING_PAYMENT'
      | 'CONFIRMED'
      | 'IN_PRODUCTION'
      | 'READY_TO_SHIP'
      | 'SHIPPED'
      | 'DELIVERED'
      | 'CANCELLED'
      | 'RETURN_REQUESTED'
      | 'RETURNED'
      | 'REFUNDED';
    at: string;
  }[];
  payment: {
    id: string;
    method: 'COD' | 'BKASH_MANUAL' | 'NAGAD_MANUAL';
    kind: 'ADVANCE' | 'FULL' | 'COD';
    status:
      | 'SUBMITTED'
      | 'VERIFIED'
      | 'REJECTED'
      | 'COD_PENDING'
      | 'COD_CONFIRMED'
      | 'COLLECTED'
      | 'VOID';
    amountPaisa: number;
    trxIdLast4: string | null;
  } | null;
  shipment: {
    courier: 'MANUAL' | 'STEADFAST' | 'PAPERFLY' | 'PATHAO';
    status:
      'PENDING' | 'BOOKED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'RETURNED' | 'CANCELLED';
    consignmentId: string | null;
    trackingUrl: string | null;
  } | null;
};
export type RfqResponseDtoOutput = {
  quoteCode: string;
  status: 'NEW' | 'QUOTED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
};
export type RfqRequestDto = {
  kind?: 'PRODUCT' | 'DESIGN' | 'CONSTRUCTION';
  organizationName?: string | null;
  contactName: string;
  phone: string;
  email?: string | null;
  items?: {
    productSlug?: string | null;
    variantId?: string | null;
    description: string;
    qty: number;
  }[];
  design?: {
    spaceType: 'HOME' | 'OFFICE' | 'RESTAURANT_CAFE' | 'HOTEL' | 'RETAIL' | 'OTHER';
    sizeSqft?: number | null;
    district?: string | null;
    budget?:
      | 'UNDER_1_LAKH'
      | 'LAKH_1_TO_5'
      | 'LAKH_5_TO_15'
      | 'ABOVE_15_LAKH'
      | 'UNDER_50_LAKH'
      | 'LAKH_50_TO_1_CRORE'
      | 'CRORE_1_TO_3'
      | 'ABOVE_3_CRORE'
      | 'NOT_SURE';
    floors?: number | null;
  } | null;
  neededBy?: string | null;
  customizationNotes?: string | null;
  notes?: string | null;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  };
};
export type PublicQuoteDtoOutput = {
  code: string;
  kind: 'PRODUCT' | 'DESIGN' | 'CONSTRUCTION';
  design: {
    spaceType: 'HOME' | 'OFFICE' | 'RESTAURANT_CAFE' | 'HOTEL' | 'RETAIL' | 'OTHER';
    sizeSqft: number | null;
    district: string | null;
    budget:
      | 'UNDER_1_LAKH'
      | 'LAKH_1_TO_5'
      | 'LAKH_5_TO_15'
      | 'ABOVE_15_LAKH'
      | 'UNDER_50_LAKH'
      | 'LAKH_50_TO_1_CRORE'
      | 'CRORE_1_TO_3'
      | 'ABOVE_3_CRORE'
      | 'NOT_SURE';
    floors: number | null;
  } | null;
  status: 'NEW' | 'QUOTED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  organizationName: string | null;
  neededBy: string | null;
  validUntil: string | null;
  lines: {
    id: string;
    description: string;
    qty: number;
    unitPricePaisa: number | null;
    lineTotalPaisa: number | null;
  }[];
  totals: {
    subtotalPaisa: number;
    shippingFeePaisa: number;
    totalPaisa: number;
    advanceRequiredPaisa: number;
  } | null;
  orderCode: string | null;
};
export type BeaconEventDto = {
  type: 'VIEW' | 'ADD_TO_CART';
  sessionId: string;
  productId?: string;
  variantId?: string;
  p?: string;
  path?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  };
};
export const {
  useCatalogControllerCategoriesQuery,
  useLazyCatalogControllerCategoriesQuery,
  useCatalogControllerProductsQuery,
  useLazyCatalogControllerProductsQuery,
  useCatalogControllerProductQuery,
  useLazyCatalogControllerProductQuery,
  useShopControllerDistrictsQuery,
  useLazyShopControllerDistrictsQuery,
  useShopControllerShippingEstimateQuery,
  useLazyShopControllerShippingEstimateQuery,
  useShopControllerCreateCartMutation,
  useShopControllerCartQuery,
  useLazyShopControllerCartQuery,
  useShopControllerSetItemMutation,
  useShopControllerRemoveItemMutation,
  useShopControllerQuoteMutation,
  useShopControllerCheckoutMutation,
  useShopControllerTrackQuery,
  useLazyShopControllerTrackQuery,
  usePublicB2BControllerRequestMutation,
  usePublicB2BControllerTrackQuery,
  useLazyPublicB2BControllerTrackQuery,
  usePublicB2BControllerBeaconMutation,
} = injectedRtkApi;
