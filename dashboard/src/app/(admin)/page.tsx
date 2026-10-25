'use client';

import {
  Banknote,
  History,
  MousePointerClick,
  Package,
  ShoppingBag,
  WalletCards,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AreaChart } from '@/components/charts/area-chart';
import { CompareBars, FunnelBars } from '@/components/charts/bars';
import { Donut } from '@/components/charts/donut';
import { Badge } from '@/components/ui/badge';
import { buttonClass } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Kpi } from '@/components/ui/kpi';
import { EmptyState } from '@/components/ui/page';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import { sampleProductPhoto } from '@/features/content/defaults';
import { HomeHero } from '@/features/home/hero';
import { api, type Schemas } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { type Range, ranges, shortDay } from '@/lib/dates';
import { delta, formatTaka, formatTakaShort, humanize, timeAgo } from '@/lib/format';
import { PIPELINE, STATUS_LABEL, statusTone, type OrderStatus } from '@/lib/orders';

type Stats = Schemas['DashboardStatsDto_Output'];
type Order = Schemas['AdminOrderListDto_Output']['items'][number];
type Report = Schemas['SalesReportDto_Output'];
type Audit = Schemas['AuditLogPageDto_Output']['items'][number];

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

/** Pipeline segment colours: one per step, calm to strong as an order moves forward. */
const STEP_FILL: Partial<Record<OrderStatus, string>> = {
  PENDING_PAYMENT: 'bg-warning',
  CONFIRMED: 'bg-chart-a/60',
  IN_PRODUCTION: 'bg-chart-a/80',
  READY_TO_SHIP: 'bg-chart-a',
  SHIPPED: 'bg-success/70',
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

export default function HomePage() {
  const { state } = useAuth();
  const owner = state.status === 'signedIn' && state.user.role === 'OWNER';
  const [range, setRange] = useState<Range>('7');
  const [stats, setStats] = useState<{ now: Stats; before: Stats } | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [pipeline, setPipeline] = useState<Partial<Record<OrderStatus, number>>>({});
  const [recent, setRecent] = useState<Order[] | null>(null);
  const [toDo, setToDo] = useState<number | null>(null);
  const [slugs, setSlugs] = useState<Record<string, string>>({});
  const [activity, setActivity] = useState<Audit[] | null>(null);

  useEffect(() => {
    let live = true;
    const { current, previous } = ranges(Number(range));
    void Promise.all([
      api.GET('/v1/admin/dashboard', { params: { query: current } }),
      api.GET('/v1/admin/dashboard', { params: { query: previous } }),
      api.GET('/v1/admin/reports/sales', { params: { query: current } }),
    ]).then(([a, b, r]) => {
      if (!live) return;
      if (a.data && b.data) setStats({ now: a.data, before: b.data });
      setReport(r.data ?? null);
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
    void api
      .GET('/v1/admin/quotes', { params: { query: { status: 'NEW', limit: 1 } } })
      .then(
        (q) =>
          void api
            .GET('/v1/admin/orders', { params: { query: { status: 'PENDING_PAYMENT', limit: 1 } } })
            .then((o) => setToDo((q.data?.total ?? 0) + (o.data?.total ?? 0))),
      );
    void api
      .GET('/v1/admin/products', { params: { query: { limit: 100 } } })
      .then(({ data }) =>
        setSlugs(Object.fromEntries((data?.items ?? []).map((p) => [p.id, p.slug]))),
      );
  }, []);

  useEffect(() => {
    if (!owner) return;
    void api
      .GET('/v1/admin/audit-log', { params: { query: { limit: 7 } } })
      .then(({ data }) => setActivity(data?.items ?? []));
  }, [owner]);

  const name = state.status === 'signedIn' ? (state.user.name ?? '').split(' ')[0] : '';
  const now = stats ? totals(stats.now) : null;
  const before = stats ? totals(stats.before) : null;
  // Every day of the range (days without sales are 0), so the line always spans the period.
  const days = useMemo(() => {
    if (!stats) return [];
    const byDate = new Map(stats.now.revenueByDay.map((d) => [d.date, d]));
    const out: { date: string; orders: number; revenuePaisa: number }[] = [];
    const end = Date.parse(`${stats.now.range.to}T00:00:00Z`);
    for (let t = Date.parse(`${stats.now.range.from}T00:00:00Z`); t <= end; t += 86_400_000) {
      const date = new Date(t).toISOString().slice(0, 10);
      out.push(byDate.get(date) ?? { date, orders: 0, revenuePaisa: 0 });
    }
    return out;
  }, [stats]);
  const exp = stats?.now.experiments ?? [];
  const arm = (k: 'a' | 'b') => exp.find((e) => e.key === k);
  const open = PIPELINE.reduce((s, p) => s + (pipeline[p] ?? 0), 0);
  const top = useMemo(() => (report?.byProduct ?? []).slice(0, 5), [report]);
  const topMax = Math.max(...top.map((p) => p.revenuePaisa), 1);

  return (
    <div className="space-y-5">
      <HomeHero
        greeting={`${greeting()}${name ? `, ${name}` : ''}`}
        todayRevenue={stats ? stats.now.today.revenuePaisa : null}
        todayOrders={stats ? stats.now.today.orders : null}
        toDo={toDo}
        go={stats ? stats.now.go : null}
      />

      <div className="flex flex-wrap items-end justify-between gap-3 pt-1">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.015em] text-ink">Performance</h2>
          <p className="text-[0.8125rem] text-stone">
            {stats
              ? `${shortDay(stats.now.range.from)} – ${shortDay(stats.now.range.to)}, compared with the period before`
              : ' '}
          </p>
        </div>
        <Tabs
          label="Date range"
          value={range}
          onChange={setRange}
          items={(['1', '7', '30'] as Range[]).map((r) => ({ value: r, label: RANGE_LABEL[r] }))}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {now && before ? (
          <>
            <Kpi
              label="Revenue"
              value={formatTaka(now.revenue)}
              change={delta(now.revenue, before.revenue)}
              spark={days.map((d) => d.revenuePaisa)}
              href="/analytics"
              icon={Banknote}
              tone="walnut"
            />
            <Kpi
              label="Orders"
              value={now.orders.toLocaleString('en')}
              change={delta(now.orders, before.orders)}
              spark={days.map((d) => d.orders)}
              href="/orders"
              icon={ShoppingBag}
              tone="brass"
            />
            <Kpi
              label="Average order"
              value={formatTaka(now.aov)}
              change={delta(now.aov, before.aov)}
              href="/analytics"
              icon={WalletCards}
              tone="sky"
            />
            <Kpi
              label="Conversion"
              value={`${now.conversion.toFixed(2)}%`}
              change={delta(now.conversion, before.conversion)}
              href="/analytics"
              icon={MousePointerClick}
              tone="sage"
            />
          </>
        ) : (
          Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[8.25rem] rounded-2xl" />
          ))
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="rounded-2xl xl:col-span-2">
          <CardHeader
            title="Revenue"
            description="Confirmed orders per day"
            action={
              now ? (
                <span className="text-xl font-semibold tracking-[-0.02em] tabular">
                  {formatTaka(now.revenue)}
                </span>
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
        <Card className="rounded-2xl">
          <CardHeader
            title="Sales by channel"
            description="Revenue from the store and from businesses"
          />
          <CardBody>
            {stats ? (
              <Donut
                centerLabel="Total"
                format={formatTakaShort}
                slices={[
                  {
                    key: 'b2c',
                    label: 'Storefront',
                    value: stats.now.channels.b2c.revenuePaisa,
                    color: { stroke: 'stroke-chart-a', fill: 'bg-chart-a' },
                  },
                  {
                    key: 'b2b',
                    label: 'Business (B2B)',
                    value: stats.now.channels.b2b.revenuePaisa,
                    color: { stroke: 'stroke-chart-b', fill: 'bg-chart-b' },
                  },
                ]}
              />
            ) : (
              <Skeleton className="h-44" />
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl">
          <CardHeader
            title="Best sellers"
            description={RANGE_LABEL[range]}
            action={
              <Link href="/analytics" className={buttonClass('ghost', 'sm')}>
                Report
              </Link>
            }
          />
          <CardBody>
            {report === null ? (
              <Skeleton className="h-52" />
            ) : top.length === 0 ? (
              <EmptyState icon={<Package />} title="No sales in this period">
                Your best sellers appear here after the first paid orders.
              </EmptyState>
            ) : (
              <ol className="space-y-3">
                {top.map((p, i) => {
                  const photo = slugs[p.productId]
                    ? sampleProductPhoto(slugs[p.productId]!)
                    : undefined;
                  return (
                    <li key={p.productId}>
                      <Link
                        href={`/products/${p.productId}`}
                        className="group flex items-center gap-3"
                      >
                        <span className="relative size-11 shrink-0 overflow-hidden rounded-xl border border-line bg-sand">
                          {photo ? (
                            // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
                            <img
                              src={photo}
                              alt=""
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                          ) : null}
                          <span className="absolute top-0.5 left-0.5 grid size-4 place-items-center rounded-full bg-paper/90 text-[0.625rem] font-semibold text-ink">
                            {i + 1}
                          </span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-sm font-medium text-ink group-hover:underline">
                              {p.nameEn}
                            </span>
                            <span className="shrink-0 text-sm font-semibold tabular">
                              {formatTakaShort(p.revenuePaisa)}
                            </span>
                          </span>
                          <span className="mt-1.5 block h-1.5 rounded-full bg-sand">
                            <span
                              className="block h-full rounded-full bg-chart-revenue"
                              style={{ width: `${(p.revenuePaisa / topMax) * 100}%` }}
                            />
                          </span>
                          <span className="mt-1 block text-xs text-stone">
                            {p.units} sold · {p.orders} order{p.orders === 1 ? '' : 's'}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardBody>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader
            title="Order pipeline"
            description={`${open} open order${open === 1 ? '' : 's'}`}
            action={
              <Link href="/orders" className={buttonClass('ghost', 'sm')}>
                All orders
              </Link>
            }
          />
          <CardBody>
            <div
              className="mb-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-sand"
              aria-hidden
            >
              {PIPELINE.map((s) =>
                open && pipeline[s] ? (
                  <span
                    key={s}
                    className={cn('h-full', STEP_FILL[s] ?? 'bg-stone')}
                    style={{ width: `${((pipeline[s] ?? 0) / open) * 100}%` }}
                  />
                ) : null,
              )}
            </div>
            <ul className="space-y-0.5">
              {PIPELINE.map((s) => (
                <li key={s}>
                  <Link
                    href={`/orders?status=${s}`}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-ink/4"
                  >
                    <Badge tone={statusTone(s)}>{STATUS_LABEL[s]}</Badge>
                    <span className="text-sm font-semibold tabular">{pipeline[s] ?? '–'}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card className="rounded-2xl">
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
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="rounded-2xl xl:col-span-2">
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
                <Skeleton key={i} className="h-10" />
              ))}
            </CardBody>
          ) : recent.length === 0 ? (
            <EmptyState icon={<ShoppingBag />} title="No orders yet">
              Orders appear here the moment a customer checks out.
            </EmptyState>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[38rem] text-sm">
                <thead className="text-left text-xs text-stone">
                  <tr>
                    <th className="py-2 pl-5 font-medium">Customer</th>
                    <th className="py-2 font-medium">Order</th>
                    <th className="py-2 font-medium">Status</th>
                    <th className="py-2 pr-5 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((o) => (
                    <tr key={o.id} className="border-t border-line hover:bg-ink/3">
                      <td className="py-2.5 pl-5">
                        <span className="flex items-center gap-2.5">
                          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-walnut/12 text-[0.6875rem] font-semibold text-walnut">
                            {initials(o.customerName)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-ink">
                              {o.customerName}
                            </span>
                            <span className="block text-xs text-stone">{timeAgo(o.placedAt)}</span>
                          </span>
                        </span>
                      </td>
                      <td className="py-2.5">
                        <Link
                          href={`/orders/${o.id}`}
                          className="font-mono text-[0.8125rem] hover:underline"
                        >
                          {o.code}
                        </Link>
                      </td>
                      <td className="py-2.5">
                        <Badge tone={statusTone(o.status)}>{STATUS_LABEL[o.status]}</Badge>
                      </td>
                      <td className="py-2.5 pr-5 text-right font-semibold tabular">
                        {formatTaka(o.totalPaisa)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {owner ? (
          <Card className="rounded-2xl">
            <CardHeader
              title="Recent activity"
              description="Changes in the admin"
              action={
                <Link href="/audit" className={buttonClass('ghost', 'sm')}>
                  Audit log
                </Link>
              }
            />
            <CardBody>
              {activity === null ? (
                <Skeleton className="h-56" />
              ) : activity.length === 0 ? (
                <EmptyState icon={<History />} title="Nothing changed yet" />
              ) : (
                <ol className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[0.4375rem] before:w-px before:bg-line">
                  {activity.map((a) => (
                    <li key={a.id} className="relative flex gap-3 pl-0">
                      <span
                        aria-hidden
                        className={cn(
                          'relative mt-1 size-3.5 shrink-0 rounded-full border-2 border-surface',
                          /delete|reject|cancel|archive|deactivate/i.test(a.action)
                            ? 'bg-danger'
                            : /create|publish|verify|confirm/i.test(a.action)
                              ? 'bg-success'
                              : 'bg-walnut',
                        )}
                      />
                      <span className="min-w-0">
                        <span className="block text-[0.8125rem] leading-snug text-ink">
                          {a.summary}
                        </span>
                        <span className="text-xs text-stone">
                          {humanize(a.actor.role)} · {timeAgo(a.occurredAt)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>
        ) : (
          <Card className="rounded-2xl">
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
                    {
                      label: 'Checkouts',
                      a: arm('a')?.checkouts ?? 0,
                      b: arm('b')?.checkouts ?? 0,
                    },
                    {
                      label: 'Purchases',
                      a: arm('a')?.purchases ?? 0,
                      b: arm('b')?.purchases ?? 0,
                    },
                  ]}
                />
              ) : (
                <Skeleton className="h-40" />
              )}
            </CardBody>
          </Card>
        )}
      </div>

      {owner ? (
        <Card className="rounded-2xl">
          <CardHeader
            title="Price test"
            description="Sessions, checkouts and purchases per price (?p=a or b)"
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
      ) : null}
    </div>
  );
}
