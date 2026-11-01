import { customerAccountSchema } from '../auth/auth.contracts';
import { z } from 'zod';
import {
  experimentKeySchema,
  paisaSchema,
  resolvedPriceSchema,
  saleModeSchema,
} from '../catalog/catalog.contracts';
import {
  paymentInstructionsSchema,
  paymentMethodSchema,
  paymentSummarySchema,
  trxIdSchema,
} from '../payments/payments.contracts';
import { appliedCouponSchema, couponCodeSchema } from '../marketing/coupons.contracts';
import { bdPhoneSchema } from '../phone';
import {
  areaSchema,
  districtCodeSchema,
  shipmentSummarySchema,
  shippingZoneSchema,
} from '../shipping/shipping.contracts';

export const ORDER_STATUSES = [
  'PENDING_PAYMENT',
  'CONFIRMED',
  'IN_PRODUCTION',
  'READY_TO_SHIP',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURN_REQUESTED',
  'RETURNED',
  'REFUNDED',
] as const;
export const orderStatusSchema = z.enum(ORDER_STATUSES);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

/** Unambiguous alphabet: no 0/O, 1/I/L. */
export const ORDER_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const ORDER_CODE_PATTERN = /^ZQ-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/;
export const orderCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(ORDER_CODE_PATTERN, 'Order code looks like ZQ-7K3M9P')
  .meta({ example: 'ZQ-7K3M9P' });

export const MAX_CART_LINES = 20;
/** Sanity bound for one cart line; the business cap is MAX_LINE_QTY_B2C in order-service config. */
export const MAX_LINE_QTY = 100;

// ---------- Cart ----------

export const cartItemSchema = z.object({
  variantId: z.uuid(),
  qty: z.number().int().min(1).max(MAX_LINE_QTY),
  sku: z.string().nullable(),
  productSlug: z.string().nullable(),
  nameBn: z.string().nullable(),
  nameEn: z.string().nullable(),
  options: z.record(z.string(), z.string()),
  saleMode: saleModeSchema.nullable(),
  unitPrice: resolvedPriceSchema.nullable(),
  lineTotalPaisa: paisaSchema.nullable(),
  /** False when the variant is no longer sellable (unpublished, inactive, unpriced). */
  available: z.boolean(),
});
export type CartItemView = z.infer<typeof cartItemSchema>;

export const cartSchema = z.object({
  id: z.uuid(),
  items: z.array(cartItemSchema),
  subtotalPaisa: paisaSchema,
  /** The single sale mode of the cart, or null when empty/mixed. */
  saleMode: saleModeSchema.nullable(),
  mixedSaleModes: z.boolean(),
  experimentKey: experimentKeySchema.nullable(),
});
export type CartView = z.infer<typeof cartSchema>;

export const createCartRequestSchema = z.object({
  /** Price experiment bucket the visitor was assigned (?p=a|b cookie). */
  p: z.string().max(8).optional(),
});
export const createCartResponseSchema = z.object({
  /** Bearer secret for the guest cart; send as X-Cart-Token. Shown once. */
  cartToken: z.string(),
  cart: cartSchema,
});
export type CreateCartResponse = z.infer<typeof createCartResponseSchema>;

export const setCartItemRequestSchema = z.object({
  qty: z.number().int().min(0).max(MAX_LINE_QTY),
});

// ---------- Quote / checkout ----------

export const addressSchema = z.object({
  district: districtCodeSchema,
  area: areaSchema,
  line: z.string().trim().min(5).max(300),
  note: z.string().trim().max(300).nullable().default(null),
});
export type AddressInput = z.input<typeof addressSchema>;
export type Address = z.output<typeof addressSchema>;

export const quoteRequestSchema = z.object({
  district: districtCodeSchema,
  area: areaSchema,
  couponCode: couponCodeSchema.optional(),
});
export type QuoteRequest = z.input<typeof quoteRequestSchema>;

export const checkoutQuoteSchema = z.object({
  saleMode: saleModeSchema,
  subtotalPaisa: paisaSchema,
  /** Coupon discount on the product subtotal (0 without a coupon). */
  discountPaisa: paisaSchema,
  coupon: appliedCouponSchema.nullable(),
  shippingFeePaisa: paisaSchema,
  totalPaisa: paisaSchema,
  /** Must be paid upfront via bKash/Nagad (0 when COD is allowed for the whole order). */
  advanceRequiredPaisa: paisaSchema,
  zone: shippingZoneSchema,
  chargeableWeightGrams: z.number().int().positive(),
  allowedPaymentMethods: z.array(paymentMethodSchema),
  paymentInstructions: paymentInstructionsSchema,
});
export type CheckoutQuote = z.infer<typeof checkoutQuoteSchema>;

export const utmSchema = z
  .object({
    source: z.string().max(100).optional(),
    medium: z.string().max(100).optional(),
    campaign: z.string().max(100).optional(),
    content: z.string().max(100).optional(),
    term: z.string().max(100).optional(),
  })
  .optional();

export const checkoutRequestSchema = z
  .object({
    customer: z.object({ name: z.string().trim().min(2).max(100), phone: bdPhoneSchema }),
    address: addressSchema,
    paymentMethod: paymentMethodSchema,
    /** Required for bKash/Nagad manual payments. */
    trxId: trxIdSchema.nullable().default(null),
    /** The number the customer paid from (defaults to the customer phone). */
    payerPhone: bdPhoneSchema.nullable().default(null),
    couponCode: couponCodeSchema.optional(),
    utm: utmSchema,
    /** Anonymous analytics session (links storefront events to the order). */
    sessionId: z
      .string()
      .regex(/^[A-Za-z0-9_-]{16,64}$/)
      .optional(),
  })
  .refine((v) => v.paymentMethod === 'COD' || v.trxId !== null, {
    message: 'Transaction ID is required for bKash/Nagad payments',
    path: ['trxId'],
  });
export type CheckoutRequest = z.input<typeof checkoutRequestSchema>;

export const orderTotalsSchema = z.object({
  subtotalPaisa: paisaSchema,
  discountPaisa: paisaSchema,
  shippingFeePaisa: paisaSchema,
  totalPaisa: paisaSchema,
  advanceRequiredPaisa: paisaSchema,
});
export type OrderTotals = z.infer<typeof orderTotalsSchema>;

export const checkoutResponseSchema = z.object({
  orderCode: z.string(),
  status: orderStatusSchema,
  saleMode: saleModeSchema,
  totals: orderTotalsSchema,
  payment: paymentSummarySchema.nullable(),
});
export type CheckoutResponse = z.infer<typeof checkoutResponseSchema>;

// ---------- Tracking ----------

export const trackQuerySchema = z.object({ code: orderCodeSchema, phone: bdPhoneSchema });
export type TrackQuery = z.output<typeof trackQuerySchema>;

export const orderItemViewSchema = z.object({
  sku: z.string(),
  nameBn: z.string(),
  nameEn: z.string(),
  options: z.record(z.string(), z.string()),
  qty: z.number().int(),
  unitPricePaisa: paisaSchema,
  lineTotalPaisa: paisaSchema,
});

export const orderTrackingSchema = z.object({
  code: z.string(),
  status: orderStatusSchema,
  saleMode: saleModeSchema,
  placedAt: z.string(),
  items: z.array(orderItemViewSchema),
  totals: orderTotalsSchema,
  history: z.array(z.object({ status: orderStatusSchema, at: z.string() })),
  payment: paymentSummarySchema.nullable(),
  shipment: shipmentSummarySchema.nullable(),
});
export type OrderTracking = z.infer<typeof orderTrackingSchema>;

/** order-service part of tracking; the gateway adds payment and shipment. */
export type OrderTrackingCore = Omit<OrderTracking, 'payment' | 'shipment'> & { orderId: string };

export const transitionOrderInputSchema = z.object({
  orderId: z.uuid(),
  to: orderStatusSchema,
  actor: z.string().min(1).max(64),
  reason: z.string().max(300).nullable().default(null),
});
export type TransitionOrderInput = z.input<typeof transitionOrderInputSchema>;

// ---------- Admin (step 1.3) ----------

export const ORDER_CHANNELS = ['B2C', 'B2B'] as const;
export const orderChannelSchema = z.enum(ORDER_CHANNELS);
export type OrderChannel = z.infer<typeof orderChannelSchema>;

const orderFilterShape = {
  status: orderStatusSchema.optional(),
  channel: orderChannelSchema.optional(),
  saleMode: saleModeSchema.optional(),
  paymentMethod: paymentMethodSchema.optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  /** Order code, phone or customer name. */
  q: z.string().trim().max(100).optional(),
  /** "true"/"false" in a query string; booleans when re-validated by a service. */
  isFriend: z.union([z.boolean(), z.stringbool()]).optional(),
};

export const adminOrderListQuerySchema = z.object({
  ...orderFilterShape,
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type AdminOrderListQuery = z.output<typeof adminOrderListQuerySchema>;
export const adminOrderExportQuerySchema = z.object(orderFilterShape);
export type AdminOrderExportQuery = z.output<typeof adminOrderExportQuerySchema>;
export const MAX_EXPORT_ROWS = 10_000;

export const adminOrderSummarySchema = z.object({
  id: z.uuid(),
  code: z.string(),
  channel: orderChannelSchema,
  status: orderStatusSchema,
  saleMode: saleModeSchema,
  customerName: z.string(),
  customerPhone: z.string(),
  /** The customer account that placed it (ADR 0021); null for older orders. */
  customerUserId: z.uuid().nullable(),
  isFriend: z.boolean(),
  paymentMethod: paymentMethodSchema,
  subtotalPaisa: paisaSchema,
  shippingFeePaisa: paisaSchema,
  totalPaisa: paisaSchema,
  advanceRequiredPaisa: paisaSchema,
  district: z.string(),
  experimentKey: z.string().nullable(),
  placedAt: z.string(),
});
export type AdminOrderSummary = z.infer<typeof adminOrderSummarySchema>;

export const adminOrderListSchema = z.object({
  items: z.array(adminOrderSummarySchema),
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
});
export type AdminOrderList = z.infer<typeof adminOrderListSchema>;

export const adminOrderDetailSchema = adminOrderSummarySchema.extend({
  address: z.object({
    district: z.string(),
    area: z.string(),
    line: z.string(),
    note: z.string().nullable(),
  }),
  items: z.array(orderItemViewSchema),
  totals: orderTotalsSchema,
  history: z.array(
    z.object({
      from: orderStatusSchema.nullable(),
      to: orderStatusSchema,
      actor: z.string(),
      reason: z.string().nullable(),
      at: z.string(),
    }),
  ),
  notes: z.array(z.object({ id: z.uuid(), author: z.string(), text: z.string(), at: z.string() })),
  utm: z.record(z.string(), z.string()).nullable(),
  organizationId: z.uuid().nullable(),
  quoteCode: z.string().nullable(),
  couponCode: z.string().nullable(),
  cancelReason: z.string().nullable(),
  payment: paymentSummarySchema.nullable(),
  shipment: shipmentSummarySchema.nullable(),
  /** The customer account behind the order: name, verified email, phone (ADR 0021). */
  account: customerAccountSchema.nullable(),
});
export type AdminOrderDetail = z.infer<typeof adminOrderDetailSchema>;
/** order-service part; the gateway adds payment, shipment and the account. */
export type AdminOrderDetailCore = Omit<AdminOrderDetail, 'payment' | 'shipment' | 'account'>;

export const addOrderNoteSchema = z.object({ text: z.string().trim().min(1).max(2000) });
export const transitionRequestSchema = z.object({
  to: orderStatusSchema,
  reason: z.string().trim().max(300).nullable().default(null),
});
export const setFriendSchema = z.object({ isFriend: z.boolean() });

/* Signed-in customer: their own orders and requests (ADR 0021). No other customer's data. */
export const myOrderSchema = z.object({
  code: z.string(),
  status: z.string(),
  saleMode: z.string(),
  createdAt: z.string(),
  totalPaisa: z.number().int(),
  items: z.array(z.object({ nameEn: z.string(), nameBn: z.string(), qty: z.number().int() })),
});
export const myOrdersSchema = z.object({ items: z.array(myOrderSchema) });
export type MyOrders = z.infer<typeof myOrdersSchema>;

export const myRequestSchema = z.object({
  code: z.string(),
  kind: z.enum(['PRODUCT', 'DESIGN', 'CONSTRUCTION']),
  status: z.string(),
  createdAt: z.string(),
});
export const myRequestsSchema = z.object({ items: z.array(myRequestSchema) });
export type MyRequests = z.infer<typeof myRequestsSchema>;
