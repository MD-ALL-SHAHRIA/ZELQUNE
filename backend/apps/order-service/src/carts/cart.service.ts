import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, AppError } from '@zelqune/common';
import {
  type CartView,
  type CheckoutQuote,
  type CreateCartResponse,
  MAX_CART_LINES,
  type PaymentInstructions,
  type PaymentMethod,
  quoteRequestSchema,
  type QuoteRequest,
  type SaleMode,
  type ShippingQuote,
} from '@zelqune/contracts';
import { createHash, randomBytes } from 'node:crypto';
import { type OrderEnv } from '../config/order-env';
import { CHECKOUT_PARTICIPANTS, type CheckoutParticipants } from '../checkout/participants';
import { allowedPaymentMethods, computeTotals, type Totals } from '../domain/pricing';
import { type Cart, type CartItem } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { type PricedCart, type PricedLine, priceCart } from './cart-pricing';

type CartWithItems = Cart & { items: CartItem[] };

export interface PreparedCheckout {
  cart: CartWithItems;
  lines: PricedLine[];
  saleMode: SaleMode;
  shipping: ShippingQuote;
  totals: Totals;
  instructions: PaymentInstructions;
  allowedMethods: PaymentMethod[];
}

const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');
const parseBucket = (p: string | undefined): 'a' | 'b' | null => {
  const v = p?.trim().toLowerCase();
  return v === 'a' || v === 'b' ? v : null;
};

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CHECKOUT_PARTICIPANTS) private readonly participants: CheckoutParticipants,
    @Inject(APP_CONFIG) private readonly config: OrderEnv,
  ) {}

  async create(p?: string): Promise<CreateCartResponse> {
    const cartToken = randomBytes(32).toString('base64url');
    const cart = await this.prisma.cart.create({
      data: {
        tokenHash: hashToken(cartToken),
        experimentKey: parseBucket(p),
        expiresAt: new Date(Date.now() + this.config.CART_TTL_DAYS * 86_400_000),
      },
      include: { items: true },
    });
    return { cartToken, cart: await this.view(cart) };
  }

  async get(token: string): Promise<CartView> {
    return this.view(await this.loadActive(token));
  }

  /** qty 0 removes the line. Only sellable variants can be added. */
  async setItem(token: string, variantId: string, qty: number): Promise<CartView> {
    const cart = await this.loadActive(token);
    if (qty === 0) {
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id, variantId } });
    } else {
      const known = cart.items.some((i) => i.variantId === variantId);
      if (!known && cart.items.length >= MAX_CART_LINES) {
        throw new AppError(
          'CART_FULL',
          `A cart can hold at most ${MAX_CART_LINES} different items`,
          422,
        );
      }
      const snapshot = await this.participants.snapshot([variantId], cart.experimentKey);
      if (!snapshot[variantId]?.price) {
        throw new AppError('VARIANT_NOT_AVAILABLE', 'This item is not available', 404);
      }
      await this.prisma.cartItem.upsert({
        where: { cartId_variantId: { cartId: cart.id, variantId } },
        create: { cartId: cart.id, variantId, qty },
        update: { qty },
      });
    }
    return this.get(token);
  }

  async quote(token: string, raw: QuoteRequest): Promise<CheckoutQuote> {
    const address = quoteRequestSchema.parse(raw);
    const prepared = await this.prepare(await this.loadActive(token), address);
    return {
      saleMode: prepared.saleMode,
      subtotalPaisa: prepared.totals.subtotalPaisa,
      shippingFeePaisa: prepared.totals.shippingFeePaisa,
      totalPaisa: prepared.totals.totalPaisa,
      advanceRequiredPaisa: prepared.totals.advanceRequiredPaisa,
      zone: prepared.shipping.zone,
      chargeableWeightGrams: prepared.shipping.chargeableWeightGrams,
      allowedPaymentMethods: prepared.allowedMethods,
      paymentInstructions: prepared.instructions,
    };
  }

  /** Prices the cart, checks it can be checked out, and quotes shipping and totals. */
  async prepare(
    cart: CartWithItems,
    address: { district: string; area: string },
  ): Promise<PreparedCheckout> {
    const priced = await this.price(cart);
    if (cart.items.length === 0) throw new AppError('CART_EMPTY', 'The cart is empty', 422);
    if (!priced.allAvailable) {
      throw new AppError('CART_HAS_UNAVAILABLE_ITEMS', 'Some items are no longer available', 409, {
        variantIds: priced.items.filter((i) => !i.available).map((i) => i.variantId),
      });
    }
    if (priced.mixedSaleModes || !priced.saleMode) {
      throw new AppError(
        'MIXED_SALE_MODES',
        'Pre-order and in-stock items must be ordered separately',
        422,
      );
    }
    const [shipping, instructions] = await Promise.all([
      this.participants.quoteShipping({
        district: address.district,
        area: address.area,
        lines: priced.lines.map((l) => ({
          qty: l.qty,
          packageWeightGrams: l.snapshot.packageWeightGrams,
          packageLengthMm: l.snapshot.packageLengthMm,
          packageWidthMm: l.snapshot.packageWidthMm,
          packageHeightMm: l.snapshot.packageHeightMm,
        })),
      }),
      this.participants.paymentInstructions(),
    ]);
    const totals = computeTotals({
      lines: priced.lines,
      shippingFeePaisa: shipping.feePaisa,
      saleMode: priced.saleMode,
      advance:
        this.config.ADVANCE_MODE === 'percent'
          ? { mode: 'percent', percent: this.config.ADVANCE_PERCENT ?? 100 }
          : { mode: 'fixed', fixedPaisa: this.config.ADVANCE_FIXED_PAISA },
    });
    return {
      cart,
      lines: priced.lines,
      saleMode: priced.saleMode,
      shipping,
      totals,
      instructions,
      allowedMethods: allowedPaymentMethods(priced.saleMode, instructions),
    };
  }

  /** The active cart for a token, or 404; a checked-out cart answers 409 with its order code. */
  async loadActive(token: string): Promise<CartWithItems> {
    const cart = await this.prisma.cart.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { items: { orderBy: { addedAt: 'asc' } } },
    });
    if (!cart || cart.expiresAt <= new Date())
      throw new AppError('CART_NOT_FOUND', 'Cart not found', 404);
    if (cart.status === 'CHECKED_OUT') {
      const order = cart.orderId
        ? await this.prisma.order.findUnique({ where: { id: cart.orderId } })
        : null;
      throw new AppError('CART_CHECKED_OUT', 'This cart was already checked out', 409, {
        orderCode: order?.code ?? null,
      });
    }
    return cart;
  }

  private async price(cart: CartWithItems): Promise<PricedCart> {
    const rows = cart.items.map((i) => ({ variantId: i.variantId, qty: i.qty }));
    const snapshot = rows.length
      ? await this.participants.snapshot(
          rows.map((r) => r.variantId),
          cart.experimentKey,
        )
      : {};
    return priceCart(rows, snapshot);
  }

  private async view(cart: CartWithItems): Promise<CartView> {
    const priced = await this.price(cart);
    return {
      id: cart.id,
      items: priced.items,
      subtotalPaisa: priced.subtotalPaisa,
      saleMode: priced.saleMode,
      mixedSaleModes: priced.mixedSaleModes,
      experimentKey:
        cart.experimentKey === 'a' || cart.experimentKey === 'b' ? cart.experimentKey : null,
    };
  }
}
