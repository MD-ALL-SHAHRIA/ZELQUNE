'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge, Input, Notice, PageHeader } from '@/components/ui';
import { api, errorMessage, type Schemas } from '@/lib/api';
import { formatDateTime, humanize } from '@/lib/format';

type List = Schemas['AdminProductListDto_Output'];

export default function ProductsPage() {
  const [q, setQ] = useState('');
  const [list, setList] = useState<List | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const t = window.setTimeout(() => {
      void api
        .GET('/v1/admin/products', {
          params: { query: { limit: 100, ...(q.trim() ? { q: q.trim() } : {}) } },
        })
        .then(({ data, error }) => {
          if (!live) return;
          if (data) setList(data);
          else setError(errorMessage(error));
        });
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [q]);

  return (
    <>
      <PageHeader title="Products" description="Names, descriptions, photos and publishing." />
      <Input
        aria-label="Search products"
        placeholder="Search by name, slug or SKU"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="mb-5 max-w-sm"
      />
      {error ? <Notice tone="error">{error}</Notice> : null}
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list?.items.map((p) => (
          <li key={p.id}>
            <Link
              href={`/products/${p.id}`}
              className="block rounded-xl border border-line bg-surface p-5 transition-colors hover:border-walnut"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-display text-xl font-medium">{p.nameEn}</p>
                <Badge
                  tone={p.status === 'ACTIVE' ? 'green' : p.status === 'DRAFT' ? 'amber' : 'stone'}
                >
                  {humanize(p.status)}
                </Badge>
              </div>
              <p className="text-sm text-stone">{p.nameBn}</p>
              <p className="mt-3 text-[0.75rem] text-stone">
                {humanize(p.saleMode)} · {p.variantCount} finishes · updated{' '}
                {formatDateTime(p.updatedAt)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
      {list && list.items.length === 0 ? (
        <p className="text-sm text-stone">No products found.</p>
      ) : null}
    </>
  );
}
