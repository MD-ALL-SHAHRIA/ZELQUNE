'use client';

import { ChevronDown, History, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge, type Tone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/field';
import { EmptyState, PageHeader } from '@/components/ui/page';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage, type Schemas } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { formatDateTime, humanize, timeAgo } from '@/lib/format';

type Page = Schemas['AuditLogPageDto_Output'];
const LIMIT = 50;

const ENTITIES: Record<string, string> = {
  order: 'Orders',
  payment: 'Payments',
  shipment: 'Shipments',
  product: 'Products',
  variant: 'Finishes',
  price: 'Prices',
  category: 'Categories',
  stock: 'Stock',
  content: 'Website content',
  promotion: 'Sales',
  coupon: 'Coupons',
  expense: 'Expenses',
  quote: 'Quotes',
  customer: 'Customers',
};

const tone = (action: string): Tone =>
  /delete|reject|cancel|archive|deactivate/i.test(action)
    ? 'danger'
    : /create|publish|verify|confirm/i.test(action)
      ? 'success'
      : 'neutral';

export default function AuditPage() {
  const { state } = useAuth();
  const toast = useToast();
  const [entityType, setEntityType] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const owner = state.status === 'signedIn' && state.user.role === 'OWNER';

  useEffect(() => {
    if (!owner) return;
    let live = true;
    void api
      .GET('/v1/admin/audit-log', {
        params: { query: { page, limit: LIMIT, ...(entityType ? { entityType } : {}) } },
      })
      .then(({ data: d, error }) => {
        if (!live) return;
        if (d) setData(d);
        else toast('error', errorMessage(error));
      });
    return () => {
      live = false;
    };
  }, [owner, entityType, page, toast]);

  if (!owner)
    return (
      <>
        <PageHeader title="Audit log" />
        <Card>
          <EmptyState icon={<Lock />} title="Only the owner can see the audit log" />
        </Card>
      </>
    );

  const pages = data ? Math.max(Math.ceil(data.total / LIMIT), 1) : 1;

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every change anyone made in the admin: who, what and when. It cannot be edited."
        actions={
          <Select
            aria-label="Area"
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(1);
            }}
            className="w-44"
          >
            <option value="">Everything</option>
            {Object.entries(ENTITIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        }
      />
      <Card>
        {!data ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : data.items.length === 0 ? (
          <EmptyState icon={<History />} title="No changes recorded yet" />
        ) : (
          <ol className="divide-y divide-line">
            {data.items.map((e) => {
              const expanded = open === e.id;
              const changes = e.changes ? Object.entries(e.changes) : [];
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => setOpen(expanded ? null : e.id)}
                    aria-expanded={expanded}
                    disabled={!changes.length}
                    className="flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-ink/3 disabled:cursor-default disabled:hover:bg-transparent"
                  >
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-ink/6 text-[0.6875rem] font-semibold text-stone uppercase">
                      {e.actor.role.slice(0, 2)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-ink">{e.summary}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone">
                        <Badge tone={tone(e.action)}>{humanize(e.action.replace('.', ' '))}</Badge>
                        <span>{ENTITIES[e.entityType] ?? humanize(e.entityType)}</span>
                        <span>·</span>
                        <span>{humanize(e.actor.role)}</span>
                        <span>·</span>
                        <time dateTime={e.occurredAt} title={formatDateTime(e.occurredAt)}>
                          {timeAgo(e.occurredAt)}
                        </time>
                      </span>
                    </span>
                    {changes.length ? (
                      <ChevronDown
                        className={cn(
                          'mt-1 size-4 text-stone transition-transform',
                          expanded && 'rotate-180',
                        )}
                        aria-hidden
                      />
                    ) : null}
                  </button>
                  {expanded ? (
                    <dl className="mx-5 mb-3 ml-16 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg bg-cream/60 p-3 text-xs">
                      {changes.map(([k, v]) => (
                        <div key={k} className="contents">
                          <dt className="text-stone">{k}</dt>
                          <dd className="font-mono break-all text-ink/85">
                            {typeof v === 'string' ? v : JSON.stringify(v)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
        {data && data.total > LIMIT ? (
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm">
            <span className="text-stone tabular">
              Page {page} of {pages} · {data.total} changes
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Newer
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= pages}
                onClick={() => setPage(page + 1)}
              >
                Older
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </>
  );
}
