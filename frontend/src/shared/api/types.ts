import type { Schemas } from '@zelqune/api-client';

// Aliases for generated gateway types (never hand-written).
export type ProductDetail = Schemas['ProductDetailDto_Output'];
export type ProductSummary = Schemas['ProductListResponseDto_Output']['items'][number];
export type Category = Schemas['CategoryListResponseDto_Output']['items'][number];
export type District = Schemas['DistrictListDto_Output']['items'][number];
export type Cart = Schemas['CartDto_Output'];
export type CheckoutQuote = Schemas['CheckoutQuoteDto_Output'];
export type CheckoutRequest = Schemas['CheckoutRequestDto'];
export type CheckoutResponse = Schemas['CheckoutResponseDto_Output'];
export type OrderTracking = Schemas['OrderTrackingDto_Output'];
export type RfqRequest = Schemas['RfqRequestDto'];
export type PublicQuote = Schemas['PublicQuoteDto_Output'];
export type ShippingEstimate = Schemas['ShippingEstimateDto_Output'];
export type SaleMode = ProductDetail['saleMode'];
export type ResolvedPrice = NonNullable<ProductDetail['variants'][number]['price']>;
export type ActiveSale = NonNullable<Schemas['ActiveSaleDto_Output']['sale']>;
export type PaymentMethod = CheckoutRequest['paymentMethod'];

/** The gateway's error envelope: { error: { code, message, requestId } }. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    /** zod issues for VALIDATION_FAILED. */
    readonly details: { path: (string | number)[] }[] = [],
  ) {
    super(message);
  }

  static from(status: number, body: unknown): ApiError {
    const error = (
      body as { error?: { code?: unknown; message?: unknown; details?: unknown } } | undefined
    )?.error;
    const details = Array.isArray(error?.details)
      ? error.details.filter(
          (d): d is { path: (string | number)[] } =>
            !!d && typeof d === 'object' && Array.isArray((d as { path?: unknown }).path),
        )
      : [];
    return new ApiError(
      status,
      typeof error?.code === 'string' ? error.code : `HTTP_${status}`,
      typeof error?.message === 'string' ? error.message : 'Request failed',
      details,
    );
  }
}

/** Unwraps an openapi-fetch result or throws the gateway's error code. */
export function ok<T>(result: { data?: T; error?: unknown; response: Response }): T {
  if (result.error !== undefined || result.data === undefined) {
    throw ApiError.from(result.response.status, result.error);
  }
  return result.data;
}
