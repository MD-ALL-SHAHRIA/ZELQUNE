'use client';

import { FileSignature, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/field';
import { EmptyState, PageHeader } from '@/components/ui/page';
import { Skeleton } from '@/components/ui/skeleton';
import { LineTabs, Tabs } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import {
  QUOTE_KIND,
  QUOTE_STATUS,
  SPACE,
  type QuoteKind,
  type QuoteStatus,
} from '@/features/quotes/quotes';
import { api, errorMessage, type Schemas } from '@/lib/api';
import { formatTaka, timeAgo } from '@/lib/format';

type List = Schemas['AdminQuoteListDto_Output'];
const LIMIT = 20;

export default function QuotesPage() {
  const router = useRouter();
  const toast = useToast();
  const [status, setStatus] = useState<'ALL' | QuoteStatus>('ALL');
  const [kind, setKind] = useState<'ALL' | QuoteKind>('ALL');
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const [list, setList] = useState<List | null>(null);

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
      .GET('/v1/admin/quotes', {
        params: {
          query: {
            page,
            limit: LIMIT,
            ...(status !== 'ALL' ? { status } : {}),
            ...(kind !== 'ALL' ? { kind } : {}),
            ...(term ? { q: term } : {}),
          },
        },
      })
      .then(({ data, error }) => {
        if (!live) return;
        if (data) setList(data);
        else toast('error', errorMessage(error));
      });
    return () => {
      live = false;
    };
  }, [status, kind, term, page, toast]);

  const pages = list ? Math.max(Math.ceil(list.total / LIMIT), 1) : 1;

  return (
    <>
      <PageHeader
        title="Quotes and requests"
        description="Bulk and corporate orders to price, and interior design or construction leads to call back."
      />
      <Card>
        <div className="px-3 pt-1">
          <LineTabs
            label="Quote status"
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            items={[
              { value: 'ALL', label: 'All' },
              ...(Object.keys(QUOTE_STATUS) as QuoteStatus[]).map((s) => ({
                value: s,
                label: QUOTE_STATUS[s].label,
              })),
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
          <div className="relative min-w-56 flex-1 sm:max-w-sm">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone"
              aria-hidden
            />
            <Input
              aria-label="Search quotes"
              placeholder="Search by code, company, name or phone"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs
            label="Request type"
            value={kind}
            onChange={(v) => {
              setKind(v);
              setPage(1);
            }}
            items={[
              { value: 'ALL', label: 'All types' },
              ...(Object.keys(QUOTE_KIND) as QuoteKind[]).map((k) => ({
                value: k,
                label: QUOTE_KIND[k],
              })),
            ]}
          />
        </div>
        {!list ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : list.items.length === 0 ? (
          <EmptyState icon={<FileSignature />} title="No requests here">
            Requests from the bulk order, interior design and construction pages land here.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[50rem] text-sm">
              <thead className="bg-cream/60 text-left text-xs text-stone">
                <tr>
                  <th className="py-2.5 pl-5 font-medium">Request</th>
                  <th className="px-4 py-2.5 font-medium">From</th>
                  <th className="px-4 py-2.5 font-medium">Type</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Total</th>
                  <th className="py-2.5 pr-5 text-right font-medium">Received</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((x) => (
                  <tr
                    key={x.id}
                    tabIndex={0}
                    onClick={() => router.push(`/quotes/${x.id}`)}
                    onKeyDown={(e) => e.key === 'Enter' && router.push(`/quotes/${x.id}`)}
                    className="cursor-pointer border-t border-line hover:bg-ink/3 focus-visible:bg-ink/4 focus-visible:outline-none"
                  >
                    <td className="py-2.5 pl-5">
                      <span className="block font-mono text-[0.8125rem] font-medium text-ink">
                        {x.code}
                      </span>
                      <span className="block text-xs text-stone">
                        {x.design
                          ? `${SPACE[x.design.spaceType] ?? x.design.spaceType}${x.design.sizeSqft ? ` · ${x.design.sizeSqft} sq ft` : ''}`
                          : (x.organizationName ?? 'Bulk order')}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="block text-ink">{x.organizationName ?? x.contactName}</span>
                      <span className="block text-xs text-stone">
                        {x.organizationName ? `${x.contactName} · ` : ''}
                        {x.phone.replace(/^\+880/, '0')}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-ink/80">{QUOTE_KIND[x.kind]}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={QUOTE_STATUS[x.status].tone}>
                        {QUOTE_STATUS[x.status].label}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular">
                      {x.totals ? formatTaka(x.totals.totalPaisa) : '—'}
                    </td>
                    <td className="py-2.5 pr-5 text-right text-stone">{timeAgo(x.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list && list.total > LIMIT ? (
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm">
            <span className="text-stone tabular">
              Page {page} of {pages}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= pages}
                onClick={() => setPage(page + 1)}
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
