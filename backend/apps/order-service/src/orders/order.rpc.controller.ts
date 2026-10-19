import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  type CartView,
  type CheckoutQuote,
  type CheckoutRequest,
  type CheckoutResponse,
  type CreateCartResponse,
  type OrderTrackingCore,
  type QuoteRequest,
  RPC_PATTERNS,
  type RpcRequest,
  setCartItemRequestSchema,
  trackQuerySchema,
  type TransitionOrderInput,
} from '@zelqune/contracts';
import { z } from 'zod';
import { CartService } from '../carts/cart.service';
import { CheckoutService } from '../checkout/checkout.service';
import { OrderService } from './order.service';

const P = RPC_PATTERNS.order;
const token = z.string().min(20).max(100);

@Controller()
export class OrderRpcController {
  constructor(
    private readonly carts: CartService,
    private readonly checkoutService: CheckoutService,
    private readonly orders: OrderService,
  ) {}

  @MessagePattern(P.createCart)
  createCart(@Payload() req: RpcRequest<{ p?: string }>): Promise<CreateCartResponse> {
    return this.carts.create(req.data.p);
  }

  @MessagePattern(P.getCart)
  getCart(@Payload() req: RpcRequest<{ cartToken: string }>): Promise<CartView> {
    return this.carts.get(token.parse(req.data.cartToken));
  }

  @MessagePattern(P.setCartItem)
  setCartItem(
    @Payload() req: RpcRequest<{ cartToken: string; variantId: string; qty: number }>,
  ): Promise<CartView> {
    const { qty } = setCartItemRequestSchema.parse({ qty: req.data.qty });
    return this.carts.setItem(
      token.parse(req.data.cartToken),
      z.uuid().parse(req.data.variantId),
      qty,
    );
  }

  @MessagePattern(P.quote)
  quote(
    @Payload() req: RpcRequest<{ cartToken: string; address: QuoteRequest }>,
  ): Promise<CheckoutQuote> {
    return this.carts.quote(token.parse(req.data.cartToken), req.data.address);
  }

  @MessagePattern(P.checkout)
  checkout(
    @Payload() req: RpcRequest<{ cartToken: string; request: CheckoutRequest }>,
  ): Promise<CheckoutResponse> {
    return this.checkoutService.checkout(token.parse(req.data.cartToken), req.data.request);
  }

  @MessagePattern(P.track)
  track(@Payload() req: RpcRequest<unknown>): Promise<OrderTrackingCore> {
    return this.orders.track(trackQuerySchema.parse(req.data));
  }

  @MessagePattern(P.admin.transition)
  transition(@Payload() req: RpcRequest<TransitionOrderInput>) {
    return this.orders.transition(req.data);
  }
}
