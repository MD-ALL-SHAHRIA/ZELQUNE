import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { type AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser, RequireAccount } from '../auth/guards';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AppError,
  CART_TOKEN_HEADER,
  Idempotent,
  IDEMPOTENCY_HEADER,
  Public,
  ServiceRegistry,
  ZodResponse,
} from '@zelqune/common';
import {
  type CartView,
  type CheckoutQuote,
  type CheckoutResponse,
  type CheckoutSnapshotResponse,
  type CreateCartResponse,
  type DistrictView,
  type OrderTracking,
  type OrderTrackingCore,
  type PaymentSummary,
  RPC_PATTERNS,
  type ShipmentSummary,
  type ShippingEstimate,
  type ShippingQuote,
} from '@zelqune/contracts';
import { RouteThrottle } from '../throttling/throttling.module';
import { RequireTurnstile } from '../turnstile/turnstile';
import { CartToken } from './cart-token';
import {
  CartDto,
  CheckoutQuoteDto,
  CheckoutRequestDto,
  CheckoutResponseDto,
  CreateCartRequestDto,
  CreateCartResponseDto,
  DistrictListDto,
  OrderTrackingDto,
  QuoteRequestDto,
  SetCartItemDto,
  ShippingEstimateDto,
  ShippingEstimateQueryDto,
  TrackQueryDto,
  VariantIdParamDto,
} from './shop.dto';

const CART_HEADER = {
  name: CART_TOKEN_HEADER,
  required: true,
  description: 'Guest cart token from POST /v1/carts',
};

/** Public storefront shopping flow: districts, guest cart, quote, checkout, tracking. */
@ApiTags('shop')
@Public()
@Controller()
export class ShopController {
  constructor(private readonly services: ServiceRegistry) {}

  @Get('shipping/districts')
  @ApiOperation({ summary: 'All 64 districts (bn/en) for the address form.' })
  @ZodResponse({ type: DistrictListDto })
  districts(): Promise<{ items: DistrictView[] }> {
    return this.services.get('shipping').send(RPC_PATTERNS.shipping.districts, {});
  }

  @Get('shipping/estimate')
  @RouteThrottle('cartWrite')
  @ApiOperation({
    summary: 'Delivery fee for one variant to a district (product page), same rules as checkout.',
  })
  @ZodResponse({ type: ShippingEstimateDto })
  async shippingEstimate(@Query() query: ShippingEstimateQueryDto): Promise<ShippingEstimate> {
    const snapshot = await this.services
      .get('catalog')
      .send<CheckoutSnapshotResponse>(RPC_PATTERNS.catalog.checkoutSnapshot, {
        variantIds: [query.variantId],
      });
    const variant = snapshot[query.variantId];
    if (!variant) throw new AppError('VARIANT_NOT_AVAILABLE', 'This item is not available', 404);
    const quote = await this.services
      .get('shipping')
      .send<ShippingQuote>(RPC_PATTERNS.shipping.quote, {
        district: query.district,
        lines: [
          {
            qty: query.qty,
            packageWeightGrams: variant.packageWeightGrams,
            packageLengthMm: variant.packageLengthMm,
            packageWidthMm: variant.packageWidthMm,
            packageHeightMm: variant.packageHeightMm,
          },
        ],
      });
    return {
      district: quote.district,
      zone: quote.zone,
      chargeableWeightGrams: quote.chargeableWeightGrams,
      feePaisa: quote.feePaisa,
    };
  }

  @Post('carts')
  @RouteThrottle('cartWrite')
  @ApiOperation({
    summary: 'Create a guest cart. Keep the returned cartToken; send it as X-Cart-Token.',
  })
  @ZodResponse({ status: 201, type: CreateCartResponseDto })
  createCart(@Body() body: CreateCartRequestDto): Promise<CreateCartResponse> {
    return this.services.get('order').send(RPC_PATTERNS.order.createCart, { p: body.p });
  }

  @Get('carts/current')
  @ApiHeader(CART_HEADER)
  @ZodResponse({ type: CartDto })
  cart(@CartToken() cartToken: string): Promise<CartView> {
    return this.services.get('order').send(RPC_PATTERNS.order.getCart, { cartToken });
  }

  @Put('carts/current/items/:variantId')
  @RouteThrottle('cartWrite')
  @ApiHeader(CART_HEADER)
  @ApiOperation({ summary: 'Set the quantity of a variant (0 removes it).' })
  @ZodResponse({ type: CartDto })
  setItem(
    @CartToken() cartToken: string,
    @Param() params: VariantIdParamDto,
    @Body() body: SetCartItemDto,
  ): Promise<CartView> {
    return this.services.get('order').send(RPC_PATTERNS.order.setCartItem, {
      cartToken,
      variantId: params.variantId,
      qty: body.qty,
    });
  }

  @Delete('carts/current/items/:variantId')
  @RouteThrottle('cartWrite')
  @ApiHeader(CART_HEADER)
  @ZodResponse({ type: CartDto })
  removeItem(
    @CartToken() cartToken: string,
    @Param() params: VariantIdParamDto,
  ): Promise<CartView> {
    return this.services
      .get('order')
      .send(RPC_PATTERNS.order.setCartItem, { cartToken, variantId: params.variantId, qty: 0 });
  }

  @Post('carts/current/quote')
  @HttpCode(200)
  @ApiHeader(CART_HEADER)
  @ApiOperation({ summary: 'Shipping fee, totals, advance and payment options for an address.' })
  @ZodResponse({ status: 200, type: CheckoutQuoteDto })
  quote(@CartToken() cartToken: string, @Body() body: QuoteRequestDto): Promise<CheckoutQuote> {
    return this.services.get('order').send(RPC_PATTERNS.order.quote, { cartToken, address: body });
  }

  @Post('checkout')
  @RequireAccount()
  @RouteThrottle('checkout')
  @RequireTurnstile()
  @Idempotent({ scope: 'cart' })
  @ApiHeader(CART_HEADER)
  @ApiHeader({
    name: IDEMPOTENCY_HEADER,
    required: true,
    description: 'Unique per checkout attempt (8-128 chars)',
  })
  @ApiOperation({
    summary:
      'Place the order (reserves stock, records payment). Safe to retry with the same Idempotency-Key.',
  })
  @ZodResponse({ status: 201, type: CheckoutResponseDto })
  checkout(
    @CartToken() cartToken: string,
    @Body() body: CheckoutRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CheckoutResponse> {
    // order-service validates again: it never trusts its callers. The account comes from the
    // verified token, never from the body.
    return this.services
      .get('order')
      .send(
        RPC_PATTERNS.order.checkout,
        { cartToken, request: body, customerUserId: user.id },
        { timeoutMs: 20_000 },
      );
  }

  /** POST so the phone number travels in the body, never in a URL (URLs end up in logs). */
  @Post('orders/track')
  @HttpCode(200)
  @RouteThrottle('track')
  @ApiOperation({ summary: 'Track an order by code and the phone number used to place it.' })
  @ZodResponse({ status: 200, type: OrderTrackingDto })
  async track(@Body() query: TrackQueryDto): Promise<OrderTracking> {
    const { orderId, ...order } = await this.services
      .get('order')
      .send<OrderTrackingCore>(RPC_PATTERNS.order.track, query);
    const [payment, shipment] = await Promise.all([
      this.services
        .get('payment')
        .send<PaymentSummary | null>(RPC_PATTERNS.payment.summaryByOrder, { orderId }),
      this.services
        .get('shipping')
        .send<ShipmentSummary | null>(RPC_PATTERNS.shipping.shipmentByOrder, { orderId }),
    ]);
    return { ...order, payment, shipment };
  }
}
