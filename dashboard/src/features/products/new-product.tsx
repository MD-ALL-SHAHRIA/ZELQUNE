'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Select } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage, type Schemas } from '@/lib/api';

type Category = Schemas['AdminCategoryListDto_Output']['items'][number];
type SaleMode = 'IN_STOCK' | 'PRE_ORDER' | 'MADE_TO_ORDER';

const MODES: { value: SaleMode; label: string }[] = [
  { value: 'PRE_ORDER', label: 'Pre-order' },
  { value: 'IN_STOCK', label: 'In stock' },
  { value: 'MADE_TO_ORDER', label: 'Made to order' },
];

/** "Walnut Moon Panel" → "walnut-moon-panel". */
const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Creates a product as a DRAFT with the basics, then opens its page to add finishes, prices and
 * photos before publishing. Nothing appears on the website until it is published.
 */
export function NewProductDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [nameEn, setNameEn] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [saleMode, setSaleMode] = useState<SaleMode>('PRE_ORDER');
  const [leadTime, setLeadTime] = useState('10');
  const [categoryId, setCategoryId] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    void api.GET('/v1/admin/categories').then(({ data }) => setCategories(data?.items ?? []));
  }, [open]);

  const finalSlug = slugTouched ? slug : slugify(nameEn);
  const ready = nameEn.trim() && nameBn.trim() && finalSlug;

  async function create() {
    setBusy(true);
    const { data, error } = await api.POST('/v1/admin/products', {
      body: {
        nameEn: nameEn.trim(),
        nameBn: nameBn.trim(),
        slug: finalSlug,
        saleMode,
        leadTimeDays: saleMode === 'IN_STOCK' || !leadTime ? null : Number(leadTime),
        categoryIds: categoryId ? [categoryId] : [],
      },
    });
    setBusy(false);
    if (!data) return toast('error', errorMessage(error));
    toast('success', 'Draft created. Add a finish, price and photos, then publish.');
    router.push(`/products/${data.id}`);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New product"
      description="Saved as a draft. You add finishes, prices and photos on the next page."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void create()} disabled={!ready || busy}>
            {busy ? 'Creating…' : 'Create draft'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="Name (English)">
          <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} autoFocus />
        </Field>
        <Field label="Name (Bangla)">
          <Input value={nameBn} onChange={(e) => setNameBn(e.target.value)} lang="bn" />
        </Field>
        <Field label="Web address" hint={`zelqune.com/en/products/${finalSlug || '…'}`}>
          <Input
            value={finalSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="How it is sold">
            <Select value={saleMode} onChange={(e) => setSaleMode(e.target.value as SaleMode)}>
              {MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
          {saleMode !== 'IN_STOCK' ? (
            <Field label="Making time (days)">
              <Input
                type="number"
                min={0}
                max={365}
                value={leadTime}
                onChange={(e) => setLeadTime(e.target.value)}
              />
            </Field>
          ) : null}
        </div>
        <Field label="Category">
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">None yet</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameEn}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Dialog>
  );
}
