'use client';

import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AreaChart } from '@/components/charts/area-chart';
import { BarList } from '@/components/charts/bar-list';
import { FunnelBars } from '@/components/charts/bars';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Kpi } from '@/components/ui/kpi';
import { PageHeader } from '@/components/ui/page';
import { RangePicker, useReportRange } from '@/components/ui/range-picker';
import { Skeleton } from '@/components/ui/skeleton';
import { LineTabs } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage, type Schemas } from '@/lib/api';
import { downloadCsv, takaCell } from '@/lib/csv';
import { shortDay } from '@/lib/dates';
import { delta, formatTaka, formatTakaShort, humanize } from '@/lib/format';
import { STATUS_LABEL, type OrderStatus } from '@/lib/orders';
import { previousOf } from '@/lib/report-range';

type Report = Schemas['SalesReportDto_Output'];
type Stats = Schemas['DashboardStatsDto_Output'];
type Breakdown = 'products' | 'variants' | 'districts' | 'payments' | 'channels' | 'coupons';

const METHOD: Record<string, string> = {
  COD: 'Cash on delivery',
  BKASH_MANUAL: 'bKash',
  NAGAD_MANUAL: 'Nagad',
};
const count = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

export default function AnalyticsPage() {
  const toast = useToast();
  const period = useReportRange('30d');
  const { range } = period;
  const [data, setData] = useState<{ now: Report; before: Report; funnel: Stats } | null>(null);
  const [tab, setTab] = useState<Breakdown>('products');

  useEffect(() => {
    let live = true;
    void Promise.all([
      api.GET('/v1/admin/reports/sales', { params: { query: range } }),
      api.GET('/v1/admin/reports/sales', { params: { query: previousOf(range) } }),
      api.GET('/v1/admin/dashboard', { params: { query: range } }),
    ]).then(([a, b, f]) => {
      if (!live) return;
      if (a.data && b.data && f.data) setData({ now: a.data, before: b.data, funnel: f.data });
      else toast('error', errorMessage(a.error ?? b.error ?? f.error));
    });
    return () => {
      live = false;
    };
  }, [range, toast]);

  const t = data?.now.totals;
  const p = data?.before.totals;

  const exportCsv = () => {
    if (!data) return;
    const r = data.now;
    downloadCsv(`zelqune-sales-${range.from}-to-${range.to}.csv`, [
      ['Sales report', `${range.from} to ${range.to}`],
      [],
      ['Orders', r.totals.orders],
      ['Units', r.totals.units],
      ['Gross sales (BDT)', takaCell(r.totals.grossPaisa)],
      ['Discounts (BDT)', takaCell(r.totals.discountPaisa)],
      ['Shipping charged (BDT)', takaCell(r.totals.shippingPaisa)],
      ['Net sales (BDT)', takaCell(r.totals.netPaisa)],
      [],
      ['Day', 'Orders', 'Net sales (BDT)'],
      ...r.byDay.map((d) => [d.date, d.orders, takaCell(d.netPaisa)]),
      [],
      ['Product', 'Units', 'Orders', 'Revenue (BDT)'],
      ...r.byProduct.map((x) => [x.nameEn, x.units, x.orders, takaCell(x.revenuePaisa)]),
      [],
      ['SKU', 'Product', 'Units', 'Revenue (BDT)'],
      ...r.byVariant.map((x) => [x.sku, x.nameEn, x.units, takaCell(x.revenuePaisa)]),
      [],
      ['District', 'Orders', 'Net sales (BDT)'],
      ...r.byDistrict.map((x) => [x.district, x.orders, takaCell(x.netPaisa)]),
    ]);
  };

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Sales, best sellers, where orders come from and how visitors convert."
        actions={
          <>
            <RangePicker state={period} />
            <Button variant="secondary" onClick={exportCsv} disabled={!data}>
              <Download /> Export
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {t && p ? (
          <>
            <Kpi
              label="Net sales"
              value={formatTaka(t.netPaisa)}
              change={delta(t.netPaisa, p.netPaisa)}
              spark={data.now.byDay.map((d) => d.netPaisa)}
            />
            <Kpi label="Orders" value={String(t.orders)} change={delta(t.orders, p.orders)} />
            <Kpi
              label="Average order"
              value={formatTaka(t.averageOrderPaisa)}
              change={delta(t.averageOrderPaisa, p.averageOrderPaisa)}
            />
            <Kpi label="Units sold" value={String(t.units)} change={delta(t.units, p.units)} />
            <Kpi
              label="Customers"
              value={String(t.customers)}
              hint={`${count(t.repeatCustomers, 'returning customer')}`}
            />
            <Kpi
              label="Discounts given"
              value={formatTaka(t.discountPaisa)}
              change={delta(t.discountPaisa, p.discountPaisa)}
              invert
            />
            <Kpi
              label="Cancelled"
              value={String(t.cancelledOrders)}
              hint={formatTaka(t.cancelledPaisa)}
            />
            <Kpi
              label="Returned or refunded"
              value={String(t.returnedOrders)}
              hint={formatTaka(t.returnedPaisa)}
            />
          </>
        ) : (
          Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-[104px]" />)
        )}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Net sales over time" description="Confirmed orders, by day" />
          <CardBody>
            {data ? (
              <AreaChart
                label="Net sales by day"
                data={data.now.byDay.map((d) => ({ label: shortDay(d.date), value: d.netPaisa }))}
                format={formatTakaShort}
              />
            ) : (
              <Skeleton className="h-60" />
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Conversion funnel" description="Visitors in this period" />
          <CardBody>
            {data ? (
              <FunnelBars
                steps={[
                  { label: 'Viewed a product', value: data.funnel.funnel.views },
                  { label: 'Added to cart', value: data.funnel.funnel.addToCart },
                  { label: 'Started checkout', value: data.funnel.funnel.checkout },
                  { label: 'Paid order', value: data.funnel.funnel.purchase },
                ]}
              />
            ) : (
              <Skeleton className="h-48" />
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="px-3 pt-1">
            <LineTabs
              label="Breakdown"
              value={tab}
              onChange={setTab}
              items={[
                { value: 'products', label: 'Products' },
                { value: 'variants', label: 'Finishes and SKUs' },
                { value: 'districts', label: 'Districts' },
                { value: 'payments', label: 'Payments' },
                { value: 'channels', label: 'Channels' },
                { value: 'coupons', label: 'Coupons' },
              ]}
            />
          </div>
          <CardBody className="pt-4">
            {!data ? (
              <Skeleton className="h-64" />
            ) : tab === 'products' ? (
              <BarList
                format={formatTaka}
                rows={data.now.byProduct.map((x) => ({
                  key: x.productId,
                  label: x.nameEn,
                  sub: `${count(x.units, 'unit')} · ${count(x.orders, 'order')}`,
                  value: x.revenuePaisa,
                  href: `/products/${x.productId}`,
                }))}
              />
            ) : tab === 'variants' ? (
              <BarList
                format={formatTaka}
                rows={data.now.byVariant.map((x) => ({
                  key: x.variantId,
                  label: `${x.sku} · ${x.nameEn}`,
                  sub: count(x.units, 'unit'),
                  value: x.revenuePaisa,
                }))}
              />
            ) : tab === 'districts' ? (
              <BarList
                format={formatTaka}
                rows={data.now.byDistrict.map((x) => ({
                  key: x.district,
                  label: humanize(x.district),
                  sub: count(x.orders, 'order'),
                  value: x.netPaisa,
                }))}
              />
            ) : tab === 'payments' ? (
              <BarList
                format={formatTaka}
                rows={data.now.byPaymentMethod.map((x) => ({
                  key: x.method,
                  label: METHOD[x.method] ?? humanize(x.method),
                  sub: count(x.orders, 'order'),
                  value: x.netPaisa,
                }))}
              />
            ) : tab === 'channels' ? (
              <BarList
                format={formatTaka}
                rows={[
                  ...data.now.byChannel.map((x) => ({
                    key: x.channel,
                    label: x.channel === 'B2B' ? 'Business (B2B)' : 'Storefront (B2C)',
                    sub: count(x.orders, 'order'),
                    value: x.netPaisa,
                  })),
                  ...data.now.bySaleMode.map((x) => ({
                    key: `mode-${x.saleMode}`,
                    label: humanize(x.saleMode),
                    sub: count(x.orders, 'order'),
                    value: x.netPaisa,
                  })),
                ]}
              />
            ) : (
              <BarList
                format={formatTaka}
                empty="No coupon was used in this period"
                rows={data.now.byCoupon.map((x) => ({
                  key: x.code,
                  label: x.code,
                  sub: `${count(x.orders, 'order')} · discount given`,
                  value: x.discountPaisa,
                  href: '/marketing/coupons',
                }))}
              />
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Orders by status" description="Placed in this period" />
          <CardBody>
            {data ? (
              <BarList
                format={(v) => String(v)}
                rows={data.now.byStatus.map((s) => ({
                  key: s.status,
                  label: STATUS_LABEL[s.status as OrderStatus] ?? humanize(s.status),
                  value: s.orders,
                  href: `/orders?status=${s.status}`,
                }))}
              />
            ) : (
              <Skeleton className="h-48" />
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
