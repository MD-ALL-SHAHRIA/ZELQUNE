import { z } from 'zod';
import { paisaSchema } from '../catalog/catalog.contracts';

/**
 * Store settings the owner edits in the dashboard (ADR 0017). Each group lives in the service
 * that uses it; until it is first saved, the service's env values are the defaults.
 */

/**
 * A Bangladeshi mobile number as typed (01XXXXXXXXX or +8801XXXXXXXXX). Validated without a
 * transform so these schemas stay representable in OpenAPI; services normalize with
 * normalizeBdPhone.
 */
export const bdPhoneInputSchema = z
  .string()
  .trim()
  .regex(/^(?:\+?880|0)1[3-9]\d{8}$/, 'A Bangladeshi mobile number, e.g. 01711000000');

const ACCOUNT_TYPES = ['personal', 'agent', 'merchant'] as const;
const wallet = z.object({
  /** Receiving number; null = this method is not offered at checkout. */
  number: bdPhoneInputSchema.nullable(),
  accountType: z.enum(ACCOUNT_TYPES),
});
export const paymentSettingsSchema = z.object({ bkash: wallet, nagad: wallet });
export type PaymentSettings = z.infer<typeof paymentSettingsSchema>;
/** As stored and returned (phones already normalized to +8801XXXXXXXXX). */
const walletView = z.object({ number: z.string().nullable(), accountType: z.enum(ACCOUNT_TYPES) });
export const paymentSettingsViewSchema = z.object({ bkash: walletView, nagad: walletView });

export const checkoutSettingsSchema = z.object({
  /** fixed: one amount per order (capped at the total); percent: of the product subtotal. */
  advanceMode: z.enum(['fixed', 'percent']),
  advanceFixedPaisa: paisaSchema.min(100),
  advancePercent: z.number().int().min(1).max(100),
});
export type CheckoutSettings = z.infer<typeof checkoutSettingsSchema>;

export const shippingSettingsSchema = z.object({
  dhakaFeePaisa: paisaSchema,
  suburbFeePaisa: paisaSchema,
  outsideFeePaisa: paisaSchema,
  /** Weight included in the zone fee. */
  baseWeightGrams: z.number().int().min(100).max(50_000),
  extraPerKgPaisa: paisaSchema,
});
export type ShippingSettings = z.infer<typeof shippingSettingsSchema>;

export const notificationSettingsSchema = z.object({
  /** Gets an SMS for new bulk, design and construction requests. null = no alerts. */
  ownerPhone: bdPhoneInputSchema.nullable(),
});
export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;
export const notificationSettingsViewSchema = z.object({ ownerPhone: z.string().nullable() });

/** Every setting, with when and by whom each group was last changed. */
const meta = z.object({ updatedAt: z.string().nullable(), updatedBy: z.string().nullable() });
export const settingsViewSchema = <T extends z.ZodType>(value: T) => z.object({ value, meta });
export interface SettingsView<T> {
  value: T;
  meta: { updatedAt: string | null; updatedBy: string | null };
}

// ---------- Team (identity-service) ----------

export const TEAM_ROLES = ['OWNER', 'STAFF'] as const;
export const teamMemberSchema = z.object({
  id: z.uuid(),
  phone: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  role: z.enum(TEAM_ROLES),
  isActive: z.boolean(),
  lastLoginAt: z.string().nullable(),
  createdAt: z.string(),
});
export type TeamMember = z.infer<typeof teamMemberSchema>;
export const teamListSchema = z.object({ items: z.array(teamMemberSchema) });

const passwordSchema = z
  .string()
  .min(10, 'At least 10 characters')
  .max(128)
  .refine((v) => /[a-zA-Z]/.test(v) && /\d/.test(v), 'Use letters and numbers');

export const createTeamMemberSchema = z.object({
  phone: bdPhoneInputSchema,
  name: z.string().trim().min(2).max(100),
  email: z
    .union([z.email().max(120), z.literal('')])
    .nullable()
    .default(null),
  role: z.enum(TEAM_ROLES).default('STAFF'),
  password: passwordSchema,
});
export type CreateTeamMemberInput = z.input<typeof createTeamMemberSchema>;

export const updateTeamMemberSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.union([z.email().max(120), z.literal('')]).nullable(),
    role: z.enum(TEAM_ROLES),
    isActive: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'No changes');
export type UpdateTeamMemberInput = z.input<typeof updateTeamMemberSchema>;

export const resetPasswordSchema = z.object({ password: passwordSchema });
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});
export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.union([z.email().max(120), z.literal('')]).nullable(),
});
