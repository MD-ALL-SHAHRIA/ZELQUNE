'use client';

import { Boxes, CircleX, Minus, PackageCheck, Plus, Search, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { Kpi } from '@/components/ui/kpi';
import { EmptyState, PageHeader } from '@/components/ui/page';
import { Skeleton } from '@/components/ui/skeleton';
import { LineTabs } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage, type Schemas } from '@/lib/api';
import { humanize, timeAgo } from '@/lib/format';

type Level = Schemas['StockListDto_Output']['items'][number];
type Product = Schemas['AdminProductDto_Output'];
type Reason = 'RECEIPT' | 'ADJUSTMENT' | 'RETURN';
type Tab = 'ALL' | 'LOW' | 'OUT';
interface Row extends Level {
  product?: Pick<Product, 'id' | 'nameEn' | 'saleMode'>;
  finish: string;
}

/** Few enough left that you should make more. */
const LOW = 3;
const REASON: Record<Reason, string> = {
  RECEIPT: 'New stock made or received',
  ADJUSTMENT: 'Count correction (damaged, lost, recount)',
  RETURN: 'Returned by a customer',
};

export default function InventoryPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [tab, setTab] = useState<Tab>('ALL');
  const [q, setQ] = useState('');
  const [adjust, setAdjust] = useState<{
    row: Row;
    delta: number;
    reason: Reason;
    note: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [stock, list] = await Promise.all([
      api.GET('/v1/admin/stock'),
      api.GET('/v1/admin/products', { params: { query: { limit: 100 } } }),
    ]);
    if (!stock.data || !list.data) return toast('error', errorMessage(stock.error ?? list.error));
    const details = await Promise.all(
      list.data.items.map((p) =>
        api.GET('/v1/admin/products/{id}', { params: { path: { id: p.id } } }).then((r) => r.data),
      ),
    );
    // Every in-stock finish is listed (0 until stock is first added), plus anything with stock.
    const levels = new Map(stock.data.items.map((l) => [l.variantId, l]));
    const rows: Row[] = [];
    for (const p of details) {
      if (!p) continue;
      for (const v of p.variants) {
        const level = levels.get(v.id);
        if (!level && (p.saleMode !== 'IN_STOCK' || p.status === 'ARCHIVED')) continue;
        levels.delete(v.id);
        rows.push({
          variantId: v.id,
          sku: v.sku,
          onHand: level?.onHand ?? 0,
          reserved: level?.reserved ?? 0,
          available: level?.available ?? 0,
          updatedAt: level?.updatedAt ?? p.updatedAt,
          product: p,
          finish: Object.values(v.options).join(' · '),
        });
      }
    }
    for (const l of levels.values()) rows.push({ ...l, finish: '' });
    setRows(rows.sort((a, b) => a.available - b.available));
  }, [toast]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() awaits the API before setting state
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const c = { ALL: 0, LOW: 0, OUT: 0 };
    for (const r of rows ?? []) {
      c.ALL += 1;
      if (r.available <= 0) c.OUT += 1;
      else if (r.available <= LOW) c.LOW += 1;
    }
    return c;
  }, [rows]);
  const term = q.trim().toLowerCase();
  const shown = (rows ?? []).filter(
    (r) =>
      (tab === 'ALL' ||
        (tab === 'OUT' ? r.available <= 0 : r.available > 0 && r.available <= LOW)) &&
      (!term || `${r.sku} ${r.product?.nameEn ?? ''} ${r.finish}`.toLowerCase().includes(term)),
  );

  const save = async () => {
    if (!adjust) return;
    setSaving(true);
    const { error } = await api.POST('/v1/admin/stock/{id}/adjustments', {
      params: { path: { id: adjust.row.variantId } },
      body: {
        sku: adjust.row.sku,
        delta: adjust.delta,
        reason: adjust.reason,
        note: adjust.note.trim() || null,
      },
    });
    setSaving(false);
    if (error) return toast('error', errorMessage(error));
    toast('success', `${adjust.row.sku}: ${adjust.delta > 0 ? '+' : ''}${adjust.delta}`);
    setAdjust(null);
    void load();
  };

  const units = (rows ?? []).reduce((s, r) => s + r.onHand, 0);
  const reserved = (rows ?? []).reduce((s, r) => s + r.reserved, 0);

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Ready-made stock for in-stock pieces. Made-to-order and pre-order pieces are built after ordering."
      />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {rows ? (
          <>
            <Kpi
              label="Pieces on hand"
              icon={Boxes}
              tone="walnut"
              value={String(units)}
              hint={`${rows.length} SKUs tracked`}
            />
            <Kpi
              label="Held for orders"
              icon={PackageCheck}
              tone="brass"
              value={String(reserved)}
              hint="Reserved, not shipped yet"
            />
            <Kpi
              label="Running low"
              icon={TriangleAlert}
              tone="clay"
              value={String(counts.LOW)}
              hint={`${LOW} or fewer left`}
            />
            <Kpi
              label="Out of stock"
              icon={CircleX}
              tone="clay"
              value={String(counts.OUT)}
              hint="Cannot be bought now"
            />
          </>
        ) : (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[104px]" />)
        )}
      </div>
      <Card>
        <div className="px-3 pt-1">
          <LineTabs
            label="Stock"
            value={tab}
            onChange={setTab}
            items={[
              { value: 'ALL', label: 'All', count: rows ? counts.ALL : undefined },
              { value: 'LOW', label: 'Running low', count: rows ? counts.LOW : undefined },
              { value: 'OUT', label: 'Out of stock', count: rows ? counts.OUT : undefined },
            ]}
          />
        </div>
        <div className="border-b border-line px-4 py-3">
          <div className="relative max-w-sm">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone"
              aria-hidden
            />
            <Input
              aria-label="Search stock"
              placeholder="Search by product, finish or SKU"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        {!rows ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <EmptyState icon={<Boxes />} title="Nothing here">
            {rows.length
              ? 'Try another filter.'
              : 'All your products are made to order or pre-order, so there is no ready stock to count. Set a product to “In stock” and its finishes appear here.'}
          </EmptyState>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[48rem] text-sm">
              <thead className="bg-cream/60 text-left text-xs text-stone">
                <tr>
                  <th className="py-2.5 pl-5 font-medium">Product</th>
                  <th className="px-4 py-2.5 font-medium">SKU</th>
                  <th className="px-4 py-2.5 text-right font-medium">On hand</th>
                  <th className="px-4 py-2.5 text-right font-medium">Held</th>
                  <th className="px-4 py-2.5 text-right font-medium">Available</th>
                  <th className="px-4 py-2.5 font-medium">Updated</th>
                  <th className="py-2.5 pr-5 text-right font-medium">Adjust</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.variantId} className="border-t border-line hover:bg-ink/3">
                    <td className="py-2.5 pl-5">
                      {r.product ? (
                        <Link href={`/products/${r.product.id}`} className="hover:underline">
                          <span className="block font-medium text-ink">{r.product.nameEn}</span>
                        </Link>
                      ) : (
                        <span className="block text-stone">Unknown product</span>
                      )}
                      <span className="block text-xs text-stone">
                        {r.finish ? humanize(r.finish) : ''}
                        {r.product && r.product.saleMode !== 'IN_STOCK'
                          ? ` · ${humanize(r.product.saleMode)}`
                          : ''}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink/80">{r.sku}</td>
                    <td className="px-4 py-2.5 text-right tabular">{r.onHand}</td>
                    <td className="px-4 py-2.5 text-right text-stone tabular">{r.reserved}</td>
                    <td className="px-4 py-2.5 text-right">
                      {r.available <= 0 ? (
                        <Badge tone="danger">Out</Badge>
                      ) : r.available <= LOW ? (
                        <Badge tone="warning">{r.available} left</Badge>
                      ) : (
                        <span className="font-medium tabular">{r.available}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-stone">{timeAgo(r.updatedAt)}</td>
                    <td className="py-2.5 pr-5">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon-sm"
                          variant="secondary"
                          aria-label={`Remove stock from ${r.sku}`}
                          disabled={r.available <= 0}
                          onClick={() =>
                            setAdjust({ row: r, delta: -1, reason: 'ADJUSTMENT', note: '' })
                          }
                        >
                          <Minus />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="secondary"
                          aria-label={`Add stock to ${r.sku}`}
                          onClick={() =>
                            setAdjust({ row: r, delta: 1, reason: 'RECEIPT', note: '' })
                          }
                        >
                          <Plus />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {adjust ? (
        <Dialog
          open
          onClose={() => setAdjust(null)}
          title={`Adjust ${adjust.row.sku}`}
          description={`${adjust.row.onHand} on hand, ${adjust.row.reserved} held for orders. Stock never goes below what is held.`}
          footer={
            <>
              <Button variant="secondary" onClick={() => setAdjust(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => void save()}
                disabled={
                  saving ||
                  adjust.delta === 0 ||
                  adjust.row.onHand + adjust.delta < adjust.row.reserved
                }
              >
                {saving ? 'Saving…' : `Save (${adjust.row.onHand + adjust.delta} on hand)`}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="Change" hint="Use a minus number to take pieces away.">
              <Input
                type="number"
                value={adjust.delta}
                autoFocus
                onChange={(e) =>
                  setAdjust({ ...adjust, delta: Math.trunc(Number(e.target.value)) || 0 })
                }
              />
            </Field>
            <Field label="Why">
              <Select
                value={adjust.reason}
                onChange={(e) => setAdjust({ ...adjust, reason: e.target.value as Reason })}
              >
                {(Object.keys(REASON) as Reason[]).map((r) => (
                  <option key={r} value={r}>
                    {REASON[r]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Note (optional)">
              <Textarea
                value={adjust.note}
                maxLength={300}
                onChange={(e) => setAdjust({ ...adjust, note: e.target.value })}
                className="min-h-16"
              />
            </Field>
          </div>
        </Dialog>
      ) : null}
    </>
  );
}
