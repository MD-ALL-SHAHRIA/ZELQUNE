import { z } from 'zod';
import { paisaSchema } from '../catalog/catalog.contracts';
import { addressSchema, utmSchema } from '../orders/orders.contracts';
import { paymentMethodSchema, trxIdSchema } from '../payments/payments.contracts';
import { bdPhoneSchema } from '../phone';
import { districtCodeSchema } from '../shipping/shipping.contracts';

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

/**
 * PRODUCT: bulk/corporate order of catalog products (priced into a B2B order, ADR 0011).
 * DESIGN: interior design consultation for a space (a lead for now; ADR 0014).
 */
export const QUOTE_KINDS = ['PRODUCT', 'DESIGN'] as const;
export const quoteKindSchema = z.enum(QUOTE_KINDS);
export type QuoteKind = z.infer<typeof quoteKindSchema>;

export const SPACE_TYPES = [
  'HOME',
  'OFFICE',
  'RESTAURANT_CAFE',
  'HOTEL',
  'RETAIL',
  'OTHER',
] as const;
export const spaceTypeSchema = z.enum(SPACE_TYPES);
export type SpaceType = z.infer<typeof spaceTypeSchema>;

export const BUDGET_RANGES = [
  'UNDER_1_LAKH',
  'LAKH_1_TO_5',
  'LAKH_5_TO_15',
  'ABOVE_15_LAKH',
  'NOT_SURE',
] as const;
export const budgetRangeSchema = z.enum(BUDGET_RANGES);

/** What the client tells us about the space for a design consultation. */
export const designBriefSchema = z.object({
  spaceType: spaceTypeSchema,
  sizeSqft: z.number().int().min(20).max(1_000_000).nullable().default(null),
  district: districtCodeSchema.nullable().default(null),
  budget: budgetRangeSchema.default('NOT_SURE'),
});
export type DesignBrief = z.output<typeof designBriefSchema>;

export const designBriefViewSchema = z.object({
  spaceType: spaceTypeSchema,
  sizeSqft: z.number().int().nullable(),
  district: z.string().nullable(),
  budget: budgetRangeSchema,
});

export const rfqRequestSchema = z
  .object({
    kind: quoteKindSchema.default('PRODUCT'),
    /** Required for PRODUCT requests; optional for DESIGN (a home has no company). */
    organizationName: z.string().trim().min(2).max(150).nullable().default(null),
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
      .max(50)
      .default([]),
    /** Required for DESIGN requests. */
    design: designBriefSchema.nullable().default(null),
    neededBy: z.iso.date().nullable().default(null),
    /** Custom work: logo engraving, size changes, finishes. */
    customizationNotes: z.string().trim().max(2000).nullable().default(null),
    notes: z.string().trim().max(2000).nullable().default(null),
    utm: utmSchema,
  })
  .superRefine((v, ctx) => {
    if (v.kind === 'PRODUCT') {
      if (!v.organizationName) {
        ctx.addIssue({ code: 'custom', path: ['organizationName'], message: 'Required' });
      }
      if (!v.items.length) {
        ctx.addIssue({ code: 'custom', path: ['items'], message: 'At least one item' });
      }
      if (v.design) {
        ctx.addIssue({ code: 'custom', path: ['design'], message: 'Only for DESIGN requests' });
      }
    } else if (!v.design) {
      ctx.addIssue({ code: 'custom', path: ['design'], message: 'Required for DESIGN requests' });
    }
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
  kind: quoteKindSchema,
  design: designBriefViewSchema.nullable(),
  status: quoteStatusSchema,
  organizationName: z.string().nullable(),
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
  kind: quoteKindSchema.optional(),
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
