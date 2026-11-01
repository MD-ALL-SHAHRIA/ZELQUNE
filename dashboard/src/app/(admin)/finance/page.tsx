'use client';

import {
  AlertTriangle,
  Banknote,
  Download,
  Landmark,
  Lock,
  Receipt,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ColumnChart } from '@/components/charts/column-chart';
import { BarList } from '@/components/charts/bar-list';
import { Button, buttonClass } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Delta, Kpi } from '@/components/ui/kpi';
import { EmptyState, PageHeader } from '@/components/ui/page';
import { RangePicker, useReportRange } from '@/components/ui/range-picker';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { EXPENSE_LABEL } from '@/features/finance/expenses';
import { api, errorMessage, type Schemas } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { downloadCsv, takaCell } from '@/lib/csv';
import { delta, formatTaka, formatTakaShort } from '@/lib/format';

type PL = Schemas['ProfitLossDto_Output'];

const monthName = (m: string) =>
  new Intl.DateTimeFormat('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(
    new Date(`${m}-01T00:00:00Z`),
  );
const signed = (paisa: number) => (paisa < 0 ? `−${formatTaka(-paisa)}` : formatTaka(paisa));

function Line({
  label,
  value,
  strong,
  minus,
  sub,
  className,
}: {
  label: React.ReactNode;
  value: number;
  strong?: boolean;
  minus?: boolean;
  sub?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-4 py-2',
        sub && 'pl-4 text-[0.8125rem] text-stone',
        strong && 'font-semibold text-ink',
        className,
      )}
    >
      <dt>{label}</dt>
      <dd className={cn('tabular', value < 0 && 'text-danger')}>
        {minus && value > 0 ? `−${formatTaka(value)}` : signed(value)}
      </dd>
    </div>
  );
}

export default function FinancePage() {
  const { state } = useAuth();
  const toast = useToast();
  const period = useReportRange('month');
  const { range } = period;
  const [pl, setPl] = useState<PL | null>(null);
  const owner = 'user' in state && state.user.role === 'OWNER';

  useEffect(() => {
    if (!owner) return;
    let live = true;
    void api.GET('/v1/admin/reports/profit-loss', { params: { query: range } }).then((r) => {
      if (!live) return;
      if (r.data) setPl(r.data);
      else toast('error', errorMessage(r.error));
    });
    return () => {
      live = false;
    };
  }, [range, owner, toast]);

  if (!owner)
    return (
      <>
        <PageHeader title="Profit and loss" />
        <Card>
          <EmptyState
            icon={<Lock />}
            title="Only the owner can see finance"
            action={
              <Link href="/" className={buttonClass('secondary', 'sm')}>
                Back to overview
              </Link>
            }
          >
            Profit and loss shows costs and margins, so only the owner sees it. Ask the owner if you
            need these numbers.
          </EmptyState>
        </Card>
      </>
    );

  const exportCsv = () =>
    pl &&
    downloadCsv(`zelqune-profit-loss-${range.from}-to-${range.to}.csv`, [
      ['Profit and loss', `${range.from} to ${range.to}`],
      [],
      ['Gross sales', takaCell(pl.revenue.grossSalesPaisa)],
      ['Discounts', takaCell(-pl.revenue.discountsPaisa)],
      ['Net sales', takaCell(pl.revenue.netSalesPaisa)],
      ['Cost of goods', takaCell(-pl.costOfGoods.totalPaisa)],
      ['Gross profit', takaCell(pl.grossProfitPaisa)],
      ['Shipping charged', takaCell(pl.revenue.shippingIncomePaisa)],
      ...pl.expenses.byCategory.map((e) => [
        `Expense: ${EXPENSE_LABEL[e.category]}`,
        takaCell(-e.amountPaisa),
      ]),
      ['Net profit', takaCell(pl.netProfitPaisa)],
      [],
      ['Month', 'Revenue', 'Cost of goods', 'Expenses', 'Net profit'],
      ...pl.byMonth.map((m) => [
        m.month,
        takaCell(m.revenuePaisa),
        takaCell(m.costOfGoodsPaisa),
        takaCell(m.expensesPaisa),
        takaCell(m.netProfitPaisa),
      ]),
    ]);

  return (
    <>
      <PageHeader
        title="Profit and loss"
        description="What came in, what the pieces cost to make, what you spent, and what is left."
        actions={
          <>
            <RangePicker state={period} />
            <Button variant="secondary" onClick={exportCsv} disabled={!pl}>
              <Download /> Export
            </Button>
          </>
        }
      />

      {pl?.costOfGoods.missingCostSkus.length ? (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/8 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <p className="text-ink/90">
            {pl.costOfGoods.missingCostSkus.length} sold{' '}
            {pl.costOfGoods.missingCostSkus.length === 1 ? 'finish has' : 'finishes have'} no cost
            price ({pl.costOfGoods.missingCostSkus.slice(0, 4).join(', ')}
            {pl.costOfGoods.missingCostSkus.length > 4 ? '…' : ''}), so profit looks higher than it
            is.{' '}
            <Link href="/products" className="font-medium underline underline-offset-2">
              Add costs on the product pages
            </Link>
            .
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {pl ? (
          <>
            <Kpi
              label="Revenue"
              icon={Banknote}
              tone="walnut"
              value={formatTaka(pl.revenue.totalPaisa)}
              change={delta(pl.revenue.totalPaisa, pl.previous.totalRevenuePaisa)}
            />
            <Kpi
              label="Gross profit"
              icon={TrendingUp}
              tone="sage"
              value={signed(pl.grossProfitPaisa)}
              change={delta(pl.grossProfitPaisa, pl.previous.grossProfitPaisa)}
              hint={`${pl.grossMarginPercent}% margin`}
            />
            <Kpi
              label="Expenses"
              icon={Receipt}
              tone="clay"
              value={formatTaka(pl.expenses.totalPaisa)}
              change={delta(pl.expenses.totalPaisa, pl.previous.expensesPaisa)}
              invert
            />
            <Kpi
              label="Net profit"
              icon={Landmark}
              tone="brass"
              value={signed(pl.netProfitPaisa)}
              change={delta(pl.netProfitPaisa, pl.previous.netProfitPaisa)}
            />
          </>
        ) : (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[104px]" />)
        )}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader
            title="Statement"
            description="Paid orders that were not cancelled or returned, confirmed in this period"
          />
          <CardBody>
            {pl ? (
              <dl className="divide-y divide-line text-sm text-ink/90">
                <div>
                  <Line label="Gross sales" value={pl.revenue.grossSalesPaisa} />
                  <Line label="Coupon discounts" value={pl.revenue.discountsPaisa} minus sub />
                  <Line label="Net sales" value={pl.revenue.netSalesPaisa} strong />
                </div>
                <div>
                  <Line
                    label="Cost of goods (unit cost × pieces sold)"
                    value={pl.costOfGoods.totalPaisa}
                    minus
                  />
                  <Line
                    label={
                      <>
                        Gross profit{' '}
                        <span className="font-normal text-stone">
                          · {pl.grossMarginPercent}% margin
                        </span>
                      </>
                    }
                    value={pl.grossProfitPaisa}
                    strong
                  />
                </div>
                <div>
                  <Line
                    label="Shipping charged to customers"
                    value={pl.revenue.shippingIncomePaisa}
                  />
                  {pl.expenses.byCategory.length ? (
                    pl.expenses.byCategory.map((e) => (
                      <Line
                        key={e.category}
                        label={EXPENSE_LABEL[e.category]}
                        value={e.amountPaisa}
                        minus
                        sub
                      />
                    ))
                  ) : (
                    <p className="py-2 pl-4 text-[0.8125rem] text-stone">
                      No expenses recorded.{' '}
                      <Link href="/finance/expenses" className="underline underline-offset-2">
                        Add expenses
                      </Link>
                    </p>
                  )}
                  <Line label="Total expenses" value={pl.expenses.totalPaisa} minus />
                </div>
                <div className="flex items-baseline justify-between gap-4 pt-3 text-base font-semibold">
                  <dt>
                    Net profit{' '}
                    <span className="text-[0.8125rem] font-normal text-stone">
                      · {pl.netMarginPercent}% of revenue
                    </span>
                  </dt>
                  <dd className={cn('tabular', pl.netProfitPaisa < 0 && 'text-danger')}>
                    {signed(pl.netProfitPaisa)}
                  </dd>
                </div>
                <div className="flex justify-end pt-1">
                  <Delta value={delta(pl.netProfitPaisa, pl.previous.netProfitPaisa)} />
                </div>
              </dl>
            ) : (
              <Skeleton className="h-80" />
            )}
          </CardBody>
        </Card>
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader title="Net profit by month" />
            <CardBody>
              {pl ? (
                <ColumnChart
                  label="Net profit by month"
                  data={pl.byMonth.map((m) => ({
                    label: monthName(m.month),
                    value: m.netProfitPaisa,
                    detail: `Revenue ${formatTaka(m.revenuePaisa)} · costs ${formatTaka(m.costOfGoodsPaisa + m.expensesPaisa)}`,
                  }))}
                  format={formatTakaShort}
                />
              ) : (
                <Skeleton className="h-56" />
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader
              title="Where the money went"
              action={
                <Link href="/finance/expenses" className={buttonClass('secondary', 'sm')}>
                  <Receipt /> Expenses
                </Link>
              }
            />
            <CardBody>
              {pl ? (
                <BarList
                  format={formatTaka}
                  empty="No costs recorded in this period"
                  rows={[
                    ...(pl.costOfGoods.totalPaisa
                      ? [
                          {
                            key: 'cogs',
                            label: 'Making the pieces',
                            value: pl.costOfGoods.totalPaisa,
                          },
                        ]
                      : []),
                    ...pl.expenses.byCategory.map((e) => ({
                      key: e.category,
                      label: EXPENSE_LABEL[e.category],
                      value: e.amountPaisa,
                    })),
                  ].sort((a, b) => b.value - a.value)}
                />
              ) : (
                <Skeleton className="h-40" />
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
