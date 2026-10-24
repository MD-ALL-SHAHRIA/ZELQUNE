'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage, type Schemas } from '@/lib/api';
import { formatTaka, humanize } from '@/lib/format';

type Product = Schemas['AdminProductDto_Output'];
type Variant = Product['variants'][number];

const taka = (paisa: number | null | undefined) => (paisa ? String(paisa / 100) : '');
const toPaisa = (v: string) => (v.trim() ? Math.max(0, Math.round(Number(v) * 100)) : null);

/** One finish: retail price (history kept by the catalog) and unit cost (for profit and loss). */
function FinishRow({ product, v, onSaved }: { product: Product; v: Variant; onSaved: () => void }) {
  const toast = useToast();
  const [price, setPrice] = useState(taka(v.basePrice?.amountPaisa));
  const [cost, setCost] = useState(taka(v.costPaisa));
  const [saving, setSaving] = useState(false);
  const priceP = toPaisa(price);
  const costP = toPaisa(cost);
  const dirty = priceP !== (v.basePrice?.amountPaisa ?? null) || costP !== (v.costPaisa ?? null);
  const margin = priceP && costP !== null ? Math.round(((priceP - costP) / priceP) * 100) : null;

  const save = async () => {
    setSaving(true);
    if (priceP && priceP !== v.basePrice?.amountPaisa) {
      const compareAt = v.basePrice?.compareAtPaisa ?? null;
      const { error } = await api.PUT('/v1/admin/variants/{id}/price', {
        params: { path: { id: v.id } },
        body: {
          amountPaisa: priceP,
          compareAtPaisa: compareAt && compareAt > priceP ? compareAt : null,
        },
      });
      if (error) {
        setSaving(false);
        return toast('error', errorMessage(error));
      }
    }
    if (costP !== (v.costPaisa ?? null)) {
      const { error } = await api.PUT('/v1/admin/products/{id}/variants/{sku}', {
        params: { path: { id: product.id, sku: v.sku } },
        body: {
          options: v.options,
          weightGrams: v.weightGrams,
          widthMm: v.widthMm,
          heightMm: v.heightMm,
          depthMm: v.depthMm,
          position: v.position,
          isActive: v.isActive,
          packageLengthMm: v.packageLengthMm,
          packageWidthMm: v.packageWidthMm,
          packageHeightMm: v.packageHeightMm,
          packageWeightGrams: v.packageWeightGrams,
          costPaisa: costP,
        },
      });
      if (error) {
        setSaving(false);
        return toast('error', errorMessage(error));
      }
    }
    setSaving(false);
    toast('success', `${v.sku} saved`);
    onSaved();
  };

  return (
    <tr className="border-t border-line">
      <td className="py-2.5 pl-5">
        {Object.values(v.options)
          .map((x) => humanize(String(x)))
          .join(' · ') || '—'}
        <span className="block text-xs text-stone tabular">{v.sku}</span>
      </td>
      <td className="px-3 py-2">
        <Input
          type="number"
          min={1}
          aria-label={`Price of ${v.sku}`}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="ml-auto w-28 text-right"
        />
      </td>
      <td className="px-3 py-2">
        <Input
          type="number"
          min={0}
          aria-label={`Unit cost of ${v.sku}`}
          placeholder="Not set"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          className="ml-auto w-28 text-right"
        />
      </td>
      <td className="px-3 py-2.5 text-right tabular">
        {margin === null ? (
          <span className="text-stone">—</span>
        ) : (
          <span className={margin < 0 ? 'text-danger' : 'text-ink'}>
            {margin}%
            <span className="block text-xs text-stone">
              {formatTaka((priceP ?? 0) - (costP ?? 0))} each
            </span>
          </span>
        )}
      </td>
      <td className="py-2.5 pr-5 text-right">
        {dirty ? (
          <Button size="sm" disabled={saving || !priceP} onClick={() => void save()}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        ) : (
          <Badge tone={v.isActive ? 'success' : 'neutral'}>{v.isActive ? 'Shown' : 'Hidden'}</Badge>
        )}
      </td>
    </tr>
  );
}

export function Finishes({ product, onSaved }: { product: Product; onSaved: () => void }) {
  return (
    <table className="w-full min-w-[36rem] text-sm">
      <thead className="text-left text-xs text-stone">
        <tr>
          <th className="py-2.5 pl-5 font-medium">Finish</th>
          <th className="px-3 py-2.5 text-right font-medium">Price (৳)</th>
          <th className="px-3 py-2.5 text-right font-medium">Unit cost (৳)</th>
          <th className="px-3 py-2.5 text-right font-medium">Margin</th>
          <th className="py-2.5 pr-5">
            <span className="sr-only">Save</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {product.variants.map((v) => (
          <FinishRow
            key={`${v.id}-${v.basePrice?.amountPaisa}-${v.costPaisa}`}
            product={product}
            v={v}
            onSaved={onSaved}
          />
        ))}
      </tbody>
    </table>
  );
}
