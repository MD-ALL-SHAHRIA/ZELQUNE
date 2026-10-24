'use client';

import { Download, MessageCircle, Phone, Search, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/field';
import { Kpi } from '@/components/ui/kpi';
import { EmptyState, PageHeader } from '@/components/ui/page';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage, type Schemas } from '@/lib/api';
import { downloadCsv, takaCell } from '@/lib/csv';
import { formatTaka, humanize, timeAgo } from '@/lib/format';

type List = Schemas['CustomerListDto_Output'];
type Sort = 'recent' | 'spent' | 'orders';
const PAGE = 25;
const local = (phone: string) => phone.replace(/^\+880/, '0');

export default function CustomersPage() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [sort, setSort] = useState<Sort>('recent');
  const [page, setPage] = useState(1);
  const [list, setList] = useState<List | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => {
      setTerm(q.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    let live = true;
    void api
      .GET('/v1/admin/customers', {
        params: { query: { q: term || undefined, sort, page, pageSize: PAGE } },
      })
      .then(({ data, error }) => {
        if (!live) return;
        if (data) setList(data);
        else toast('error', errorMessage(error));
      });
    return () => {
      live = false;
    };
  }, [term, sort, page, tick, toast]);

  const setFriend = async (phone: string, isFriend: boolean) => {
    const { error } = await api.PUT('/v1/admin/customers/{phone}/friend', {
      params: { path: { phone } },
      body: { isFriend },
    });
    if (error) return toast('error', errorMessage(error));
    toast('success', isFriend ? 'Marked as friend or family' : 'Marked as a regular customer');
    setTick((t) => t + 1);
  };

  const exportCsv = () =>
    list &&
    downloadCsv('zelqune-customers.csv', [
      [
        'Name',
        'Phone',
        'District',
        'Orders',
        'Paid orders',
        'Spent (BDT)',
        'First order',
        'Last order',
      ],
      ...list.items.map((c) => [
        c.name,
        local(c.phone),
        c.district,
        c.orders,
        c.paidOrders,
        takaCell(c.spentPaisa),
        c.firstOrderAt.slice(0, 10),
        c.lastOrderAt.slice(0, 10),
      ]),
    ]);

  const pages = list ? Math.max(Math.ceil(list.total / PAGE), 1) : 1;

  return (
    <>
      <PageHeader
        title="Customers"
        description="Everyone who has ordered, by phone number, with what they have spent."
        actions={
          <Button variant="secondary" onClick={exportCsv} disabled={!list?.items.length}>
            <Download /> Export
          </Button>
        }
      />
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {list ? (
          <>
            <Kpi label="Customers" value={String(list.stats.customers)} hint="All time" />
            <Kpi
              label="Returning customers"
              value={String(list.stats.repeat)}
              hint={
                list.stats.customers
                  ? `${Math.round((list.stats.repeat / list.stats.customers) * 100)}% ordered again`
                  : 'No customers yet'
              }
            />
            <Kpi
              label="Lifetime revenue"
              value={formatTaka(list.stats.spentPaisa)}
              hint="Paid orders, all time"
            />
          </>
        ) : (
          Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[104px]" />)
        )}
      </div>
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
          <div className="relative min-w-56 flex-1 sm:max-w-sm">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone"
              aria-hidden
            />
            <Input
              aria-label="Search customers"
              placeholder="Search by name or phone"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            aria-label="Sort"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as Sort);
              setPage(1);
            }}
            className="w-44"
          >
            <option value="recent">Most recent order</option>
            <option value="spent">Highest spend</option>
            <option value="orders">Most orders</option>
          </Select>
        </div>
        {!list ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : list.items.length === 0 ? (
          <EmptyState icon={<Users />} title={term ? 'No one matches' : 'No customers yet'}>
            {term ? 'Try another name or number.' : 'People appear here after their first order.'}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[54rem] text-sm">
              <thead className="bg-cream/60 text-left text-xs text-stone">
                <tr>
                  <th className="py-2.5 pl-5 font-medium">Customer</th>
                  <th className="px-4 py-2.5 font-medium">District</th>
                  <th className="px-4 py-2.5 text-right font-medium">Orders</th>
                  <th className="px-4 py-2.5 text-right font-medium">Spent</th>
                  <th className="px-4 py-2.5 font-medium">Last order</th>
                  <th className="px-4 py-2.5 font-medium">Type</th>
                  <th className="py-2.5 pr-5 text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((c) => (
                  <tr key={c.phone} className="border-t border-line hover:bg-ink/3">
                    <td className="py-2.5 pl-5">
                      <Link
                        href={`/orders?q=${encodeURIComponent(local(c.phone))}`}
                        className="flex items-center gap-3"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-walnut/12 text-xs font-semibold text-walnut">
                          {c.name
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((w) => w[0]?.toUpperCase())
                            .join('')}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-ink hover:underline">
                            {c.name}
                          </span>
                          <span className="block text-xs text-stone tabular">{local(c.phone)}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-ink/80">
                      {c.district ? humanize(c.district) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular">
                      {c.orders}
                      {c.paidOrders !== c.orders ? (
                        <span className="block text-xs text-stone">{c.paidOrders} paid</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium tabular">
                      {formatTaka(c.spentPaisa)}
                    </td>
                    <td className="px-4 py-2.5 text-stone">{timeAgo(c.lastOrderAt)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {c.orders > 1 ? (
                          <Badge tone="success">Returning</Badge>
                        ) : (
                          <Badge>New</Badge>
                        )}
                        {c.channels.includes('B2B') ? <Badge tone="info">Business</Badge> : null}
                        {c.isFriend ? <Badge tone="accent">Friend</Badge> : null}
                      </div>
                    </td>
                    <td className="py-2.5 pr-5">
                      <div className="flex justify-end gap-1">
                        <a
                          href={`tel:${c.phone}`}
                          aria-label={`Call ${c.name}`}
                          className={buttonClass('ghost', 'icon-sm')}
                        >
                          <Phone />
                        </a>
                        <a
                          href={`https://wa.me/${c.phone.replace('+', '')}`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`WhatsApp ${c.name}`}
                          className={buttonClass('ghost', 'icon-sm')}
                        >
                          <MessageCircle />
                        </a>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void setFriend(c.phone, !c.isFriend)}
                          title="Friends and family orders never count toward the GO target"
                        >
                          {c.isFriend ? 'Not friend' : 'Mark friend'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list && list.total > PAGE ? (
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm">
            <span className="text-stone tabular">
              Page {page} of {pages} · {list.total} customers
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </>
  );
}
