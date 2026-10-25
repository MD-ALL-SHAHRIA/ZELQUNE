'use client';

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowUpDown, Download, Search, ShoppingBag } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/field';
import { EmptyState, PageHeader } from '@/components/ui/page';
import { Skeleton } from '@/components/ui/skeleton';
import { LineTabs } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage, type Schemas } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDateTime, formatTaka, humanize, timeAgo } from '@/lib/format';
import { type OrderStatus, PIPELINE, STATUS_LABEL, statusTone } from '@/lib/orders';

type Order = Schemas['AdminOrderListDto_Output']['items'][number];
type Tab = 'ALL' | OrderStatus;
const TABS: Tab[] = ['ALL', ...PIPELINE, 'DELIVERED', 'CANCELLED'];
const LIMIT = 25;
const col = createColumnHelper<Order>();

function OrdersView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const toast = useToast();
  const tab = (params.get('status') as Tab | null) ?? 'ALL';
  const search = params.get('q') ?? '';
  const page = Number(params.get('page') ?? '1') || 1;
  const [q, setQ] = useState(search);
  const [result, setResult] = useState<Schemas['AdminOrderListDto_Output'] | null>(null);
  const [counts, setCounts] = useState<Partial<Record<Tab, number>>>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [exporting, setExporting] = useState(false);

  const setParams = (next: Record<string, string | null>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === '' || (k === 'status' && v === 'ALL') || (k === 'page' && v === '1'))
        sp.delete(k);
      else sp.set(k, v);
    }
    router.replace(`${pathname}${sp.size ? `?${sp}` : ''}`);
  };

  useEffect(() => {
    let live = true;
    void api
      .GET('/v1/admin/orders', {
        params: {
          query: {
            page,
            limit: LIMIT,
            ...(tab !== 'ALL' ? { status: tab } : {}),
            ...(search ? { q: search } : {}),
          },
        },
      })
      .then(({ data, error }) => {
        if (!live) return;
        if (data) setResult(data);
        else toast('error', errorMessage(error));
      });
    return () => {
      live = false;
    };
  }, [tab, search, page, toast]);

  useEffect(() => {
    void Promise.all(
      TABS.map((s) =>
        api.GET('/v1/admin/orders', {
          params: {
            query: {
              limit: 1,
              ...(s !== 'ALL' ? { status: s } : {}),
              ...(search ? { q: search } : {}),
            },
          },
        }),
      ),
    ).then((res) =>
      setCounts(Object.fromEntries(TABS.map((s, i) => [s, res[i]?.data?.total ?? 0]))),
    );
  }, [search]);

  const columns = useMemo(
    () => [
      col.accessor('code', {
        header: 'Order',
        cell: (c) => (
          <span>
            <span className="font-medium text-ink">{c.getValue()}</span>
            {c.row.original.isFriend ? (
              <span className="ml-2 text-[0.6875rem] text-stone">friend</span>
            ) : null}
          </span>
        ),
      }),
      col.accessor('placedAt', {
        header: 'Date',
        cell: (c) => (
          <span title={formatDateTime(c.getValue())} className="text-ink/80">
            {timeAgo(c.getValue())}
          </span>
        ),
      }),
      col.accessor('customerName', {
        header: 'Customer',
        cell: (c) => (
          <span className="block leading-tight">
            <span className="text-ink">{c.getValue()}</span>
            <span className="block text-xs text-stone tabular">{c.row.original.customerPhone}</span>
          </span>
        ),
      }),
      col.accessor('status', {
        header: 'Status',
        cell: (c) => <Badge tone={statusTone(c.getValue())}>{STATUS_LABEL[c.getValue()]}</Badge>,
      }),
      col.accessor('paymentMethod', {
        header: 'Payment',
        cell: (c) => (
          <span className="text-ink/80">
            {c.getValue() === 'COD'
              ? 'Cash on delivery'
              : humanize(c.getValue().replace('_MANUAL', ''))}
          </span>
        ),
      }),
      col.accessor('district', {
        header: 'District',
        cell: (c) => <span className="text-ink/80">{humanize(c.getValue())}</span>,
      }),
      col.accessor('totalPaisa', {
        header: () => <span className="block text-right">Total</span>,
        cell: (c) => (
          <span className="block text-right font-medium tabular">{formatTaka(c.getValue())}</span>
        ),
      }),
    ],
    [],
  );
  const table = useReactTable({
    data: result?.items ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  const total = result?.total ?? 0;
  const first = total ? (page - 1) * LIMIT + 1 : 0;
  const last = Math.min(page * LIMIT, total);

  const exportCsv = async () => {
    setExporting(true);
    const { data, error, response } = await api.GET('/v1/admin/orders.csv', {
      params: {
        query: { ...(tab !== 'ALL' ? { status: tab } : {}), ...(search ? { q: search } : {}) },
      },
      parseAs: 'blob',
    });
    setExporting(false);
    if (!data) return toast('error', errorMessage(error, 'Export failed'));
    const name =
      /filename="?([^"]+)"?/.exec(response.headers.get('content-disposition') ?? '')?.[1] ??
      'orders.csv';
    const url = URL.createObjectURL(data as Blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="Orders"
        description="Check payments, move orders along and ship them."
        actions={
          <Button variant="secondary" onClick={() => void exportCsv()} disabled={exporting}>
            <Download /> {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        }
      />
      <Card>
        <div className="px-3 pt-1">
          <LineTabs
            label="Order status"
            value={tab}
            onChange={(v) => setParams({ status: v, page: '1' })}
            items={TABS.map((s) => ({
              value: s,
              label: s === 'ALL' ? 'All' : STATUS_LABEL[s],
              count: counts[s],
            }))}
          />
        </div>
        <form
          className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            setParams({ q: q.trim() || null, page: '1' });
          }}
        >
          <div className="relative w-full max-w-sm">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone"
              aria-hidden
            />
            <Input
              aria-label="Search orders"
              placeholder="Search by order code, phone or name"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          {search ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQ('');
                setParams({ q: null, page: '1' });
              }}
            >
              Clear search
            </Button>
          ) : null}
        </form>
        {result === null ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : result.items.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag />}
            title={search ? 'No orders match your search' : 'No orders here'}
          >
            {search
              ? 'Try another code, phone number or name.'
              : 'Orders in this step will appear here.'}
          </EmptyState>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[52rem] text-sm">
              <thead className="bg-cream/60 text-left text-xs text-stone">
                {table.getHeaderGroups().map((g) => (
                  <tr key={g.id}>
                    {g.headers.map((h) => (
                      <th key={h.id} className="px-4 py-2.5 font-medium first:pl-5 last:pr-5">
                        {h.column.getCanSort() ? (
                          <button
                            type="button"
                            onClick={h.column.getToggleSortingHandler()}
                            className="inline-flex items-center gap-1 hover:text-ink"
                          >
                            {flexRender(h.column.columnDef.header, h.getContext())}
                            <ArrowUpDown
                              className={cn(
                                'size-3',
                                h.column.getIsSorted() ? 'text-ink' : 'opacity-40',
                              )}
                              aria-hidden
                            />
                          </button>
                        ) : (
                          flexRender(h.column.columnDef.header, h.getContext())
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((r) => (
                  <tr
                    key={r.id}
                    tabIndex={0}
                    onClick={() => router.push(`/orders/${r.original.id}`)}
                    onKeyDown={(e) => e.key === 'Enter' && router.push(`/orders/${r.original.id}`)}
                    className="cursor-pointer border-t border-line transition-colors hover:bg-ink/3 focus-visible:bg-ink/4 focus-visible:outline-none"
                  >
                    {r.getVisibleCells().map((c) => (
                      <td key={c.id} className="px-4 py-3 first:pl-5 last:pr-5">
                        {flexRender(c.column.columnDef.cell, c.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-line px-5 py-3 text-[0.8125rem] text-stone">
          <span className="tabular">{result ? `${first}–${last} of ${total}` : ' '}</span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setParams({ page: String(page - 1) })}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={last >= total}
              onClick={() => setParams({ page: String(page + 1) })}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <OrdersView />
    </Suspense>
  );
}
