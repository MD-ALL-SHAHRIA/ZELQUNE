'use client';

import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AreaChart } from '@/components/charts/area-chart';
import { CompareBars, FunnelBars } from '@/components/charts/bars';
import { Ring } from '@/components/charts/ring';
import { Badge } from '@/components/ui/badge';
import { buttonClass } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Kpi } from '@/components/ui/kpi';
import { EmptyState, PageHeader } from '@/components/ui/page';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import { api, type Schemas } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { type Range, ranges, shortDay } from '@/lib/dates';
import { delta, formatTaka, formatTakaShort, timeAgo } from '@/lib/format';
import { PIPELINE, STATUS_LABEL, statusTone, type OrderStatus } from '@/lib/orders';

type Stats = Schemas['DashboardStatsDto_Output'];
type Order = Schemas['AdminOrderListDto_Output']['items'][number];

const RANGE_LABEL: Record<Range, string> = { '1': 'Today', '7': '7 days', '30': '30 days' };

function greeting(now = new Date()) {
  const h = Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Asia/Dhaka',
    }).format(now),
  );
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const totals = (s: Stats) => {
  const revenue = s.revenueByDay.reduce((a, d) => a + d.revenuePaisa, 0);
  const orders = s.revenueByDay.reduce((a, d) => a + d.orders, 0);
  return {
    revenue,
    orders,
    aov: orders ? revenue / orders : 0,
    conversion: s.funnel.views ? (s.funnel.purchase / s.funnel.views) * 100 : 0,
  };
};

export default function HomePage() {
  const { state } = useAuth();
  const [range, setRange] = useState<Range>('7');
  const [stats, setStats] = useState<{ now: Stats; before: Stats } | null>(null);
  const [pipeline, setPipeline] = useState<Partial<Record<OrderStatus, number>>>({});
  const [recent, setRecent] = useState<Order[] | null>(null);

  useEffect(() => {
    let live = true;
    const { current, previous } = ranges(Number(range));
    void Promise.all([
      api.GET('/v1/admin/dashboard', { params: { query: current } }),
      api.GET('/v1/admin/dashboard', { params: { query: previous } }),
    ]).then(([a, b]) => {
      if (live && a.data && b.data) setStats({ now: a.data, before: b.data });
    });
    return () => {
      live = false;
    };
  }, [range]);

  useEffect(() => {
    void Promise.all(
      PIPELINE.map((status) =>
        api.GET('/v1/admin/orders', { params: { query: { status, limit: 1 } } }),
      ),
    ).then((res) =>
      setPipeline(Object.fromEntries(PIPELINE.map((s, i) => [s, res[i]?.data?.total ?? 0]))),
    );
    void api
      .GET('/v1/admin/orders', { params: { query: { limit: 6 } } })
      .then(({ data }) => setRecent(data?.items ?? []));
  }, []);

  const name = state.status === 'signedIn' ? (state.user.name ?? '').split(' ')[0] : '';
  const now = stats ? totals(stats.now) : null;
  const before = stats ? totals(stats.before) : null;
  const days = stats?.now.revenueByDay ?? [];
  const exp = stats?.now.experiments ?? [];
  const arm = (k: 'a' | 'b') => exp.find((e) => e.key === k);

  return (
    <>
      <PageHeader
        title={`${greeting()}${name ? `, ${name}` : ''}`}
        description="Here is how Zelqune is doing."
        actions={
          <Tabs
            label="Date range"
            value={range}
            onChange={setRange}
            items={(['1', '7', '30'] as Range[]).map((r) => ({ value: r, label: RANGE_LABEL[r] }))}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {now && before ? (
          <>
            <Kpi
              label="Revenue"
              value={formatTaka(now.revenue)}
              change={delta(now.revenue, before.revenue)}
              spark={days.map((d) => d.revenuePaisa)}
              href="/orders"
            />
            <Kpi
              label="Orders"
              value={now.orders.toLocaleString('en')}
              change={delta(now.orders, before.orders)}
              spark={days.map((d) => d.orders)}
              href="/orders"
            />
            <Kpi
              label="Average order"
              value={formatTaka(now.aov)}
              change={delta(now.aov, before.aov)}
              href="/orders"
            />
            <Kpi
              label="Conversion"
              value={`${now.conversion.toFixed(2)}%`}
              change={delta(now.conversion, before.conversion)}
              href="/orders"
            />
          </>
        ) : (
          Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[6.75rem] rounded-xl" />
          ))
        )}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Revenue"
            description={
              stats
                ? `${shortDay(stats.now.range.from)} – ${shortDay(stats.now.range.to)} · confirmed orders`
                : ' '
            }
            action={
              now ? (
                <span className="text-lg font-semibold tabular">{formatTaka(now.revenue)}</span>
              ) : null
            }
          />
          <CardBody>
            {stats ? (
              <AreaChart
                label={`Revenue per day, ${RANGE_LABEL[range]}`}
                data={days.map((d) => ({ label: shortDay(d.date), value: d.revenuePaisa }))}
                format={formatTakaShort}
              />
            ) : (
              <Skeleton className="h-60" />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="GO counter" description="Real confirmed orders (friends excluded)" />
          <CardBody className="flex flex-col items-center pt-2">
            {stats ? (
              <>
                <div className="relative">
                  <Ring value={stats.now.go.count} max={stats.now.go.target} size={156} />
                  <div className="absolute inset-0 grid place-items-center text-center">
                    <div>
                      <p className="text-4xl font-semibold tracking-[-0.03em] tabular">
                        {stats.now.go.count}
                      </p>
                      <p className="text-xs text-stone">of {stats.now.go.target}</p>
                    </div>
                  </div>
                </div>
                <Badge tone={stats.now.go.reached ? 'success' : 'warning'} className="mt-4">
                  {stats.now.go.reached
                    ? 'Target reached: start production'
                    : `${Math.max(stats.now.go.target - stats.now.go.count, 0)} more to go`}
                </Badge>
              </>
            ) : (
              <Skeleton className="size-40 rounded-full" />
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader
            title="Order pipeline"
            description="Open orders by step"
            action={
              <Link href="/orders" className={buttonClass('ghost', 'sm')}>
                All orders
              </Link>
            }
          />
          <CardBody>
            <ul className="space-y-1">
              {PIPELINE.map((s) => (
                <li key={s}>
                  <Link
                    href={`/orders?status=${s}`}
                    className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-ink/4"
                  >
                    <Badge tone={statusTone(s)}>{STATUS_LABEL[s]}</Badge>
                    <span className="text-sm font-semibold tabular">{pipeline[s] ?? '–'}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Conversion funnel" description={RANGE_LABEL[range]} />
          <CardBody>
            {stats ? (
              <FunnelBars
                steps={[
                  { label: 'Product views', value: stats.now.funnel.views },
                  { label: 'Added to cart', value: stats.now.funnel.addToCart },
                  { label: 'Checkout', value: stats.now.funnel.checkout },
                  { label: 'Purchased', value: stats.now.funnel.purchase },
                ]}
              />
            ) : (
              <Skeleton className="h-40" />
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title="Price test"
            description="Sessions, checkouts and purchases per price"
          />
          <CardBody>
            {stats ? (
              <CompareBars
                format={(v) => v.toLocaleString('en')}
                rows={[
                  { label: 'Sessions', a: arm('a')?.sessions ?? 0, b: arm('b')?.sessions ?? 0 },
                  { label: 'Checkouts', a: arm('a')?.checkouts ?? 0, b: arm('b')?.checkouts ?? 0 },
                  { label: 'Purchases', a: arm('a')?.purchases ?? 0, b: arm('b')?.purchases ?? 0 },
                ]}
              />
            ) : (
              <Skeleton className="h-40" />
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Recent orders"
          action={
            <Link href="/orders" className={buttonClass('secondary', 'sm')}>
              View all
            </Link>
          }
        />
        {recent === null ? (
          <CardBody className="space-y-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-9" />
            ))}
          </CardBody>
        ) : recent.length === 0 ? (
          <EmptyState icon={<ShoppingBag />} title="No orders yet">
            Orders appear here the moment a customer checks out.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id} className="border-t border-line hover:bg-ink/3">
                    <td className="py-2.5 pl-5">
                      <Link href={`/orders/${o.id}`} className="font-medium hover:underline">
                        {o.code}
                      </Link>
                    </td>
                    <td className="py-2.5 text-ink/85">{o.customerName}</td>
                    <td className="py-2.5">
                      <Badge tone={statusTone(o.status)}>{STATUS_LABEL[o.status]}</Badge>
                    </td>
                    <td className="py-2.5 text-stone">{timeAgo(o.placedAt)}</td>
                    <td className="py-2.5 pr-5 text-right font-medium tabular">
                      {formatTaka(o.totalPaisa)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
