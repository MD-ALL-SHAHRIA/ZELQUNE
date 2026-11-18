import { z } from 'zod';
import { paisaSchema } from '../catalog/catalog.contracts';
import { BD_AREAS, BD_DIVISIONS } from './bd-geo';

/** PICKUP: collected from the workshop, no courier and no fee. */
export const SHIPPING_ZONES = ['DHAKA', 'SUBURB', 'OUTSIDE', 'PICKUP'] as const;
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
/** An area code from BD_AREAS (storefront) or, for staff-entered addresses, free text. */
export const areaSchema = z.string().trim().min(2).max(100);

/** Home delivery by courier, or collected from the workshop (free). */
export const DELIVERY_METHODS = ['HOME', 'PICKUP'] as const;
export const deliveryMethodSchema = z.enum(DELIVERY_METHODS);
export type DeliveryMethod = z.infer<typeof deliveryMethodSchema>;

/** Where the parcel goes, as on a courier label. */
export const ADDRESS_LABELS = ['HOME', 'OFFICE'] as const;
export const addressLabelSchema = z.enum(ADDRESS_LABELS);
export type AddressLabel = z.infer<typeof addressLabelSchema>;

export interface AreaView {
  code: string;
  nameEn: string;
  nameBn: string;
  /** Dhaka city thana (inside Dhaka) or an upazila. */
  city: boolean;
}

/** The areas (upazilas, and Dhaka's city thanas) of one district, or [] for an unknown one. */
export function areasOf(district: string): AreaView[] {
  return (BD_AREAS[district] ?? []).map(([code, nameEn, nameBn, kind]) => ({
    code,
    nameEn,
    nameBn,
    city: kind === 'c',
  }));
}

/** The area with this code in this district, if any (codes are unique per district). */
export function findArea(district: string, area: string): AreaView | undefined {
  return areasOf(district).find((a) => a.code === area);
}

/** Bangla name of a division, by its English name. */
export function divisionBn(division: string): string {
  return BD_DIVISIONS[division] ?? division;
}

const areaViewSchema = z.object({
  code: z.string(),
  nameEn: z.string(),
  nameBn: z.string(),
  city: z.boolean(),
});

export const districtSchema = z.object({
  code: z.string(),
  nameBn: z.string(),
  nameEn: z.string(),
  division: z.string(),
  divisionBn: z.string(),
  areas: z.array(areaViewSchema),
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
  delivery: deliveryMethodSchema.default('HOME'),
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
  // http(s) only: the link is shown to customers and staff.
  trackingUrl: z.httpUrl().max(500).nullable().default(null),
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
