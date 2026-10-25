import { z } from 'zod';
import { paisaSchema } from '../catalog/catalog.contracts';

/** Calendar days in Bangladesh time; default the last 30 days. */
export const reportRangeQuerySchema = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});
export type ReportRangeQuery = z.output<typeof reportRangeQuerySchema>;

const money = paisaSchema;

/**
 * Sales: orders confirmed in the range and not cancelled, returned or refunded
 * (`counted`), plus what was lost to cancellations and returns.
 */
export const salesReportSchema = z.object({
  range: z.object({ from: z.string(), to: z.string() }),
  totals: z.object({
    orders: z.number().int(),
    units: z.number().int(),
    grossPaisa: money,
    discountPaisa: money,
    shippingPaisa: money,
    /** gross - discount + shipping */
    netPaisa: money,
    averageOrderPaisa: money,
    customers: z.number().int(),
    repeatCustomers: z.number().int(),
    cancelledOrders: z.number().int(),
    cancelledPaisa: money,
    returnedOrders: z.number().int(),
    returnedPaisa: money,
  }),
  byDay: z.array(z.object({ date: z.string(), orders: z.number().int(), netPaisa: money })),
  byProduct: z.array(
    z.object({
      productId: z.uuid(),
      nameEn: z.string(),
      nameBn: z.string(),
      units: z.number().int(),
      orders: z.number().int(),
      revenuePaisa: money,
    }),
  ),
  byVariant: z.array(
    z.object({
      variantId: z.uuid(),
      productId: z.uuid(),
      sku: z.string(),
      nameEn: z.string(),
      units: z.number().int(),
      revenuePaisa: money,
    }),
  ),
  byDistrict: z.array(
    z.object({ district: z.string(), orders: z.number().int(), netPaisa: money }),
  ),
  byPaymentMethod: z.array(
    z.object({ method: z.string(), orders: z.number().int(), netPaisa: money }),
  ),
  bySaleMode: z.array(
    z.object({ saleMode: z.string(), orders: z.number().int(), netPaisa: money }),
  ),
  byChannel: z.array(z.object({ channel: z.string(), orders: z.number().int(), netPaisa: money })),
  byCoupon: z.array(z.object({ code: z.string(), orders: z.number().int(), discountPaisa: money })),
  /** Orders by status (created in range), the shape of the pipeline. */
  byStatus: z.array(z.object({ status: z.string(), orders: z.number().int() })),
});
export type SalesReport = z.infer<typeof salesReportSchema>;

export const customerListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  sort: z.enum(['recent', 'spent', 'orders']).default('recent'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type CustomerListQuery = z.output<typeof customerListQuerySchema>;

export const customerSummarySchema = z.object({
  phone: z.string(),
  name: z.string(),
  district: z.string().nullable(),
  orders: z.number().int(),
  /** Counted (confirmed, not cancelled/returned) orders. */
  paidOrders: z.number().int(),
  spentPaisa: money,
  firstOrderAt: z.string(),
  lastOrderAt: z.string(),
  isFriend: z.boolean(),
  channels: z.array(z.string()),
});
export type CustomerSummary = z.infer<typeof customerSummarySchema>;

export const customerListSchema = z.object({
  items: z.array(customerSummarySchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  stats: z.object({
    customers: z.number().int(),
    repeat: z.number().int(),
    spentPaisa: money,
  }),
});
export type CustomerList = z.infer<typeof customerListSchema>;

/** Units sold per variant (counted orders in range), for cost of goods. */
export const unitsSoldSchema = z.object({
  items: z.array(
    z.object({
      /** YYYY-MM (Bangladesh time). */
      month: z.string(),
      variantId: z.uuid(),
      sku: z.string(),
      units: z.number().int(),
      revenuePaisa: money,
    }),
  ),
  /** Per month: product sales after discount, and shipping charged. */
  months: z.array(
    z.object({
      month: z.string(),
      grossPaisa: money,
      discountPaisa: money,
      shippingPaisa: money,
    }),
  ),
});

// ---------- Expenses (analytics-service) ----------

export const EXPENSE_CATEGORIES = [
  'MATERIALS',
  'PACKAGING',
  'DELIVERY',
  'MARKETING',
  'SALARIES',
  'RENT',
  'UTILITIES',
  'TOOLS',
  'FEES',
  'OTHER',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const upsertExpenseSchema = z.object({
  date: z.iso.date(),
  category: z.enum(EXPENSE_CATEGORIES),
  amountPaisa: z.number().int().positive(),
  description: z.string().trim().min(2).max(200),
  vendor: z.string().trim().max(100).nullable().default(null),
});
export type UpsertExpenseInput = z.input<typeof upsertExpenseSchema>;

export const expenseSchema = z.object({
  id: z.uuid(),
  date: z.string(),
  category: z.enum(EXPENSE_CATEGORIES),
  amountPaisa: money,
  description: z.string(),
  vendor: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.string(),
});
export type Expense = z.infer<typeof expenseSchema>;

export const expenseListQuerySchema = reportRangeQuerySchema.extend({
  category: z.enum(EXPENSE_CATEGORIES).optional(),
});
export const expenseListSchema = z.object({
  items: z.array(expenseSchema),
  totalPaisa: money,
  byCategory: z.array(z.object({ category: z.enum(EXPENSE_CATEGORIES), amountPaisa: money })),
});
export type ExpenseList = z.infer<typeof expenseListSchema>;

// ---------- Profit and loss (composed by the gateway) ----------

export const profitLossSchema = z.object({
  range: z.object({ from: z.string(), to: z.string() }),
  revenue: z.object({
    grossSalesPaisa: money,
    discountsPaisa: money,
    netSalesPaisa: money,
    shippingIncomePaisa: money,
    totalPaisa: money,
  }),
  costOfGoods: z.object({
    totalPaisa: money,
    /** Sold variants with no cost price set (their cost counts as 0). */
    missingCostSkus: z.array(z.string()),
  }),
  grossProfitPaisa: z.number().int(),
  grossMarginPercent: z.number(),
  expenses: z.object({
    totalPaisa: money,
    byCategory: z.array(z.object({ category: z.enum(EXPENSE_CATEGORIES), amountPaisa: money })),
  }),
  netProfitPaisa: z.number().int(),
  netMarginPercent: z.number(),
  /** Same figures for the previous period of equal length. */
  previous: z.object({
    totalRevenuePaisa: money,
    grossProfitPaisa: z.number().int(),
    expensesPaisa: money,
    netProfitPaisa: z.number().int(),
  }),
  byMonth: z.array(
    z.object({
      month: z.string(),
      revenuePaisa: money,
      costOfGoodsPaisa: money,
      expensesPaisa: money,
      netProfitPaisa: z.number().int(),
    }),
  ),
});
export type ProfitLoss = z.infer<typeof profitLossSchema>;
export type UnitsSold = z.infer<typeof unitsSoldSchema>;
