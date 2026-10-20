import { z } from 'zod';
import { paisaSchema } from '../catalog/catalog.contracts';

export const SHIPPING_ZONES = ['DHAKA', 'SUBURB', 'OUTSIDE'] as const;
export const shippingZoneSchema = z.enum(SHIPPING_ZONES);
export type ShippingZoneCode = z.infer<typeof shippingZoneSchema>;

export const COURIERS = ['MANUAL', 'STEADFAST', 'PAPERFLY', 'PATHAO'] as const;
export const courierSchema = z.enum(COURIERS);
export type Courier = z.infer<typeof courierSchema>;

export const SHIPMENT_STATUSES = [
  'PENDING',
  'BOOKED',
  'PICKED_UP',
  'IN_TRANSIT',
  'DELIVERED',
  'RETURNED',
  'CANCELLED',
] as const;
export const shipmentStatusSchema = z.enum(SHIPMENT_STATUSES);
export type ShipmentStatus = z.infer<typeof shipmentStatusSchema>;

/** District slug, e.g. "dhaka", "coxs-bazar". */
export const districtCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z]+(?:-[a-z]+)*$/)
  .max(40);
export const areaSchema = z.string().trim().min(2).max(100);

export const districtSchema = z.object({
  code: z.string(),
  nameBn: z.string(),
  nameEn: z.string(),
  division: z.string(),
});
export type DistrictView = z.infer<typeof districtSchema>;
export const districtListResponseSchema = z.object({ items: z.array(districtSchema) });

/** One parcel line: packaged size/weight of a variant times quantity (nulls fall back to config). */
export const parcelLineSchema = z.object({
  qty: z.number().int().positive(),
  packageWeightGrams: z.number().int().positive().nullable(),
  packageLengthMm: z.number().int().positive().nullable(),
  packageWidthMm: z.number().int().positive().nullable(),
  packageHeightMm: z.number().int().positive().nullable(),
});
export type ParcelLine = z.infer<typeof parcelLineSchema>;

export const shippingQuoteRequestSchema = z.object({
  district: districtCodeSchema,
  area: areaSchema.optional(),
  lines: z.array(parcelLineSchema).min(1).max(50),
});
export type ShippingQuoteRequest = z.input<typeof shippingQuoteRequestSchema>;

export const shippingQuoteSchema = z.object({
  zone: shippingZoneSchema,
  district: z.string(),
  actualWeightGrams: z.number().int().nonnegative(),
  volumetricWeightGrams: z.number().int().nonnegative(),
  /** max(actual, volumetric), rounded up to whole kg for pricing. */
  chargeableWeightGrams: z.number().int().positive(),
  feePaisa: paisaSchema,
});
export type ShippingQuote = z.infer<typeof shippingQuoteSchema>;

export const shipmentSummarySchema = z.object({
  courier: courierSchema,
  status: shipmentStatusSchema,
  consignmentId: z.string().nullable(),
  trackingUrl: z.string().nullable(),
});
export type ShipmentSummary = z.infer<typeof shipmentSummarySchema>;

export const createShipmentInputSchema = z.object({
  orderId: z.uuid(),
  courier: courierSchema.default('MANUAL'),
  consignmentId: z.string().trim().min(1).max(64).nullable().default(null),
  trackingUrl: z.url().nullable().default(null),
});
export type CreateShipmentInput = z.input<typeof createShipmentInputSchema>;

export const updateShipmentStatusInputSchema = z.object({
  orderId: z.uuid(),
  status: shipmentStatusSchema,
});
export type UpdateShipmentStatusInput = z.input<typeof updateShipmentStatusInputSchema>;

/** Public delivery fee estimate for one variant (product page), before a cart exists. */
export const shippingEstimateQuerySchema = z.object({
  district: districtCodeSchema,
  variantId: z.uuid(),
  // Sanity bound only; the cart enforces the real per-line limit.
  qty: z.coerce.number().int().min(1).max(100).default(1),
});
export type ShippingEstimateQuery = z.infer<typeof shippingEstimateQuerySchema>;

export const shippingEstimateSchema = z.object({
  district: z.string(),
  zone: shippingZoneSchema,
  chargeableWeightGrams: z.number().int().positive(),
  feePaisa: paisaSchema,
});
export type ShippingEstimate = z.infer<typeof shippingEstimateSchema>;
