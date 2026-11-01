'use client';

import { CircleUserRound, Search, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/field';
import { EmptyState, PageHeader } from '@/components/ui/page';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage, type Schemas } from '@/lib/api';
import { formatDateTime, timeAgo } from '@/lib/format';

type List = Schemas['CustomerAccountListDto_Output'];
const PAGE = 25;

/** Customer accounts (ADR 0021): who signed up, with a verified email and phone. */
export default function CustomerAccountsPage() {
  const toast = useToast();
  const [term, setTerm] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [list, setList] = useState<List | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(term.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [term]);

  useEffect(() => {
    let live = true;
    void api
      .GET('/v1/admin/customer-accounts', {
        params: { query: { page, limit: PAGE, ...(query ? { q: query } : {}) } },
      })
      .then(({ data, error }) => {
        if (!live) return;
        if (data) setList(data);
        else toast('error', errorMessage(error));
      });
    return () => {
      live = false;
    };
  }, [page, query, toast]);

  const pages = list ? Math.max(Math.ceil(list.total / PAGE), 1) : 1;
  return (
    <>
      <PageHeader
        title="Customer accounts"
        description="Everyone who signed up, with their verified email and phone. Orders and requests are linked to these accounts."
      />
      <Card>
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <Search className="size-4 text-stone" aria-hidden />
          <Input
            aria-label="Search accounts"
            placeholder="Search by name, email or phone"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="border-0 shadow-none focus-visible:ring-0"
          />
        </div>
        {!list ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : !list.items.length ? (
          <EmptyState
            icon={<CircleUserRound />}
            title={query ? 'No one matches' : 'No accounts yet'}
          >
            {query
              ? 'Try another name, email or phone number.'
              : 'Customers appear here when they create an account on the website.'}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="text-[0.75rem] text-stone">
                <tr className="border-b border-line">
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">Email</th>
                  <th className="px-4 py-2.5 font-medium">Phone</th>
                  <th className="px-4 py-2.5 font-medium">Signs in with</th>
                  <th className="px-4 py-2.5 font-medium">Joined</th>
                  <th className="px-4 py-2.5 font-medium">Last sign-in</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.items.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-3 font-medium">{a.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        {a.email}
                        {a.emailVerified ? (
                          <ShieldCheck className="size-3.5 text-success" aria-label="Verified" />
                        ) : (
                          <Badge tone="warning">Unverified</Badge>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[0.8125rem]">{a.phone}</td>
                    <td className="px-4 py-3">
                      {a.providers.length
                        ? a.providers
                            .map((p) => (p === 'GOOGLE' ? 'Google' : 'Facebook'))
                            .join(', ')
                        : 'Email'}
                    </td>
                    <td className="px-4 py-3 text-stone" title={formatDateTime(a.createdAt)}>
                      {timeAgo(a.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-stone">
                      {a.lastLoginAt ? timeAgo(a.lastLoginAt) : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list && pages > 1 ? (
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm">
            <span className="text-stone">
              Page {page} of {pages} · {list.total} accounts
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
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
