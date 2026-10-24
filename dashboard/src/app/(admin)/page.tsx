'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Card, CardTitle, Notice, PageHeader } from '@/components/ui';
import { api, errorMessage, type Schemas } from '@/lib/api';
import { formatTaka } from '@/lib/format';

type Stats = Schemas['DashboardStatsDto_Output'];

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api.GET('/v1/admin/dashboard').then(({ data, error }) => {
      if (data) setStats(data);
      else setError(errorMessage(error));
    });
  }, []);

  return (
    <>
      <PageHeader title="Overview" description="Pre-orders, sales and the GO counter." />
      {error ? <Notice tone="error">{error}</Notice> : null}
      {stats ? (
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:row-span-2">
            <p className="text-[0.72rem] uppercase tracking-eyebrow text-stone">GO counter</p>
            <p className="mt-3 font-display text-7xl font-medium">
              {stats.go.count}
              <span className="text-3xl text-stone"> / {stats.go.target}</span>
            </p>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-sand">
              <div
                className="h-full rounded-full bg-walnut"
                style={{
                  width: `${Math.min(100, (stats.go.count / Math.max(1, stats.go.target)) * 100)}%`,
                }}
              />
            </div>
            <p className="mt-3 text-sm text-stone">
              {stats.go.reached
                ? 'Target reached: go to production.'
                : 'Confirmed real orders (friends excluded).'}
            </p>
          </Card>
          <Card>
            <p className="text-[0.72rem] uppercase tracking-eyebrow text-stone">Today</p>
            <p className="mt-2 font-display text-4xl font-medium">{stats.today.orders} {stats.today.orders === 1 ? 'order' : 'orders'}</p>
            <p className="text-sm text-stone">{formatTaka(stats.today.revenuePaisa)} revenue</p>
          </Card>
          <Card>
            <CardTitle>Funnel</CardTitle>
            <dl className="grid grid-cols-4 gap-3 text-center">
              {(
                [
                  ['Views', stats.funnel.views],
                  ['Cart', stats.funnel.addToCart],
                  ['Checkout', stats.funnel.checkout],
                  ['Bought', stats.funnel.purchase],
                ] as const
              ).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[0.72rem] text-stone">{k}</dt>
                  <dd className="font-display text-2xl font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card className="lg:col-span-2">
            <CardTitle>Price experiment</CardTitle>
            <table className="w-full text-sm">
              <thead className="text-left text-[0.72rem] text-stone">
                <tr>
                  <th className="pb-2 font-medium">Arm</th>
                  <th className="pb-2 font-medium">Sessions</th>
                  <th className="pb-2 font-medium">Checkouts</th>
                  <th className="pb-2 font-medium">Purchases</th>
                  <th className="pb-2 font-medium">Conversion</th>
                </tr>
              </thead>
              <tbody>
                {stats.experiments.map((x) => (
                  <tr key={x.key} className="border-t border-line">
                    <td className="py-2 uppercase">{x.key}</td>
                    <td>{x.sessions}</td>
                    <td>{x.checkouts}</td>
                    <td>{x.purchases}</td>
                    <td>{(x.conversionRate * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card className="lg:col-span-3">
            <CardTitle
              aside={
                <Link href="/content" className="text-sm underline">
                  Edit home page
                </Link>
              }
            >
              Storefront
            </CardTitle>
            <p className="text-sm text-stone">
              Change the hero, trust strip, collections and contact links from the Home page
              section.
            </p>
          </Card>
        </div>
      ) : !error ? (
        <p role="status" className="text-sm text-stone">
          Loading…
        </p>
      ) : null}
    </>
  );
}
