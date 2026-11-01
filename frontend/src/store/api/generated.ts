import { baseApi as api } from './base';
const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
    customerAuthControllerProviders: build.query<
      CustomerAuthControllerProvidersApiResponse,
      CustomerAuthControllerProvidersApiArg
    >({
      query: () => ({ url: `/v1/auth/providers` }),
    }),
    customerAuthControllerRegister: build.mutation<
      CustomerAuthControllerRegisterApiResponse,
      CustomerAuthControllerRegisterApiArg
    >({
      query: (queryArg) => ({
        url: `/v1/auth/register`,
        method: 'POST',
        body: queryArg.registerDto,
        headers: {
          'cf-turnstile-response': queryArg['cf-turnstile-response'],
        },
      }),
    }),
    customerAuthControllerLogin: build.mutation<
      CustomerAuthControllerLoginApiResponse,
      CustomerAuthControllerLoginApiArg
    >({
      query: (queryArg) => ({ url: `/v1/auth/login`, method: 'POST', body: queryArg.loginDto }),
    }),
    customerAuthControllerRefresh: build.mutation<
      CustomerAuthControllerRefreshApiResponse,
      CustomerAuthControllerRefreshApiArg
    >({
      query: () => ({ url: `/v1/auth/refresh`, method: 'POST' }),
    }),
    customerAuthControllerLogout: build.mutation<
      CustomerAuthControllerLogoutApiResponse,
      CustomerAuthControllerLogoutApiArg
    >({
      query: () => ({ url: `/v1/auth/logout`, method: 'POST' }),
    }),
    customerAuthControllerVerifyEmail: build.mutation<
      CustomerAuthControllerVerifyEmailApiResponse,
      CustomerAuthControllerVerifyEmailApiArg
    >({
      query: (queryArg) => ({
        url: `/v1/auth/verify-email`,
        method: 'POST',
        body: queryArg.tokenDto,
      }),
    }),
    customerAuthControllerResend: build.mutation<
      CustomerAuthControllerResendApiResponse,
      CustomerAuthControllerResendApiArg
    >({
      query: (queryArg) => ({
        url: `/v1/auth/resend-verification`,
        method: 'POST',
        body: queryArg.emailDto,
      }),
    }),
    customerAuthControllerForgot: build.mutation<
      CustomerAuthControllerForgotApiResponse,
      CustomerAuthControllerForgotApiArg
    >({
      query: (queryArg) => ({
        url: `/v1/auth/forgot-password`,
        method: 'POST',
        body: queryArg.emailDto,
        headers: {
          'cf-turnstile-response': queryArg['cf-turnstile-response'],
        },
      }),
    }),
    customerAuthControllerReset: build.mutation<
      CustomerAuthControllerResetApiResponse,
      CustomerAuthControllerResetApiArg
    >({
      query: (queryArg) => ({
        url: `/v1/auth/reset-password`,
        method: 'POST',
        body: queryArg.resetDto,
      }),
    }),
    customerAuthControllerPendingProfile: build.query<
      CustomerAuthControllerPendingProfileApiResponse,
      CustomerAuthControllerPendingProfileApiArg
    >({
      query: () => ({ url: `/v1/auth/oauth/pending` }),
    }),
    customerAuthControllerComplete: build.mutation<
      CustomerAuthControllerCompleteApiResponse,
      CustomerAuthControllerCompleteApiArg
    >({
      query: (queryArg) => ({
        url: `/v1/auth/oauth/complete`,
        method: 'POST',
        body: queryArg.completeSignupDto,
      }),
    }),
    customerAuthControllerMe: build.query<
      CustomerAuthControllerMeApiResponse,
      CustomerAuthControllerMeApiArg
    >({
      query: () => ({ url: `/v1/auth/me` }),
    }),
    customerAuthControllerUpdateProfile: build.mutation<
      CustomerAuthControllerUpdateProfileApiResponse,
      CustomerAuthControllerUpdateProfileApiArg
    >({
      query: (queryArg) => ({ url: `/v1/auth/me`, method: 'PUT', body: queryArg.profileDto }),
    }),
    customerAuthControllerChangePassword: build.mutation<
      CustomerAuthControllerChangePasswordApiResponse,
      CustomerAuthControllerChangePasswordApiArg
    >({
      query: (queryArg) => ({
        url: `/v1/auth/change-password`,
        method: 'POST',
        body: queryArg.changePasswordDto,
      }),
    }),
    customerAuthControllerSessions: build.query<
      CustomerAuthControllerSessionsApiResponse,
      CustomerAuthControllerSessionsApiArg
    >({
      query: () => ({ url: `/v1/auth/sessions` }),
    }),
    customerAuthControllerRevokeSession: build.mutation<
      CustomerAuthControllerRevokeSessionApiResponse,
      CustomerAuthControllerRevokeSessionApiArg
    >({
      query: (queryArg) => ({ url: `/v1/auth/sessions/${queryArg.id}`, method: 'DELETE' }),
    }),
    customerAuthControllerRevokeOthers: build.mutation<
      CustomerAuthControllerRevokeOthersApiResponse,
      CustomerAuthControllerRevokeOthersApiArg
    >({
      query: () => ({ url: `/v1/auth/sessions/revoke-others`, method: 'POST' }),
    }),
    catalogControllerCategories: build.query<
      CatalogControllerCategoriesApiResponse,
      CatalogControllerCategoriesApiArg
    >({
      query: () => ({ url: `/v1/catalog/categories` }),
    }),
    catalogControllerSale: build.query<
      CatalogControllerSaleApiResponse,
      CatalogControllerSaleApiArg
    >({
      query: () => ({ url: `/v1/catalog/sale` }),
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
    contentControllerHome: build.query<
      ContentControllerHomeApiResponse,
      ContentControllerHomeApiArg
    >({
      query: () => ({ url: `/v1/content/home` }),
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
    shopControllerTrack: build.mutation<ShopControllerTrackApiResponse, ShopControllerTrackApiArg>({
      query: (queryArg) => ({
        url: `/v1/orders/track`,
        method: 'POST',
        body: queryArg.trackQueryDto,
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
    publicB2BControllerTrack: build.mutation<
      PublicB2BControllerTrackApiResponse,
      PublicB2BControllerTrackApiArg
    >({
      query: (queryArg) => ({
        url: `/v1/quote-requests/track`,
        method: 'POST',
        body: queryArg.quoteTrackQueryDto,
      }),
    }),
    publicB2BControllerPrivacyRequest: build.mutation<
      PublicB2BControllerPrivacyRequestApiResponse,
      PublicB2BControllerPrivacyRequestApiArg
    >({
      query: (queryArg) => ({
        url: `/v1/privacy-requests`,
        method: 'POST',
        body: queryArg.submitPrivacyRequestDto,
        headers: {
          'cf-turnstile-response': queryArg['cf-turnstile-response'],
        },
      }),
    }),
    publicB2BControllerPrivacyTrack: build.mutation<
      PublicB2BControllerPrivacyTrackApiResponse,
      PublicB2BControllerPrivacyTrackApiArg
    >({
      query: (queryArg) => ({
        url: `/v1/privacy-requests/track`,
        method: 'POST',
        body: queryArg.privacyTrackDto,
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
export type CustomerAuthControllerProvidersApiResponse = /** status 200  */ ProvidersDtoOutput;
export type CustomerAuthControllerProvidersApiArg = void;
export type CustomerAuthControllerRegisterApiResponse = /** status 202  */ AcceptedDtoOutput;
export type CustomerAuthControllerRegisterApiArg = {
  /** Cloudflare Turnstile token */
  'cf-turnstile-response': string;
  registerDto: RegisterDto;
};
export type CustomerAuthControllerLoginApiResponse = /** status 200  */ CustomerTokenDtoOutput;
export type CustomerAuthControllerLoginApiArg = {
  loginDto: LoginDto;
};
export type CustomerAuthControllerRefreshApiResponse = /** status 200  */ CustomerTokenDtoOutput;
export type CustomerAuthControllerRefreshApiArg = void;
export type CustomerAuthControllerLogoutApiResponse = unknown;
export type CustomerAuthControllerLogoutApiArg = void;
export type CustomerAuthControllerVerifyEmailApiResponse =
  /** status 200  */ CustomerTokenDtoOutput;
export type CustomerAuthControllerVerifyEmailApiArg = {
  tokenDto: TokenDto;
};
export type CustomerAuthControllerResendApiResponse = /** status 202  */ AcceptedDtoOutput;
export type CustomerAuthControllerResendApiArg = {
  emailDto: EmailDto;
};
export type CustomerAuthControllerForgotApiResponse = /** status 202  */ AcceptedDtoOutput;
export type CustomerAuthControllerForgotApiArg = {
  /** Cloudflare Turnstile token */
  'cf-turnstile-response': string;
  emailDto: EmailDto;
};
export type CustomerAuthControllerResetApiResponse = /** status 200  */ OkDtoOutput;
export type CustomerAuthControllerResetApiArg = {
  resetDto: ResetDto;
};
export type CustomerAuthControllerPendingProfileApiResponse = /** status 200  */ PendingDtoOutput;
export type CustomerAuthControllerPendingProfileApiArg = void;
export type CustomerAuthControllerCompleteApiResponse = /** status 200  */ CustomerTokenDtoOutput;
export type CustomerAuthControllerCompleteApiArg = {
  completeSignupDto: CompleteSignupDto;
};
export type CustomerAuthControllerMeApiResponse = /** status 200  */ CustomerDtoOutput;
export type CustomerAuthControllerMeApiArg = void;
export type CustomerAuthControllerUpdateProfileApiResponse = /** status 200  */ CustomerDtoOutput;
export type CustomerAuthControllerUpdateProfileApiArg = {
  profileDto: ProfileDto;
};
export type CustomerAuthControllerChangePasswordApiResponse = /** status 200  */ OkDtoOutput;
export type CustomerAuthControllerChangePasswordApiArg = {
  changePasswordDto: ChangePasswordDto;
};
export type CustomerAuthControllerSessionsApiResponse = /** status 200  */ SessionListDtoOutput;
export type CustomerAuthControllerSessionsApiArg = void;
export type CustomerAuthControllerRevokeSessionApiResponse = /** status 200  */ OkDtoOutput;
export type CustomerAuthControllerRevokeSessionApiArg = {
  id: string;
};
export type CustomerAuthControllerRevokeOthersApiResponse = /** status 200  */ OkDtoOutput;
export type CustomerAuthControllerRevokeOthersApiArg = void;
export type CatalogControllerCategoriesApiResponse =
  /** status 200  */ CategoryListResponseDtoOutput;
export type CatalogControllerCategoriesApiArg = void;
export type CatalogControllerSaleApiResponse = /** status 200  */ ActiveSaleDtoOutput;
export type CatalogControllerSaleApiArg = void;
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
export type ContentControllerHomeApiResponse = /** status 200  */ HomeContentResponseDtoOutput;
export type ContentControllerHomeApiArg = void;
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
  trackQueryDto: TrackQueryDto;
};
export type PublicB2BControllerRequestApiResponse = /** status 201  */ RfqResponseDtoOutput;
export type PublicB2BControllerRequestApiArg = {
  /** Cloudflare Turnstile token */
  'cf-turnstile-response': string;
  rfqRequestDto: RfqRequestDto;
};
export type PublicB2BControllerTrackApiResponse = /** status 200  */ PublicQuoteDtoOutput;
export type PublicB2BControllerTrackApiArg = {
  quoteTrackQueryDto: QuoteTrackQueryDto;
};
export type PublicB2BControllerPrivacyRequestApiResponse =
  /** status 201  */ SubmitPrivacyResultDtoOutput;
export type PublicB2BControllerPrivacyRequestApiArg = {
  /** Cloudflare Turnstile token */
  'cf-turnstile-response': string;
  submitPrivacyRequestDto: SubmitPrivacyRequestDto;
};
export type PublicB2BControllerPrivacyTrackApiResponse =
  /** status 200  */ PublicPrivacyRequestDtoOutput;
export type PublicB2BControllerPrivacyTrackApiArg = {
  privacyTrackDto: PrivacyTrackDto;
};
export type PublicB2BControllerBeaconApiResponse = unknown;
export type PublicB2BControllerBeaconApiArg = {
  beaconEventDto: BeaconEventDto;
};
export type ProvidersDtoOutput = {
  providers: ('GOOGLE' | 'FACEBOOK')[];
};
export type AcceptedDtoOutput = {
  accepted: true;
};
export type RegisterDto = {
  name: string;
  email: string;
  phone: string;
  password: string;
  lang?: 'en' | 'bn';
};
export type CustomerTokenDtoOutput = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: {
    id: string;
    phone: string;
    name: string | null;
    email: string | null;
    role: 'CUSTOMER' | 'STAFF' | 'OWNER';
  };
};
export type LoginDto = {
  email: string;
  password: string;
};
export type TokenDto = {
  token: string;
};
export type EmailDto = {
  email: string;
  lang?: 'en' | 'bn';
};
export type OkDtoOutput = {
  ok: true;
};
export type ResetDto = {
  token: string;
  password: string;
};
export type PendingDtoOutput = {
  email: string;
  name: string | null;
  provider: 'GOOGLE' | 'FACEBOOK';
};
export type CompleteSignupDto = {
  name: string;
  phone: string;
};
export type CustomerDtoOutput = {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: boolean;
  phone: string;
  hasPassword: boolean;
  providers: ('GOOGLE' | 'FACEBOOK')[];
  createdAt: string;
};
export type ProfileDto = {
  name: string;
  phone: string;
};
export type ChangePasswordDto = {
  currentPassword: string;
  newPassword: string;
};
export type SessionListDtoOutput = {
  items: {
    id: string;
    userAgent: string | null;
    ip: string | null;
    createdAt: string;
    lastUsedAt: string;
    current: boolean;
  }[];
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
export type ActiveSaleDtoOutput = {
  sale: {
    id: string;
    nameEn: string;
    nameBn: string;
    kind: 'PERCENT' | 'FIXED';
    value: number;
    endsAt: string;
    flash: boolean;
    productIds: string[];
  } | null;
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
      sale?: {
        promotionId: string;
        nameEn: string;
        nameBn: string;
        endsAt: string;
        flash: boolean;
        regularPaisa: number;
      } | null;
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
    sale?: {
      promotionId: string;
      nameEn: string;
      nameBn: string;
      endsAt: string;
      flash: boolean;
      regularPaisa: number;
    } | null;
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
      sale?: {
        promotionId: string;
        nameEn: string;
        nameBn: string;
        endsAt: string;
        flash: boolean;
        regularPaisa: number;
      } | null;
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
export type HomeContentResponseDtoOutput = {
  home: {
    version: number;
    updatedAt: string;
    content: {
      announcement: {
        en: string;
        bn: string;
      };
      hero: {
        eyebrow: {
          en: string;
          bn: string;
        };
        heading: {
          en: string;
          bn: string;
        };
        accent: {
          en: string;
          bn: string;
        };
        subline: {
          en: string;
          bn: string;
        };
        scenes: {
          assetId: string | null;
          productSlug: string;
          position: string;
          phonePosition: string;
          imageUrl: string | null;
        }[];
      };
      trust: {
        icon: 'hammer' | 'lightbulb' | 'coins' | 'truck' | 'leaf' | 'shield' | 'hand' | 'sparkles';
        title: {
          en: string;
          bn: string;
        };
        text: {
          en: string;
          bn: string;
        };
      }[];
      collections: {
        categorySlug: string;
        assetId: string | null;
        imageUrl: string | null;
      }[];
      contact: {
        phone: string;
        whatsapp: string;
        email: string | '';
        facebook: string | '';
        instagram: string | '';
      };
      business: {
        legalName: {
          en: string;
          bn: string;
        };
        address: {
          en: string;
          bn: string;
        };
        tradeLicence: string;
        confirmed: boolean;
      };
      texts: {
        [key: string]: {
          en: string;
          bn: string;
        };
      };
      projects: {
        kind: 'DESIGN' | 'CONSTRUCTION';
        title: {
          en: string;
          bn: string;
        };
        location: {
          en: string;
          bn: string;
        };
        text: {
          en: string;
          bn: string;
        };
        assetIds: string[];
        imageUrls: string[];
      }[];
      clients: {
        name: string;
        assetId: string | null;
        url: string | '';
        logoUrl: string | null;
      }[];
    };
  } | null;
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
        sale?: {
          promotionId: string;
          nameEn: string;
          nameBn: string;
          endsAt: string;
          flash: boolean;
          regularPaisa: number;
        } | null;
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
      sale?: {
        promotionId: string;
        nameEn: string;
        nameBn: string;
        endsAt: string;
        flash: boolean;
        regularPaisa: number;
      } | null;
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
  discountPaisa: number;
  coupon: {
    code: string;
    description: string | null;
    discountPaisa: number;
  } | null;
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
  couponCode?: string;
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
  couponCode?: string;
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
export type TrackQueryDto = {
  code: string;
  phone: string;
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
export type QuoteTrackQueryDto = {
  code: string;
  phone: string;
};
export type SubmitPrivacyResultDtoOutput = {
  code: string;
};
export type SubmitPrivacyRequestDto = {
  type: 'ACCESS' | 'CORRECTION' | 'DELETION' | 'CONSENT_WITHDRAWAL';
  phone: string;
  reference?: string;
  email?: string;
  details?: string;
};
export type PublicPrivacyRequestDtoOutput = {
  code: string;
  type: 'ACCESS' | 'CORRECTION' | 'DELETION' | 'CONSENT_WITHDRAWAL';
  status: 'PENDING' | 'VERIFICATION_REQUIRED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
};
export type PrivacyTrackDto = {
  code: string;
  phone: string;
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
  useCustomerAuthControllerProvidersQuery,
  useLazyCustomerAuthControllerProvidersQuery,
  useCustomerAuthControllerRegisterMutation,
  useCustomerAuthControllerLoginMutation,
  useCustomerAuthControllerRefreshMutation,
  useCustomerAuthControllerLogoutMutation,
  useCustomerAuthControllerVerifyEmailMutation,
  useCustomerAuthControllerResendMutation,
  useCustomerAuthControllerForgotMutation,
  useCustomerAuthControllerResetMutation,
  useCustomerAuthControllerPendingProfileQuery,
  useLazyCustomerAuthControllerPendingProfileQuery,
  useCustomerAuthControllerCompleteMutation,
  useCustomerAuthControllerMeQuery,
  useLazyCustomerAuthControllerMeQuery,
  useCustomerAuthControllerUpdateProfileMutation,
  useCustomerAuthControllerChangePasswordMutation,
  useCustomerAuthControllerSessionsQuery,
  useLazyCustomerAuthControllerSessionsQuery,
  useCustomerAuthControllerRevokeSessionMutation,
  useCustomerAuthControllerRevokeOthersMutation,
  useCatalogControllerCategoriesQuery,
  useLazyCatalogControllerCategoriesQuery,
  useCatalogControllerSaleQuery,
  useLazyCatalogControllerSaleQuery,
  useCatalogControllerProductsQuery,
  useLazyCatalogControllerProductsQuery,
  useCatalogControllerProductQuery,
  useLazyCatalogControllerProductQuery,
  useContentControllerHomeQuery,
  useLazyContentControllerHomeQuery,
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
  useShopControllerTrackMutation,
  usePublicB2BControllerRequestMutation,
  usePublicB2BControllerTrackMutation,
  usePublicB2BControllerPrivacyRequestMutation,
  usePublicB2BControllerPrivacyTrackMutation,
  usePublicB2BControllerBeaconMutation,
} = injectedRtkApi;
