import { createZodDto } from '@zelqune/common';
import {
  cartSchema,
  checkoutQuoteSchema,
  checkoutRequestSchema,
  checkoutResponseSchema,
  createCartRequestSchema,
  createCartResponseSchema,
  districtListResponseSchema,
  orderTrackingSchema,
  quoteRequestSchema,
  setCartItemRequestSchema,
  trackQuerySchema,
} from '@zelqune/contracts';
import { z } from 'zod';

export class CreateCartRequestDto extends createZodDto(createCartRequestSchema) {}
export class CreateCartResponseDto extends createZodDto(createCartResponseSchema) {}
export class CartDto extends createZodDto(cartSchema) {}
export class SetCartItemDto extends createZodDto(setCartItemRequestSchema) {}
export class VariantIdParamDto extends createZodDto(z.object({ variantId: z.uuid() })) {}
export class QuoteRequestDto extends createZodDto(quoteRequestSchema) {}
export class CheckoutQuoteDto extends createZodDto(checkoutQuoteSchema) {}
export class CheckoutRequestDto extends createZodDto(checkoutRequestSchema) {}
export class CheckoutResponseDto extends createZodDto(checkoutResponseSchema) {}
export class TrackQueryDto extends createZodDto(trackQuerySchema) {}
export class OrderTrackingDto extends createZodDto(orderTrackingSchema) {}
export class DistrictListDto extends createZodDto(districtListResponseSchema) {}
