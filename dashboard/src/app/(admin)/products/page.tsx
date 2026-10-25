'use client';

import { Package, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/field';
import { EmptyState, PageHeader } from '@/components/ui/page';
import { Skeleton } from '@/components/ui/skeleton';
import { LineTabs } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage, type Schemas } from '@/lib/api';
import { sampleProductPhoto } from '@/features/content/defaults';
import { formatTaka, humanize, timeAgo } from '@/lib/format';

type Product = Schemas['AdminProductListDto_Output']['items'][number];
type Status = 'ALL' | Product['status'];
const STATUS_TONE = { ACTIVE: 'success', DRAFT: 'warning', ARCHIVED: 'neutral' } as const;
const STATUS_LABEL = { ACTIVE: 'Active', DRAFT: 'Draft', ARCHIVED: 'Archived' } as const;

/** Storefront card info (photo, lowest price) for active products, by slug. */
function useStorefrontCards() {
  const [cards, setCards] = useState<Record<string, { image?: string; price?: number }>>({});
  useEffect(() => {
    void api.GET('/v1/catalog/products', { params: { query: { limit: 50 } } }).then(({ data }) => {
      if (!data) return;
      setCards(
        Object.fromEntries(
          data.items.map((p) => [
            p.slug,
            { image: p.primaryMedia?.url, price: p.fromPrice?.amountPaisa },
          ]),
        ),
      );
    });
  }, []);
  return cards;
}

export default function ProductsPage() {
  const router = useRouter();
  const toast = useToast();
  const [all, setAll] = useState<Product[] | null>(null);
  const [tab, setTab] = useState<Status>('ALL');
  const [q, setQ] = useState('');
  const cards = useStorefrontCards();

  useEffect(() => {
    void api
      .GET('/v1/admin/products', { params: { query: { limit: 100 } } })
      .then(({ data, error }) => {
        if (data) setAll(data.items);
        else toast('error', errorMessage(error));
      });
  }, [toast]);

  const counts = useMemo(() => {
    const c: Record<Status, number> = { ALL: 0, ACTIVE: 0, DRAFT: 0, ARCHIVED: 0 };
    for (const p of all ?? []) {
      c.ALL += 1;
      c[p.status] += 1;
    }
    return c;
  }, [all]);
  const term = q.trim().toLowerCase();
  const shown = (all ?? []).filter(
    (p) =>
      (tab === 'ALL' || p.status === tab) &&
      (!term || `${p.nameEn} ${p.nameBn} ${p.slug}`.toLowerCase().includes(term)),
  );

  return (
    <>
      <PageHeader title="Products" description="Names, photos, how they are sold and publishing." />
      <Card>
        <div className="px-3 pt-1">
          <LineTabs
            label="Product status"
            value={tab}
            onChange={setTab}
            items={(['ALL', 'ACTIVE', 'DRAFT', 'ARCHIVED'] as Status[]).map((s) => ({
              value: s,
              label: s === 'ALL' ? 'All' : STATUS_LABEL[s],
              count: all ? counts[s] : undefined,
            }))}
          />
        </div>
        <div className="border-b border-line px-4 py-3">
          <div className="relative max-w-sm">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone"
              aria-hidden
            />
            <Input
              aria-label="Search products"
              placeholder="Search by name or slug"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        {all === null ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <EmptyState icon={<Package />} title="No products here">
            {term ? 'Try another name.' : 'Products in this status will appear here.'}
          </EmptyState>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[46rem] text-sm">
              <thead className="bg-cream/60 text-left text-xs text-stone">
                <tr>
                  <th className="py-2.5 pl-5 font-medium">Product</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Sold as</th>
                  <th className="px-4 py-2.5 font-medium">Finishes</th>
                  <th className="px-4 py-2.5 text-right font-medium">From</th>
                  <th className="py-2.5 pr-5 text-right font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => {
                  const card = cards[p.slug];
                  const image = card?.image ?? sampleProductPhoto(p.slug);
                  return (
                    <tr
                      key={p.id}
                      tabIndex={0}
                      onClick={() => router.push(`/products/${p.id}`)}
                      onKeyDown={(e) => e.key === 'Enter' && router.push(`/products/${p.id}`)}
                      className="cursor-pointer border-t border-line transition-colors hover:bg-ink/3 focus-visible:bg-ink/4 focus-visible:outline-none"
                    >
                      <td className="py-2.5 pl-5">
                        <div className="flex items-center gap-3">
                          <span className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-sand text-stone">
                            {image ? (
                              // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail of the stored file
                              <img
                                src={image}
                                alt=""
                                className="absolute inset-0 h-full w-full object-cover"
                              />
                            ) : (
                              <Package className="size-4" aria-hidden />
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-ink">{p.nameEn}</span>
                            <span className="block truncate text-xs text-stone">{p.nameBn}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-ink/80">
                        {humanize(p.saleMode)}
                        {p.leadTimeDays ? (
                          <span className="text-stone"> · {p.leadTimeDays} days</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5 text-ink/80 tabular">{p.variantCount}</td>
                      <td className="px-4 py-2.5 text-right font-medium tabular">
                        {card?.price ? formatTaka(card.price) : '—'}
                      </td>
                      <td className="py-2.5 pr-5 text-right text-stone">{timeAgo(p.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
