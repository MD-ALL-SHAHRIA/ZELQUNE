'use client';

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Input, Notice, PageHeader, Select } from '@/components/ui';
import { api, errorMessage, type Schemas } from '@/lib/api';
import { formatDateTime, formatTaka, humanize } from '@/lib/format';
import { NEXT_STATUS, type OrderStatus, statusTone } from '@/lib/orders';

type Order = Schemas['AdminOrderListDto_Output']['items'][number];
const col = createColumnHelper<Order>();
const LIMIT = 25;

export default function OrdersPage() {
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Schemas['AdminOrderListDto_Output'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void api
      .GET('/v1/admin/orders', {
        params: {
          query: {
            page,
            limit: LIMIT,
            ...(status ? { status } : {}),
            ...(search ? { q: search } : {}),
          },
        },
      })
      .then(({ data, error }) => {
        if (!live) return;
        if (data) {
          setResult(data);
          setError(null);
        } else setError(errorMessage(error));
      });
    return () => {
      live = false;
    };
  }, [status, search, page]);

  const columns = useMemo(
    () => [
      col.accessor('code', {
        header: 'Order',
        cell: (c) => (
          <Link
            href={`/orders/${c.row.original.id}`}
            className="font-medium underline-offset-4 hover:underline"
          >
            {c.getValue()}
          </Link>
        ),
      }),
      col.accessor('placedAt', { header: 'Placed', cell: (c) => formatDateTime(c.getValue()) }),
      col.accessor('customerName', {
        header: 'Customer',
        cell: (c) => (
          <span>
            {c.getValue()}
            <span className="block text-[0.75rem] text-stone">{c.row.original.customerPhone}</span>
          </span>
        ),
      }),
      col.accessor('status', {
        header: 'Status',
        cell: (c) => <Badge tone={statusTone(c.getValue())}>{humanize(c.getValue())}</Badge>,
      }),
      col.accessor('paymentMethod', { header: 'Payment', cell: (c) => humanize(c.getValue()) }),
      col.accessor('totalPaisa', {
        header: 'Total',
        cell: (c) => <span className="tabular-nums">{formatTaka(c.getValue())}</span>,
      }),
    ],
    [],
  );
  const table = useReactTable({
    data: result?.items ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  const pages = result ? Math.max(1, Math.ceil(result.total / LIMIT)) : 1;

  return (
    <>
      <PageHeader title="Orders" description="Verify advances, move orders along and ship them." />
      <form
        className="mb-5 flex flex-wrap gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSearch(q.trim());
        }}
      >
        <Input
          aria-label="Search orders"
          placeholder="Code, phone or name"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <Select
          aria-label="Status"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as OrderStatus | '');
          }}
          className="max-w-[13rem]"
        >
          <option value="">All statuses</option>
          {Object.keys(NEXT_STATUS).map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[44rem] text-sm">
          <thead className="bg-cream text-left text-[0.75rem] text-stone">
            {table.getHeaderGroups().map((g) => (
              <tr key={g.id}>
                {g.headers.map((h) => (
                  <th key={h.id} className="px-4 py-3 font-medium">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((r) => (
              <tr key={r.id} className="border-t border-line">
                {r.getVisibleCells().map((c) => (
                  <td key={c.id} className="px-4 py-3 align-top">
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {result && result.items.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-stone">
                  No orders match.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-stone">
        <span>{result ? `${result.total} orders` : 'Loading…'}</span>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
}
