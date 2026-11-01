import { z } from 'zod';
import { ORDER_CODE_PATTERN } from '../orders/orders.contracts';
import { bdPhoneSchema } from '../phone';
import { QUOTE_CODE_PATTERN } from '../quotes/quotes.contracts';

/**
 * Privacy requests (ADR 0020): a customer asks to see, correct or delete their personal data, or
 * to withdraw consent. The public side only ever learns a request code and its status; the
 * owner verifies identity and acts on it in the dashboard.
 */
export const PRIVACY_REQUEST_TYPES = [
  'ACCESS',
  'CORRECTION',
  'DELETION',
  'CONSENT_WITHDRAWAL',
] as const;
export type PrivacyRequestType = (typeof PRIVACY_REQUEST_TYPES)[number];

export const PRIVACY_REQUEST_STATUSES = [
  'PENDING',
  'VERIFICATION_REQUIRED',
  'IN_PROGRESS',
  'COMPLETED',
  'REJECTED',
] as const;
export type PrivacyRequestStatus = (typeof PRIVACY_REQUEST_STATUSES)[number];

/** How the owner confirmed the requester controls the phone number on file. */
export const VERIFICATION_METHODS = [
  'CALLED_NUMBER_ON_FILE',
  'WHATSAPP_FROM_NUMBER_ON_FILE',
  'IN_PERSON',
] as const;

export const PRIVACY_CODE_PATTERN = /^PR-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/;
export const privacyCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(PRIVACY_CODE_PATTERN)
  .meta({ example: 'PR-8M4K2P' });

const emptyToUndefined = (v: unknown) => (typeof v === 'string' && !v.trim() ? undefined : v);

export const submitPrivacyRequestSchema = z
  .object({
    type: z.enum(PRIVACY_REQUEST_TYPES),
    phone: bdPhoneSchema,
    /** An order (ZQ-…) or request (QT-…) code: helps find the records, never proves identity. */
    reference: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .trim()
        .toUpperCase()
        .refine((c) => ORDER_CODE_PATTERN.test(c) || QUOTE_CODE_PATTERN.test(c), {
          message: 'Use an order code (ZQ-…) or a request code (QT-…)',
        })
        .optional(),
    ),
    /** Optional, only to reply; never used to look anything up. */
    email: z.preprocess(emptyToUndefined, z.email().max(120).optional()),
    details: z.string().trim().max(1000).default(''),
  })
  .refine((r) => r.type !== 'CORRECTION' || r.details.length >= 5, {
    message: 'Tell us what should be corrected',
    path: ['details'],
  });
export type SubmitPrivacyRequest = z.input<typeof submitPrivacyRequestSchema>;

export const submitPrivacyResultSchema = z.object({ code: privacyCodeSchema });
export type SubmitPrivacyResult = z.infer<typeof submitPrivacyResultSchema>;

export const privacyTrackSchema = z.object({ code: privacyCodeSchema, phone: bdPhoneSchema });

/** All the public side can see: no names, addresses or notes. */
export const publicPrivacyRequestSchema = z.object({
  code: z.string(),
  type: z.enum(PRIVACY_REQUEST_TYPES),
  status: z.enum(PRIVACY_REQUEST_STATUSES),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PublicPrivacyRequest = z.infer<typeof publicPrivacyRequestSchema>;

/** Why a record was kept instead of erased. */
export const RETENTION_REASONS = ['SALE_RECORD', 'CONTRACT_RECORD'] as const;

export const privacyResultSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('ERASURE'),
    erasedOrders: z.array(z.string()),
    erasedQuotes: z.array(z.string()),
    retainedOrders: z.array(z.object({ code: z.string(), reason: z.enum(RETENTION_REASONS) })),
    retainedQuotes: z.array(z.object({ code: z.string(), reason: z.enum(RETENTION_REASONS) })),
    customerFlagDeleted: z.boolean(),
  }),
  z.object({
    kind: z.literal('CORRECTION'),
    fields: z.array(z.enum(['name', 'email'])),
    orders: z.number().int(),
    quotes: z.number().int(),
  }),
  z.object({ kind: z.literal('ACCESS'), exportedAt: z.string() }),
  z.object({ kind: z.literal('NOTE') }),
]);
export type PrivacyResult = z.infer<typeof privacyResultSchema>;

export const adminPrivacyListQuerySchema = z.object({
  status: z.enum(PRIVACY_REQUEST_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

/** The queue: no contact details, so a glance at the list exposes nobody. */
export const privacyListItemSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  type: z.enum(PRIVACY_REQUEST_TYPES),
  status: z.enum(PRIVACY_REQUEST_STATUSES),
  referenceMatched: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const privacyListSchema = z.object({
  items: z.array(privacyListItemSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});
export type PrivacyList = z.infer<typeof privacyListSchema>;

export const privacyRequestDetailSchema = privacyListItemSchema.extend({
  phone: z.string(),
  email: z.string().nullable(),
  reference: z.string().nullable(),
  details: z.string(),
  /** Records found for this phone (counts only). */
  found: z.object({ orders: z.number().int(), quotes: z.number().int() }),
  verification: z
    .object({
      method: z.enum(VERIFICATION_METHODS),
      note: z.string(),
      at: z.string(),
      by: z.string(),
    })
    .nullable(),
  decisionNote: z.string().nullable(),
  result: privacyResultSchema.nullable(),
  resolvedAt: z.string().nullable(),
});
export type PrivacyRequestDetail = z.infer<typeof privacyRequestDetailSchema>;

export const privacyIdSchema = z.object({ id: z.uuid() });
export const verifyPrivacyInputSchema = z.object({
  method: z.enum(VERIFICATION_METHODS),
  note: z.string().trim().max(300).default(''),
});
export const rejectPrivacyInputSchema = z.object({ reason: z.string().trim().min(5).max(500) });
export const correctPrivacyInputSchema = z
  .object({
    name: z.preprocess(emptyToUndefined, z.string().trim().min(2).max(120).optional()),
    email: z.preprocess(emptyToUndefined, z.email().max(120).optional()),
  })
  .refine((c) => c.name || c.email, { message: 'Give a corrected name or email' });
export const completePrivacyInputSchema = z.object({ note: z.string().trim().min(5).max(1000) });
export const askVerificationInputSchema = z.object({
  note: z.string().trim().max(300).default(''),
});

/** Everything order-service holds for one phone number (the "access" answer). */
export const privacyExportSchema = z.object({
  generatedAt: z.string(),
  phone: z.string(),
  orders: z.array(
    z.object({
      code: z.string(),
      createdAt: z.string(),
      status: z.string(),
      name: z.string(),
      address: z.unknown(),
      paymentMethod: z.string(),
      totalPaisa: z.number().int(),
      couponCode: z.string().nullable(),
      items: z.array(
        z.object({ name: z.string(), qty: z.number().int(), unitPricePaisa: z.number().int() }),
      ),
    }),
  ),
  quotes: z.array(
    z.object({
      code: z.string(),
      createdAt: z.string(),
      kind: z.string(),
      status: z.string(),
      contactName: z.string(),
      email: z.string().nullable(),
      organizationName: z.string().nullable(),
      notes: z.string().nullable(),
    }),
  ),
  customerFlag: z.object({ isFriend: z.boolean() }).nullable(),
  /** Data about this person held elsewhere, described rather than copied. */
  elsewhere: z.array(z.string()),
});
export type PrivacyExport = z.infer<typeof privacyExportSchema>;
