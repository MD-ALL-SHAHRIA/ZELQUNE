import { bdMonths, type ExpenseList, type ProfitLoss, type UnitsSold } from '@zelqune/contracts';

const percent = (part: number, whole: number) =>
  whole === 0 ? 0 : Math.round((part / whole) * 1000) / 10;

/**
 * Profit and loss from three owners' data (ADR 0016):
 *   revenue      = product sales - coupon discounts + shipping charged   (order-service)
 *   cost of goods = units sold x the variant's unit cost                 (catalog-service)
 *   expenses     = the owner's ledger                                    (analytics-service)
 */
export function buildProfitLoss(input: {
  range: { from: string; to: string };
  sold: UnitsSold;
  costs: Record<string, number | null>;
  expenses: ExpenseList;
  previous: { sold: UnitsSold; expenses: ExpenseList; costs: Record<string, number | null> };
}): ProfitLoss {
  const summarize = (sold: UnitsSold, costs: Record<string, number | null>) => {
    const gross = sold.months.reduce((s, m) => s + m.grossPaisa, 0);
    const discounts = sold.months.reduce((s, m) => s + m.discountPaisa, 0);
    const shipping = sold.months.reduce((s, m) => s + m.shippingPaisa, 0);
    const cogs = sold.items.reduce((s, i) => s + i.units * (costs[i.variantId] ?? 0), 0);
    return { gross, discounts, shipping, cogs, revenue: gross - discounts + shipping };
  };

  const now = summarize(input.sold, input.costs);
  const before = summarize(input.previous.sold, input.previous.costs);
  const netSales = now.gross - now.discounts;
  const grossProfit = netSales - now.cogs;
  const netProfit = grossProfit + now.shipping - input.expenses.totalPaisa;
  const prevGross = before.gross - before.discounts - before.cogs;

  const months = bdMonths(input.range.from, input.range.to).map((month) => {
    const m = input.sold.months.find((x) => x.month === month);
    const revenue = m ? m.grossPaisa - m.discountPaisa + m.shippingPaisa : 0;
    const cogs = input.sold.items
      .filter((i) => i.month === month)
      .reduce((s, i) => s + i.units * (input.costs[i.variantId] ?? 0), 0);
    const expenses = input.expenses.items
      .filter((e) => e.date.startsWith(month))
      .reduce((s, e) => s + e.amountPaisa, 0);
    return {
      month,
      revenuePaisa: revenue,
      costOfGoodsPaisa: cogs,
      expensesPaisa: expenses,
      netProfitPaisa: revenue - cogs - expenses,
    };
  });

  const missing = new Set(
    input.sold.items.filter((i) => input.costs[i.variantId] == null).map((i) => i.sku),
  );

  return {
    range: input.range,
    revenue: {
      grossSalesPaisa: now.gross,
      discountsPaisa: now.discounts,
      netSalesPaisa: netSales,
      shippingIncomePaisa: now.shipping,
      totalPaisa: now.revenue,
    },
    costOfGoods: { totalPaisa: now.cogs, missingCostSkus: [...missing].sort() },
    grossProfitPaisa: grossProfit,
    grossMarginPercent: percent(grossProfit, netSales),
    expenses: { totalPaisa: input.expenses.totalPaisa, byCategory: input.expenses.byCategory },
    netProfitPaisa: netProfit,
    netMarginPercent: percent(netProfit, now.revenue),
    previous: {
      totalRevenuePaisa: before.revenue,
      grossProfitPaisa: prevGross,
      expensesPaisa: input.previous.expenses.totalPaisa,
      netProfitPaisa: prevGross + before.shipping - input.previous.expenses.totalPaisa,
    },
    byMonth: months,
  };
}
