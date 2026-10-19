import { z } from 'zod';

export const RESERVATION_STATUSES = ['PENDING', 'HELD', 'COMMITTED', 'RELEASED'] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const RELEASE_REASONS = ['COMPENSATION', 'EXPIRED', 'ORDER_CANCELLED'] as const;
export const releaseReasonSchema = z.enum(RELEASE_REASONS);
export type ReleaseReason = z.infer<typeof releaseReasonSchema>;

export const MOVEMENT_REASONS = ['RECEIPT', 'ADJUSTMENT', 'SALE', 'RETURN'] as const;
export const movementReasonSchema = z.enum(MOVEMENT_REASONS);

export const stockLineSchema = z.object({
  variantId: z.uuid(),
  qty: z.number().int().positive().max(100),
});
export type StockLine = z.infer<typeof stockLineSchema>;

export const reserveStockRequestSchema = z.object({
  orderId: z.uuid(),
  items: z.array(stockLineSchema).min(1).max(50),
});
export type ReserveStockRequest = z.input<typeof reserveStockRequestSchema>;

export interface ReservationView {
  reservationId: string;
  orderId: string;
  status: ReservationStatus;
  expiresAt: string;
  items: StockLine[];
}

export const releaseStockRequestSchema = z.object({
  orderId: z.uuid(),
  reason: releaseReasonSchema,
});
export type ReleaseStockRequest = z.input<typeof releaseStockRequestSchema>;

export const stockLevelsRequestSchema = z.object({ variantIds: z.array(z.uuid()).min(1).max(100) });
/** variantId -> available (onHand - reserved); variants without an inventory row are absent. */
export type StockLevels = Record<string, number>;

export const adjustStockInputSchema = z.object({
  variantId: z.uuid(),
  sku: z.string().min(1).max(64),
  delta: z
    .number()
    .int()
    .refine((n) => n !== 0, 'delta must not be 0'),
  reason: movementReasonSchema.exclude(['SALE']),
  note: z.string().max(300).nullable().default(null),
});
export type AdjustStockInput = z.input<typeof adjustStockInputSchema>;

export const stockListQuerySchema = z.object({ variantIds: z.array(z.uuid()).max(200).optional() });
export interface StockLevelView {
  variantId: string;
  sku: string;
  onHand: number;
  reserved: number;
  available: number;
  updatedAt: string;
}
