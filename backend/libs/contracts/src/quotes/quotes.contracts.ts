import { z } from 'zod';
import { paisaSchema } from '../catalog/catalog.contracts';
import { addressSchema, utmSchema } from '../orders/orders.contracts';
import { paymentMethodSchema, trxIdSchema } from '../payments/payments.contracts';
import { bdPhoneSchema } from '../phone';

export const QUOTE_STATUSES = ['NEW', 'QUOTED', 'ACCEPTED', 'REJECTED', 'EXPIRED'] as const;
export const quoteStatusSchema = z.enum(QUOTE_STATUSES);
export type QuoteStatus = z.infer<typeof quoteStatusSchema>;

export const QUOTE_CODE_PATTERN = /^QT-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/;
export const quoteCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(QUOTE_CODE_PATTERN)
  .meta({ example: 'QT-8M4K2P' });

/** Sanity bound only: B2B quotes have no business cap on quantity. */
export const MAX_QUOTE_LINE_QTY = 100_000;

// ---------- Public RFQ ----------

export const rfqRequestSchema = z.object({
  organizationName: z.string().trim().min(2).max(150),
  contactName: z.string().trim().min(2).max(100),
  phone: bdPhoneSchema,
  email: z.email().max(200).nullable().default(null),
  items: z
    .array(
      z.object({
        /** Optional link to a catalog product/variant if the customer picked one. */
        productSlug: z.string().max(120).nullable().default(null),
        variantId: z.uuid().nullable().default(null),
        description: z.string().trim().min(2).max(300),
        qty: z.number().int().min(1).max(MAX_QUOTE_LINE_QTY),
      }),
    )
    .min(1)
    .max(50),
  neededBy: z.iso.date().nullable().default(null),
  /** Custom work: logo engraving, size changes, finishes. */
  customizationNotes: z.string().trim().max(2000).nullable().default(null),
  notes: z.string().trim().max(2000).nullable().default(null),
  utm: utmSchema,
});
export type RfqRequest = z.input<typeof rfqRequestSchema>;

export const rfqResponseSchema = z.object({
  quoteCode: z.string(),
  status: quoteStatusSchema,
});
export type RfqResponse = z.infer<typeof rfqResponseSchema>;

export const quoteTrackQuerySchema = z.object({ code: quoteCodeSchema, phone: bdPhoneSchema });

export const quoteLineViewSchema = z.object({
  id: z.uuid(),
  description: z.string(),
  qty: z.number().int(),
  variantId: z.uuid().nullable(),
  sku: z.string().nullable(),
  unitPricePaisa: paisaSchema.nullable(),
  lineTotalPaisa: paisaSchema.nullable(),
});

export const quoteTotalsSchema = z.object({
  subtotalPaisa: paisaSchema,
  shippingFeePaisa: paisaSchema,
  totalPaisa: paisaSchema,
  advanceRequiredPaisa: paisaSchema,
});

/** What the requester can see with code + phone. */
export const publicQuoteSchema = z.object({
  code: z.string(),
  status: quoteStatusSchema,
  organizationName: z.string(),
  neededBy: z.string().nullable(),
  validUntil: z.string().nullable(),
  lines: z.array(quoteLineViewSchema.omit({ variantId: true, sku: true })),
  totals: quoteTotalsSchema.nullable(),
  orderCode: z.string().nullable(),
});
export type PublicQuote = z.infer<typeof publicQuoteSchema>;

// ---------- Admin ----------

export const adminQuoteSchema = publicQuoteSchema.extend({
  id: z.uuid(),
  contactName: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  customizationNotes: z.string().nullable(),
  notes: z.string().nullable(),
  lines: z.array(quoteLineViewSchema),
  quotedAt: z.string().nullable(),
  quotedBy: z.string().nullable(),
  createdAt: z.string(),
  orderId: z.uuid().nullable(),
});
export type AdminQuote = z.infer<typeof adminQuoteSchema>;

export const adminQuoteListQuerySchema = z.object({
  status: quoteStatusSchema.optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export const adminQuoteListSchema = z.object({
  items: z.array(adminQuoteSchema.omit({ lines: true })),
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
});

export const priceQuoteInputSchema = z.object({
  lines: z
    .array(z.object({ lineId: z.uuid(), variantId: z.uuid(), unitPricePaisa: paisaSchema }))
    .min(1),
  shippingFeePaisa: paisaSchema.default(0),
  advanceRequiredPaisa: paisaSchema,
  /** Defaults to now + QUOTE_VALIDITY_DAYS (7). */
  validUntil: z.iso.datetime().optional(),
  /** OWNER only: allow prices more than B2B_MAX_DISCOUNT_PERCENT below retail. */
  allowDeepDiscount: z.boolean().default(false),
});
export type PriceQuoteInput = z.input<typeof priceQuoteInputSchema>;

export const decideQuoteInputSchema = z.object({
  reason: z.string().trim().max(300).nullable().default(null),
});

export const convertQuoteInputSchema = z
  .object({
    address: addressSchema,
    paymentMethod: paymentMethodSchema,
    trxId: trxIdSchema.nullable().default(null),
    payerPhone: bdPhoneSchema.nullable().default(null),
  })
  .refine((v) => v.paymentMethod === 'COD' || v.trxId !== null, {
    message: 'Transaction ID is required for bKash/Nagad',
    path: ['trxId'],
  });
export type ConvertQuoteInput = z.input<typeof convertQuoteInputSchema>;
