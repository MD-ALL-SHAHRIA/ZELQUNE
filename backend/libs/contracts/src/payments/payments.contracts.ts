import { z } from 'zod';
import { paisaSchema } from '../catalog/catalog.contracts';
import { bdPhoneSchema } from '../phone';

export const PAYMENT_METHODS = ['COD', 'BKASH_MANUAL', 'NAGAD_MANUAL'] as const;
export const paymentMethodSchema = z.enum(PAYMENT_METHODS);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export const MANUAL_METHODS: readonly PaymentMethod[] = ['BKASH_MANUAL', 'NAGAD_MANUAL'];

/** ADVANCE = pre-order/made-to-order deposit; FULL = whole total paid upfront; COD = on delivery. */
export const PAYMENT_KINDS = ['ADVANCE', 'FULL', 'COD'] as const;
export const paymentKindSchema = z.enum(PAYMENT_KINDS);
export type PaymentKind = z.infer<typeof paymentKindSchema>;

export const PAYMENT_STATUSES = [
  'SUBMITTED',
  'VERIFIED',
  'REJECTED',
  'COD_PENDING',
  'COD_CONFIRMED',
  'COLLECTED',
  'VOID',
] as const;
export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

/** bKash/Nagad transaction id: case-insensitive, separators ignored, stored uppercase. */
export const trxIdSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, '').toUpperCase())
  .pipe(z.string().regex(/^[A-Z0-9]{6,20}$/, 'Transaction ID must be 6-20 letters/digits'))
  .meta({ example: '8N7A6B5C4D' });

export const createPaymentRequestSchema = z.object({
  orderId: z.uuid(),
  orderCode: z.string(),
  method: paymentMethodSchema,
  kind: paymentKindSchema,
  amountPaisa: paisaSchema.refine((n) => n > 0, 'amount must be positive'),
  trxId: trxIdSchema.nullable().default(null),
  payerPhone: bdPhoneSchema.nullable().default(null),
});
export type CreatePaymentRequest = z.input<typeof createPaymentRequestSchema>;

export const paymentSummarySchema = z.object({
  id: z.uuid(),
  method: paymentMethodSchema,
  kind: paymentKindSchema,
  status: paymentStatusSchema,
  amountPaisa: paisaSchema,
  /** Last 4 characters only, for the customer's reference. */
  trxIdLast4: z.string().nullable(),
});
export type PaymentSummary = z.infer<typeof paymentSummarySchema>;

export const voidPaymentRequestSchema = z.object({
  orderId: z.uuid(),
  reason: z.string().max(100),
});

export const verifyPaymentInputSchema = z.object({
  paymentId: z.uuid(),
  verifiedBy: z.uuid(),
  /** What actually arrived in the bKash/Nagad account; must equal the expected amount. */
  amountReceivedPaisa: paisaSchema,
});
export type VerifyPaymentInput = z.input<typeof verifyPaymentInputSchema>;

export const rejectPaymentInputSchema = z.object({
  paymentId: z.uuid(),
  rejectedBy: z.uuid(),
  reason: z.string().trim().min(3).max(300),
});

export const confirmCodInputSchema = z.object({ paymentId: z.uuid(), confirmedBy: z.uuid() });
export type ConfirmCodInput = z.input<typeof confirmCodInputSchema>;

/** Where customers send manual mobile payments. */
export const paymentInstructionsSchema = z.object({
  bkash: z.object({ number: z.string(), accountType: z.string() }).nullable(),
  nagad: z.object({ number: z.string(), accountType: z.string() }).nullable(),
});
export type PaymentInstructions = z.infer<typeof paymentInstructionsSchema>;
