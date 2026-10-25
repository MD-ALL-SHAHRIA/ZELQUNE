import { createZodDto } from '@zelqune/common';
import {
  couponListSchema,
  couponSchema,
  customerListQuerySchema,
  customerListSchema,
  expenseListQuerySchema,
  expenseListSchema,
  expenseSchema,
  profitLossSchema,
  promotionListSchema,
  promotionSchema,
  reportRangeQuerySchema,
  salesReportSchema,
  upsertCouponSchema,
  upsertExpenseSchema,
  upsertPromotionSchema,
} from '@zelqune/contracts';
import { z } from 'zod';

// marketing
export class UpsertCouponDto extends createZodDto(upsertCouponSchema) {}
export class CouponDto extends createZodDto(couponSchema) {}
export class CouponListDto extends createZodDto(couponListSchema) {}
export class UpsertPromotionDto extends createZodDto(upsertPromotionSchema) {}
export class PromotionDto extends createZodDto(promotionSchema) {}
export class PromotionListDto extends createZodDto(promotionListSchema) {}
export class DeletedDto extends createZodDto(z.object({ deleted: z.boolean() })) {}

// reports and finance
export class ReportRangeQueryDto extends createZodDto(reportRangeQuerySchema) {}
export class SalesReportDto extends createZodDto(salesReportSchema) {}
export class CustomerListQueryDto extends createZodDto(customerListQuerySchema) {}
export class CustomerListDto extends createZodDto(customerListSchema) {}
export class ExpenseListQueryDto extends createZodDto(expenseListQuerySchema) {}
export class ExpenseListDto extends createZodDto(expenseListSchema) {}
export class UpsertExpenseDto extends createZodDto(upsertExpenseSchema) {}
export class ExpenseDto extends createZodDto(expenseSchema) {}
export class ProfitLossDto extends createZodDto(profitLossSchema) {}
