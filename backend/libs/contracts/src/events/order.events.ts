import { z } from 'zod';
import { experimentKeySchema, paisaSchema, saleModeSchema } from '../catalog/catalog.contracts';
import { releaseReasonSchema, stockLineSchema } from '../inventory/inventory.contracts';
import { orderStatusSchema, utmSchema } from '../orders/orders.contracts';
import { paymentKindSchema, paymentMethodSchema } from '../payments/payments.contracts';
import { defineEvent } from './envelope';

export const orderPlaced = defineEvent({
  type: 'order.placed',
  version: 1,
  payload: z.object({
    orderId: z.uuid(),
    code: z.string(),
    saleMode: saleModeSchema,
    items: z.array(
      z.object({
        variantId: z.uuid(),
        sku: z.string(),
        qty: z.number().int().positive(),
        unitPricePaisa: paisaSchema,
      }),
    ),
    subtotalPaisa: paisaSchema,
    shippingFeePaisa: paisaSchema,
    totalPaisa: paisaSchema,
    advanceRequiredPaisa: paisaSchema,
    paymentMethod: paymentMethodSchema,
    experimentKey: experimentKeySchema.nullable(),
    /** True when stock was reserved (IN_STOCK); pre-orders skip reservation. */
    stockReserved: z.boolean(),
    // ---- optional, added in step 1.3 (additive, still v1; ADR 0010) ----
    channel: z.enum(['B2C', 'B2B']).default('B2C'),
    /** For notification-service only. Analytics must never store it (ADR 0010). */
    customer: z.object({ name: z.string(), phone: z.string() }).optional(),
    /** HMAC of the phone (CUSTOMER_KEY_SECRET): the only customer identifier analytics keeps. */
    customerKey: z.string().optional(),
    sessionId: z.string().optional(),
    utm: utmSchema,
  }),
});

export const orderStatusChanged = defineEvent({
  type: 'order.statusChanged',
  version: 1,
  payload: z.object({
    orderId: z.uuid(),
    code: z.string(),
    from: orderStatusSchema,
    to: orderStatusSchema,
    channel: z.enum(['B2C', 'B2B']),
    changedAt: z.iso.datetime(),
  }),
});

export const customerFriendFlagChanged = defineEvent({
  type: 'customer.friendFlagChanged',
  version: 1,
  payload: z.object({
    customerKey: z.string(),
    isFriend: z.boolean(),
    changedAt: z.iso.datetime(),
  }),
});

export const orderConfirmed = defineEvent({
  type: 'order.confirmed',
  version: 1,
  payload: z.object({ orderId: z.uuid(), code: z.string(), confirmedAt: z.iso.datetime() }),
});

export const orderCancelled = defineEvent({
  type: 'order.cancelled',
  version: 1,
  payload: z.object({
    orderId: z.uuid(),
    code: z.string(),
    reason: z.enum(['PAYMENT_TIMEOUT', 'STOCK_HOLD_EXPIRED', 'ADMIN', 'CUSTOMER']),
    cancelledAt: z.iso.datetime(),
  }),
});

export const stockReserved = defineEvent({
  type: 'stock.reserved',
  version: 1,
  payload: z.object({
    reservationId: z.uuid(),
    orderId: z.uuid(),
    items: z.array(stockLineSchema),
    expiresAt: z.iso.datetime(),
  }),
});

export const stockReleased = defineEvent({
  type: 'stock.released',
  version: 1,
  payload: z.object({
    reservationId: z.uuid(),
    orderId: z.uuid(),
    items: z.array(stockLineSchema),
    reason: releaseReasonSchema,
  }),
});

export const paymentSubmitted = defineEvent({
  type: 'payment.submitted',
  version: 1,
  payload: z.object({
    paymentId: z.uuid(),
    orderId: z.uuid(),
    orderCode: z.string(),
    method: paymentMethodSchema,
    kind: paymentKindSchema,
    amountPaisa: paisaSchema,
    /** null for COD */
    trxId: z.string().nullable(),
  }),
});

export const paymentVerified = defineEvent({
  type: 'payment.verified',
  version: 1,
  payload: z.object({
    paymentId: z.uuid(),
    orderId: z.uuid(),
    orderCode: z.string(),
    method: paymentMethodSchema,
    kind: paymentKindSchema,
    amountPaisa: paisaSchema,
    verifiedBy: z.uuid(),
    verifiedAt: z.iso.datetime(),
  }),
});
