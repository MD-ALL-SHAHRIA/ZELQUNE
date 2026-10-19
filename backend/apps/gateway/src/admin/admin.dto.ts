import { createZodDto } from '@zelqune/common';
import {
  addOrderNoteSchema,
  adminCategorySchema,
  adminOrderDetailSchema,
  adminOrderExportQuerySchema,
  adminOrderListQuerySchema,
  adminOrderListSchema,
  adminProductListQuerySchema,
  adminProductListSchema,
  adminProductSchema,
  adminQuoteListQuerySchema,
  adminQuoteListSchema,
  adminQuoteSchema,
  adjustStockInputSchema,
  auditLogPageSchema,
  auditLogQuerySchema,
  convertQuoteInputSchema,
  courierSchema,
  createCategoryInputSchema,
  createProductInputSchema,
  dashboardQuerySchema,
  dashboardStatsSchema,
  decideQuoteInputSchema,
  experimentKeySchema,
  MEDIA_MIME_TYPES,
  MAX_MEDIA_BYTES,
  paisaSchema,
  paymentSummarySchema,
  priceListIdSchema,
  priceQuoteInputSchema,
  setFriendSchema,
  shipmentStatusSchema,
  shipmentSummarySchema,
  transitionRequestSchema,
  upsertVariantInputSchema,
} from '@zelqune/contracts';
import { z } from 'zod';

const uuid = z.uuid();
export class IdParamDto extends createZodDto(z.object({ id: uuid })) {}
export class PhoneParamDto extends createZodDto(z.object({ phone: z.string().min(10).max(20) })) {}
export class VariantSkuParamDto extends createZodDto(
  z.object({ id: uuid, sku: z.string().regex(/^[A-Z0-9-]{1,64}$/) }),
) {}
export class VariantKeyParamDto extends createZodDto(
  z.object({ id: uuid, key: experimentKeySchema }),
) {}

// orders
export class AdminOrderListQueryDto extends createZodDto(adminOrderListQuerySchema) {}
export class AdminOrderExportQueryDto extends createZodDto(adminOrderExportQuerySchema) {}
export class AdminOrderListDto extends createZodDto(adminOrderListSchema) {}
export class AdminOrderDetailDto extends createZodDto(adminOrderDetailSchema) {}
export class TransitionRequestDto extends createZodDto(transitionRequestSchema) {}
export class AddOrderNoteDto extends createZodDto(addOrderNoteSchema) {}
export class SetFriendDto extends createZodDto(setFriendSchema) {}
export class CreateShipmentDto extends createZodDto(
  z.object({
    courier: courierSchema.default('MANUAL'),
    consignmentId: z.string().trim().min(1).max(64).nullable().default(null),
    trackingUrl: z.url().nullable().default(null),
  }),
) {}
export class UpdateShipmentDto extends createZodDto(z.object({ status: shipmentStatusSchema })) {}
export class ShipmentDto extends createZodDto(shipmentSummarySchema) {}

// payments
export class VerifyPaymentDto extends createZodDto(
  z.object({ amountReceivedPaisa: paisaSchema }),
) {}
export class RejectPaymentDto extends createZodDto(
  z.object({ reason: z.string().trim().min(3).max(300) }),
) {}
export class PaymentDto extends createZodDto(paymentSummarySchema) {}

// catalog
export class AdminProductListQueryDto extends createZodDto(adminProductListQuerySchema) {}
export class AdminProductListDto extends createZodDto(adminProductListSchema) {}
export class AdminProductDto extends createZodDto(adminProductSchema) {}
export class AdminCategoryListDto extends createZodDto(
  z.object({ items: z.array(adminCategorySchema) }),
) {}
export class CreateCategoryDto extends createZodDto(createCategoryInputSchema) {}
export class UpdateCategoryDto extends createZodDto(
  createCategoryInputSchema.extend({ isActive: z.boolean() }).partial(),
) {}
export class CreateProductDto extends createZodDto(createProductInputSchema) {}
export class UpdateProductDto extends createZodDto(createProductInputSchema.partial()) {}
export class UpsertVariantDto extends createZodDto(
  upsertVariantInputSchema.omit({ productId: true, sku: true }),
) {}
export class SetPriceDto extends createZodDto(
  z.object({
    amountPaisa: paisaSchema,
    compareAtPaisa: paisaSchema.nullable().default(null),
    priceListId: priceListIdSchema.default('RETAIL'),
  }),
) {}
export class SetExperimentDto extends createZodDto(
  z.object({ amountPaisa: paisaSchema, active: z.boolean().default(true) }),
) {}
export class RequestMediaUploadDto extends createZodDto(
  z.object({
    variantId: uuid.nullable().default(null),
    mimeType: z.enum(MEDIA_MIME_TYPES),
    bytes: z.number().int().positive().max(MAX_MEDIA_BYTES),
    altBn: z.string().max(200).nullable().default(null),
    altEn: z.string().max(200).nullable().default(null),
    position: z.number().int().default(0),
  }),
) {}

// stock
export class StockQueryDto extends createZodDto(
  z.object({ variantIds: z.string().max(4000).optional() }),
) {}
export class AdjustStockDto extends createZodDto(
  adjustStockInputSchema.omit({ variantId: true }),
) {}

// analytics
export class DashboardQueryDto extends createZodDto(dashboardQuerySchema) {}
export class DashboardStatsDto extends createZodDto(dashboardStatsSchema) {}
export class AuditLogQueryDto extends createZodDto(auditLogQuerySchema) {}
export class AuditLogPageDto extends createZodDto(auditLogPageSchema) {}

// quotes
export class AdminQuoteListQueryDto extends createZodDto(adminQuoteListQuerySchema) {}
export class AdminQuoteListDto extends createZodDto(adminQuoteListSchema) {}
export class AdminQuoteDto extends createZodDto(adminQuoteSchema) {}
export class PriceQuoteDto extends createZodDto(priceQuoteInputSchema) {}
export class DecideQuoteDto extends createZodDto(decideQuoteInputSchema) {}
export class ConvertQuoteDto extends createZodDto(convertQuoteInputSchema) {}
export class ConvertedQuoteDto extends createZodDto(
  z.object({ orderCode: z.string(), orderId: uuid }),
) {}

// small write results
export class IdDto extends createZodDto(z.object({ id: uuid })) {}
export class ChangedDto extends createZodDto(
  z.object({ id: uuid, changedFields: z.array(z.string()) }),
) {}
export class StatusDto extends createZodDto(z.object({ status: z.string() })) {}
export class ChangedFlagDto extends createZodDto(z.object({ changed: z.boolean() })) {}
export class FriendDto extends createZodDto(
  z.object({ phone: z.string(), isFriend: z.boolean() }),
) {}
export class StockLevelDto extends createZodDto(
  z.object({
    variantId: uuid,
    sku: z.string(),
    onHand: z.number().int(),
    reserved: z.number().int(),
    available: z.number().int(),
    updatedAt: z.string(),
  }),
) {}
export class StockListDto extends createZodDto(
  z.object({ items: z.array(StockLevelDto.schema) }),
) {}
export class StockAdjustedDto extends createZodDto(
  z.object({ onHand: z.number().int(), reserved: z.number().int() }),
) {}
export class MediaTicketDto extends createZodDto(
  z.object({
    mediaId: uuid,
    uploadUrl: z.string(),
    method: z.literal('PUT'),
    headers: z.record(z.string(), z.string()),
    expiresAt: z.string(),
  }),
) {}
