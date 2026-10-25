import { type ExpenseList, type UnitsSold } from '@zelqune/contracts';
import { buildProfitLoss } from './profit-loss';

const V1 = '00000000-0000-4000-8000-000000000001';
const V2 = '00000000-0000-4000-8000-000000000002';
const empty: UnitsSold = { items: [], months: [] };
const noExpenses: ExpenseList = { items: [], totalPaisa: 0, byCategory: [] };

describe('buildProfitLoss', () => {
  it('nets sales, cost of goods, shipping and expenses', () => {
    const sold: UnitsSold = {
      items: [
        { month: '2026-10', variantId: V1, sku: 'MOON-W', units: 2, revenuePaisa: 700_000 },
        { month: '2026-10', variantId: V2, sku: 'SHELF-O', units: 1, revenuePaisa: 300_000 },
      ],
      months: [
        { month: '2026-10', grossPaisa: 1_000_000, discountPaisa: 50_000, shippingPaisa: 30_000 },
      ],
    };
    const expenses: ExpenseList = {
      items: [
        {
          id: V1,
          date: '2026-10-05',
          category: 'MARKETING',
          amountPaisa: 100_000,
          description: 'Facebook ads',
          vendor: null,
          createdBy: 'owner',
          createdAt: '2026-10-05T00:00:00Z',
        },
      ],
      totalPaisa: 100_000,
      byCategory: [{ category: 'MARKETING', amountPaisa: 100_000 }],
    };
    const pl = buildProfitLoss({
      range: { from: '2026-10-01', to: '2026-10-24' },
      sold,
      costs: { [V1]: 150_000, [V2]: null },
      expenses,
      previous: { sold: empty, expenses: noExpenses, costs: {} },
    });
    expect(pl.revenue).toEqual({
      grossSalesPaisa: 1_000_000,
      discountsPaisa: 50_000,
      netSalesPaisa: 950_000,
      shippingIncomePaisa: 30_000,
      totalPaisa: 980_000,
    });
    expect(pl.costOfGoods).toEqual({ totalPaisa: 300_000, missingCostSkus: ['SHELF-O'] });
    expect(pl.grossProfitPaisa).toBe(650_000);
    expect(pl.netProfitPaisa).toBe(580_000);
    expect(pl.byMonth).toEqual([
      {
        month: '2026-10',
        revenuePaisa: 980_000,
        costOfGoodsPaisa: 300_000,
        expensesPaisa: 100_000,
        netProfitPaisa: 580_000,
      },
    ]);
  });
});
