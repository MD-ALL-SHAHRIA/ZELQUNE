'use client';

import {
  Calendar,
  CreditCard,
  FileSignature,
  History,
  MonitorSmartphone,
  MoreVertical,
  Package,
  ShoppingBag,
  Store,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AreaChart } from '@/components/charts/area-chart';
import { FunnelBars } from '@/components/charts/bars';
import { Donut } from '@/components/charts/donut';
import { Badge, type Tone } from '@/components/ui/badge';
import { Button, buttonClass } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Kpi } from '@/components/ui/kpi';
import { EmptyState, PageHeader } from '@/components/ui/page';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import { sampleProductPhoto } from '@/features/content/defaults';
import { api, type Schemas } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { downloadCsv, takaCell } from '@/lib/csv';
import { ranges, shortDay } from '@/lib/dates';
import { delta, formatTaka, formatTakaShort, humanize, timeAgo } from '@/lib/format';
import { PIPELINE, STATUS_LABEL, statusTone, type OrderStatus } from '@/lib/orders';

type Stats = Schemas['DashboardStatsDto_Output'];
type Order = Schemas['AdminOrderListDto_Output']['items'][number];
type Report = Schemas['SalesReportDto_Output'];
type Audit = Schemas['AuditLogPageDto_Output']['items'][number];
type Period = '7' | '30' | '90';

const PERIOD_LABEL: Record<Period, string> = {
  '7': 'Last 7 days',
  '30': 'Last 30 days',
  '90': 'Last 90 days',
};
const METHOD: Record<Order['paymentMethod'], { label: string; tone: Tone }> = {
  BKASH_MANUAL: { label: 'bKash', tone: 'rose' },
  NAGAD_MANUAL: { label: 'Nagad', tone: 'warning' },
  COD: { label: 'Cash on delivery', tone: 'neutral' },
};
/** Letter-avatar tints, picked by name so a customer keeps one colour. */
const AVATAR = [
  'text-[#c2410c] bg-[#fff4ec] ring-[#fde3cf]',
  'text-[#7c3aed] bg-[#f6f1ff] ring-[#e9ddff]',
  'text-[#1f63b8] bg-[#eff5fd] ring-[#d8e7fa]',
  'text-[#047857] bg-[#ecfaf3] ring-[#cdeedd]',
  'text-[#9a5a22] bg-[#f8efe5] ring-[#ecd9c4]',
];
const tint = (name: string) =>
  AVATAR[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR.length];

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

function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-full text-[0.8125rem] font-medium ring-1 dark:bg-ink/10 dark:ring-ink/15',
        tint(name),
      )}
    >
      {name.trim()[0]?.toUpperCase() ?? '?'}
    </span>
  );
}

/** A big number with a tinted chip beside it and a quiet line under it (Northstar list head). */
function Headline({
  value,
  chip,
  tone,
  note,
}: {
  value: string;
  chip: string;
  tone: Tone;
  note?: string;
}) {
  return (
    <div className="mb-2">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[2.5rem] leading-none font-normal tracking-[-0.04em] text-ink tabular">
          {value}
        </p>
        <Badge tone={tone} className="h-7 px-3 text-[0.75rem]">
          {chip}
        </Badge>
      </div>
      {note ? <p className="mt-2.5 text-[0.9375rem] text-stone">{note}</p> : null}
    </div>
  );
}

const chip =
  'inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-[0.9375rem] text-ink/85 shadow-[0_1px_1px_rgba(36,28,24,0.03)] transition-colors hover:border-ink/20 [&_svg]:size-[1.05rem] [&_svg]:text-ink/60';

export default function HomePage() {
  const { state } = useAuth();
  const owner = state.status === 'signedIn' && state.user.role === 'OWNER';
  const [period, setPeriod] = useState<Period>('30');
  const [stats, setStats] = useState<{ now: Stats; before: Stats } | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [pipeline, setPipeline] = useState<Partial<Record<OrderStatus, number>>>({});
  const [toCheck, setToCheck] = useState<{ items: Order[]; total: number } | null>(null);
  const [recent, setRecent] = useState<Order[] | null>(null);
  const [newQuotes, setNewQuotes] = useState<number | null>(null);
  const [slugs, setSlugs] = useState<Record<string, string>>({});
  const [activity, setActivity] = useState<Audit[] | null>(null);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3100';

  useEffect(() => {
    let live = true;
    const { current, previous } = ranges(Number(period));
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
  }, [period]);

  useEffect(() => {
    void Promise.all(
      PIPELINE.map((status) =>
        api.GET('/v1/admin/orders', { params: { query: { status, limit: 1 } } }),
      ),
    ).then((res) =>
      setPipeline(Object.fromEntries(PIPELINE.map((s, i) => [s, res[i]?.data?.total ?? 0]))),
    );
    void api
      .GET('/v1/admin/orders', { params: { query: { status: 'PENDING_PAYMENT', limit: 4 } } })
      .then(({ data }) => setToCheck({ items: data?.items ?? [], total: data?.total ?? 0 }));
    void api
      .GET('/v1/admin/orders', { params: { query: { limit: 5 } } })
      .then(({ data }) => setRecent(data?.items ?? []));
    void api
      .GET('/v1/admin/quotes', { params: { query: { status: 'NEW', limit: 1 } } })
      .then(({ data }) => setNewQuotes(data?.total ?? 0));
    void api
      .GET('/v1/admin/products', { params: { query: { limit: 100 } } })
      .then(({ data }) =>
        setSlugs(Object.fromEntries((data?.items ?? []).map((p) => [p.id, p.slug]))),
      );
  }, []);

  useEffect(() => {
    if (!owner) return;
    void api
      .GET('/v1/admin/audit-log', { params: { query: { limit: 6 } } })
      .then(({ data }) => setActivity(data?.items ?? []));
  }, [owner]);

  const now = stats ? totals(stats.now) : null;
  const before = stats ? totals(stats.before) : null;
  // Every day of the period (days without sales are 0), so lines span the whole period.
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
  const open = PIPELINE.reduce((s, p) => s + (pipeline[p] ?? 0), 0);
  const top = (report?.byProduct ?? []).slice(0, 4);
  const topMax = Math.max(...top.map((p) => p.revenuePaisa), 1);
  const rows = toCheck?.items.length ? toCheck.items : (recent ?? []).slice(0, 4);

  const exportCsv = () => {
    if (!report) return;
    downloadCsv(`zelqune-overview-${report.range.from}-to-${report.range.to}.csv`, [
      ['Overview', `${report.range.from} to ${report.range.to}`],
      [],
      ['Net sales (BDT)', takaCell(report.totals.netPaisa)],
      ['Orders', report.totals.orders],
      ['Average order (BDT)', takaCell(report.totals.averageOrderPaisa)],
      ['Customers', report.totals.customers],
      [],
      ['Day', 'Orders', 'Net sales (BDT)'],
      ...report.byDay.map((d) => [d.date, d.orders, takaCell(d.netPaisa)]),
      [],
      ['Product', 'Units', 'Revenue (BDT)'],
      ...report.byProduct.map((p) => [p.nameEn, p.units, takaCell(p.revenuePaisa)]),
    ]);
  };

  return (
    <>
      <PageHeader
        title="Overview"
        actions={
          <>
            <Tabs
              label="Period"
              value={period}
              onChange={setPeriod}
              items={(['7', '30', '90'] as Period[]).map((p) => ({ value: p, label: `${p}d` }))}
            />
            <span className="mx-1 hidden h-6 w-px bg-line sm:block" aria-hidden />
            <a href={site} target="_blank" rel="noreferrer" className={buttonClass('secondary')}>
              View store
            </a>
            <Button onClick={exportCsv} disabled={!report}>
              <Upload /> Export
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <Link href="/orders?status=PENDING_PAYMENT" className={chip}>
          <CreditCard />
          {toCheck
            ? `${toCheck.total} payment${toCheck.total === 1 ? '' : 's'} to check`
            : 'Payments'}
        </Link>
        <Link href="/quotes" className={chip}>
          <FileSignature />
          {newQuotes === null
            ? 'Requests'
            : `${newQuotes} new request${newQuotes === 1 ? '' : 's'}`}
        </Link>
        <span className="mx-1 hidden h-7 w-px bg-line sm:block" aria-hidden />
        <Link href="/customers" className={chip} aria-label="Customers">
          <Store />
        </Link>
        <Badge
          tone="info"
          icon={<MonitorSmartphone />}
          className="h-10 rounded-xl px-3.5 text-[0.8125rem]"
        >
          Storefront
        </Badge>
        <Badge
          tone="rose"
          icon={<ShoppingBag />}
          className="h-10 rounded-xl px-3.5 text-[0.8125rem]"
        >
          B2B
        </Badge>
        <span className="ml-auto inline-flex h-10 items-center gap-2 rounded-xl bg-ink/[0.045] px-3.5 text-[0.9375rem] text-ink/80">
          <span
            aria-hidden
            className={cn(
              'size-2 rounded-full',
              stats?.now.go.reached ? 'bg-success' : 'bg-accent',
            )}
          />
          {stats ? `GO ${stats.now.go.count} of ${stats.now.go.target}` : 'GO'}
        </span>
        <Link
          href="/analytics"
          aria-label="More reports"
          className="grid size-10 place-items-center rounded-xl border border-line bg-surface text-ink/60 hover:border-ink/20 hover:text-ink"
        >
          <MoreVertical className="size-4" />
        </Link>
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
              spark={days.map((d) => (d.orders ? d.revenuePaisa / d.orders : 0))}
              href="/analytics"
            />
            <Kpi
              label="Conversion"
              value={`${now.conversion.toFixed(1)}%`}
              change={delta(now.conversion, before.conversion)}
              href="/analytics"
            />
          </>
        ) : (
          Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[13rem] rounded-[1.375rem]" />
          ))
        )}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Sales funnel" />
          <CardBody>
            {stats ? (
              <>
                <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-[2.5rem] leading-none font-normal tracking-[-0.04em] text-ink tabular">
                      {stats.now.funnel.views.toLocaleString('en')}
                    </p>
                    <Badge tone="info" className="h-7 px-3 text-[0.75rem]">
                      Visitors
                    </Badge>
                  </div>
                  <span className={chip}>
                    <Calendar />
                    {PERIOD_LABEL[period]}
                  </span>
                </div>
                <FunnelBars
                  steps={[
                    { label: 'Viewed a piece', value: stats.now.funnel.views },
                    { label: 'Added to cart', value: stats.now.funnel.addToCart },
                    { label: 'Started checkout', value: stats.now.funnel.checkout },
                    { label: 'Paid order', value: stats.now.funnel.purchase },
                  ]}
                />
              </>
            ) : (
              <Skeleton className="h-80" />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={toCheck?.items.length ? 'Payments to check' : 'Recent orders'}
            action={
              <Link
                href="/orders?status=PENDING_PAYMENT"
                aria-label="All payments to check"
                className="grid size-8 place-items-center rounded-lg text-stone hover:bg-ink/5 hover:text-ink"
              >
                <MoreVertical className="size-4" />
              </Link>
            }
          />
          <CardBody>
            {toCheck === null ? (
              <Skeleton className="h-72" />
            ) : (
              <>
                <Headline
                  value={String(toCheck.total)}
                  chip="Payment check"
                  tone="warning"
                  note={
                    toCheck.total
                      ? 'orders waiting for you to match the Transaction ID'
                      : 'nothing waiting: here are the latest orders'
                  }
                />
                {rows.length ? (
                  <ul className="mt-4">
                    {rows.map((o) => (
                      <li
                        key={o.id}
                        className="flex items-center gap-3 border-t border-dashed border-line py-3.5"
                      >
                        <Avatar name={o.customerName} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[0.9375rem] text-ink">{o.customerName}</p>
                          <p className="font-mono text-xs text-stone tabular">
                            {o.code} · {formatTaka(o.totalPaisa)}
                          </p>
                        </div>
                        {toCheck.items.length ? (
                          <Badge
                            tone={METHOD[o.paymentMethod].tone}
                            className="hidden sm:inline-flex"
                          >
                            {METHOD[o.paymentMethod].label}
                          </Badge>
                        ) : (
                          <Badge tone={statusTone(o.status)} className="hidden sm:inline-flex">
                            {STATUS_LABEL[o.status]}
                          </Badge>
                        )}
                        <Link href={`/orders/${o.id}`} className={buttonClass('secondary', 'sm')}>
                          {toCheck.items.length ? 'Verify' : 'Open'}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState icon={<ShoppingBag />} title="No orders yet" />
                )}
              </>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title="Revenue"
            action={
              now ? (
                <span className="font-mono text-[0.8125rem] text-ink/70 tabular">
                  {formatTaka(now.revenue)}
                </span>
              ) : null
            }
          />
          <CardBody>
            {stats ? (
              <AreaChart
                label={`Revenue per day, ${PERIOD_LABEL[period]}`}
                data={days.map((d) => ({ label: shortDay(d.date), value: d.revenuePaisa }))}
                format={formatTakaShort}
              />
            ) : (
              <Skeleton className="h-60" />
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Sales by channel" />
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

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Best sellers" />
          <CardBody>
            {report === null ? (
              <Skeleton className="h-52" />
            ) : top.length === 0 ? (
              <EmptyState icon={<Package />} title="No sales in this period">
                Your best sellers appear here after the first paid orders.
              </EmptyState>
            ) : (
              <ul>
                {top.map((p) => {
                  const photo = slugs[p.productId]
                    ? sampleProductPhoto(slugs[p.productId]!)
                    : undefined;
                  return (
                    <li
                      key={p.productId}
                      className="border-t border-dashed border-line py-3 first:border-t-0 first:pt-0"
                    >
                      <Link
                        href={`/products/${p.productId}`}
                        className="group flex items-center gap-3"
                      >
                        <span className="relative size-10 shrink-0 overflow-hidden rounded-xl border border-line bg-sand">
                          {photo ? (
                            // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
                            <img
                              src={photo}
                              alt=""
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                          ) : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-[0.9375rem] text-ink group-hover:underline">
                              {p.nameEn}
                            </span>
                            <span className="shrink-0 font-mono text-[0.8125rem] text-ink tabular">
                              {formatTakaShort(p.revenuePaisa)}
                            </span>
                          </span>
                          <span className="mt-1.5 block h-1.5 rounded-full bg-sand">
                            <span
                              className="block h-full rounded-full bg-accent"
                              style={{ width: `${(p.revenuePaisa / topMax) * 100}%` }}
                            />
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Order pipeline"
            action={
              <Link href="/orders" className={buttonClass('secondary', 'sm')}>
                Orders
              </Link>
            }
          />
          <CardBody>
            <Headline
              value={String(open)}
              chip="Open"
              tone="info"
              note="orders on their way to a customer"
            />
            <ul className="mt-3">
              {PIPELINE.map((s) => (
                <li key={s} className="border-t border-dashed border-line">
                  <Link
                    href={`/orders?status=${s}`}
                    className="flex items-center justify-between py-2.5 hover:opacity-80"
                  >
                    <Badge tone={statusTone(s)}>{STATUS_LABEL[s]}</Badge>
                    <span className="font-mono text-[0.9375rem] text-ink tabular">
                      {pipeline[s] ?? '–'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        {owner ? (
          <Card>
            <CardHeader
              title="Recent activity"
              action={
                <Link href="/audit" className={buttonClass('secondary', 'sm')}>
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
                <ul>
                  {activity.map((a) => (
                    <li
                      key={a.id}
                      className="border-t border-dashed border-line py-3 first:border-t-0 first:pt-0"
                    >
                      <p className="text-[0.875rem] leading-snug text-ink">{a.summary}</p>
                      <p className="mt-0.5 font-mono text-[0.6875rem] tracking-[0.06em] text-stone uppercase">
                        {humanize(a.actor.role)} · {timeAgo(a.occurredAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardHeader title="Latest orders" />
            <CardBody>
              <ul>
                {(recent ?? []).map((o) => (
                  <li
                    key={o.id}
                    className="flex items-center gap-3 border-t border-dashed border-line py-3 first:border-t-0 first:pt-0"
                  >
                    <Avatar name={o.customerName} />
                    <span className="min-w-0 flex-1 truncate text-[0.9375rem]">
                      {o.customerName}
                    </span>
                    <Badge tone={statusTone(o.status)}>{STATUS_LABEL[o.status]}</Badge>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
