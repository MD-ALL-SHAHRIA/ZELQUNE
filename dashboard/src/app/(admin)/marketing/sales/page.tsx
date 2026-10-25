'use client';

import { Pencil, Percent, Plus, Timer, Trash2, Zap } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, type Tone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Select } from '@/components/ui/field';
import { EmptyState, PageHeader } from '@/components/ui/page';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { LineTabs } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import { useAllProducts } from '@/features/content/use-products';
import { api, errorMessage, type Schemas } from '@/lib/api';
import { cn } from '@/lib/cn';
import { countdown, formatWhen, fromDhakaInput, toDhakaInput } from '@/lib/dates';

type Promotion = Schemas['PromotionDto_Output'];
type Body = Schemas['UpsertPromotionDto'];
type State = Promotion['state'];
type Tab = 'ALL' | State;

const STATE: Record<State, { label: string; tone: Tone }> = {
  LIVE: { label: 'Live', tone: 'success' },
  SCHEDULED: { label: 'Scheduled', tone: 'info' },
  PAUSED: { label: 'Paused', tone: 'warning' },
  ENDED: { label: 'Ended', tone: 'neutral' },
};

const blank = (): Body => {
  const start = new Date(Date.now() + 5 * 60_000);
  const end = new Date(start.getTime() + 3 * 86_400_000);
  return {
    nameEn: '',
    nameBn: '',
    kind: 'PERCENT',
    value: 15,
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    flash: true,
    active: true,
    productIds: [],
  };
};

const offLabel = (p: Pick<Promotion, 'kind' | 'value'>) =>
  p.kind === 'PERCENT' ? `${p.value}% off` : `৳${(p.value / 100).toLocaleString('en-IN')} off`;

export default function SalesPage() {
  const toast = useToast();
  const products = useAllProducts();
  const [items, setItems] = useState<Promotion[] | null>(null);
  const [tab, setTab] = useState<Tab>('ALL');
  const [editing, setEditing] = useState<{ id: string | null; body: Body } | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<Promotion | null>(null);

  const load = useCallback(() => {
    void api.GET('/v1/admin/promotions').then(({ data, error }) => {
      if (data) setItems(data.items);
      else toast('error', errorMessage(error));
    });
  }, [toast]);
  useEffect(load, [load]);

  const names = useMemo(() => new Map((products ?? []).map((p) => [p.id, p.nameEn])), [products]);
  const counts = useMemo(() => {
    const c: Record<Tab, number> = { ALL: 0, LIVE: 0, SCHEDULED: 0, PAUSED: 0, ENDED: 0 };
    for (const p of items ?? []) {
      c.ALL += 1;
      c[p.state] += 1;
    }
    return c;
  }, [items]);
  const shown = (items ?? []).filter((p) => tab === 'ALL' || p.state === tab);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const { id, body } = editing;
    const res = id
      ? await api.PUT('/v1/admin/promotions/{id}', { params: { path: { id } }, body })
      : await api.POST('/v1/admin/promotions', { body });
    setSaving(false);
    if (!res.data) return toast('error', errorMessage((res as { error?: unknown }).error));
    toast('success', id ? 'Sale updated' : 'Sale created. Prices change when it starts.');
    setEditing(null);
    load();
  };

  const remove = async (p: Promotion) => {
    const { error } = await api.DELETE('/v1/admin/promotions/{id}', {
      params: { path: { id: p.id } },
    });
    setConfirm(null);
    if (error) return toast('error', errorMessage(error));
    toast('success', 'Sale deleted');
    load();
  };

  const toggle = async (p: Promotion) => {
    const { error } = await api.PUT('/v1/admin/promotions/{id}', {
      params: { path: { id: p.id } },
      body: {
        nameEn: p.nameEn,
        nameBn: p.nameBn,
        kind: p.kind,
        value: p.value,
        startsAt: p.startsAt,
        endsAt: p.endsAt,
        flash: p.flash,
        active: !p.active,
        productIds: p.productIds,
      },
    });
    if (error) return toast('error', errorMessage(error));
    toast('success', p.active ? 'Sale paused' : 'Sale resumed');
    load();
  };

  return (
    <>
      <PageHeader
        title="Sales and flash sales"
        description="Lower prices for a set time. The storefront shows the old price struck through, and checkout charges the sale price."
        actions={
          <Button onClick={() => setEditing({ id: null, body: blank() })}>
            <Plus /> Create sale
          </Button>
        }
      />
      <Card>
        <div className="px-3 pt-1">
          <LineTabs
            label="Sale status"
            value={tab}
            onChange={setTab}
            items={(['ALL', 'LIVE', 'SCHEDULED', 'PAUSED', 'ENDED'] as Tab[]).map((s) => ({
              value: s,
              label: s === 'ALL' ? 'All' : STATE[s].label,
              count: items ? counts[s] : undefined,
            }))}
          />
        </div>
        {!items ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <EmptyState icon={<Zap />} title="No sales here">
            Create a flash sale for a festival, a launch or a slow week.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <span
                  className={cn(
                    'grid size-10 shrink-0 place-items-center rounded-xl',
                    p.state === 'LIVE' ? 'bg-success/12 text-success' : 'bg-ink/6 text-stone',
                  )}
                >
                  {p.flash ? <Zap className="size-5" /> : <Percent className="size-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-ink">{p.nameEn}</p>
                    <Badge tone={STATE[p.state].tone}>{STATE[p.state].label}</Badge>
                    <Badge tone="accent">{offLabel(p)}</Badge>
                  </div>
                  <p className="mt-0.5 text-[0.8125rem] text-stone">
                    {formatWhen(p.startsAt)} → {formatWhen(p.endsAt)} ·{' '}
                    {p.productIds.length
                      ? p.productIds
                          .slice(0, 3)
                          .map((id) => names.get(id) ?? 'Product')
                          .join(', ') +
                        (p.productIds.length > 3 ? ` +${p.productIds.length - 3} more` : '')
                      : 'Every product'}
                  </p>
                </div>
                {p.state === 'LIVE' || p.state === 'SCHEDULED' ? (
                  <span className="inline-flex items-center gap-1.5 text-[0.8125rem] text-ink tabular">
                    <Timer className="size-4 text-stone" aria-hidden />
                    {p.state === 'LIVE'
                      ? `${countdown(p.endsAt)} left`
                      : `starts in ${countdown(p.startsAt)}`}
                  </span>
                ) : null}
                <div className="flex gap-1">
                  {p.state !== 'ENDED' ? (
                    <Button size="sm" variant="secondary" onClick={() => void toggle(p)}>
                      {p.active ? 'Pause' : 'Resume'}
                    </Button>
                  ) : null}
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Edit ${p.nameEn}`}
                    onClick={() =>
                      setEditing({
                        id: p.id,
                        body: {
                          nameEn: p.nameEn,
                          nameBn: p.nameBn,
                          kind: p.kind,
                          value: p.value,
                          startsAt: p.startsAt,
                          endsAt: p.endsAt,
                          flash: p.flash,
                          active: p.active,
                          productIds: p.productIds,
                        },
                      })
                    }
                  >
                    <Pencil />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Delete ${p.nameEn}`}
                    onClick={() => setConfirm(p)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {editing ? (
        <SaleDialog
          editing={editing}
          setEditing={setEditing}
          products={products}
          saving={saving}
          onSave={() => void save()}
        />
      ) : null}

      <Dialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title="Delete this sale?"
        description={confirm ? `"${confirm.nameEn}" will stop at once and prices go back.` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Keep it
            </Button>
            <Button variant="danger" onClick={() => confirm && void remove(confirm)}>
              Delete sale
            </Button>
          </>
        }
      >
        <p className="text-sm text-stone">
          Orders already placed keep the price they were sold at.
        </p>
      </Dialog>
    </>
  );
}

function SaleDialog({
  editing,
  setEditing,
  products,
  saving,
  onSave,
}: {
  editing: { id: string | null; body: Body };
  setEditing: (e: { id: string | null; body: Body } | null) => void;
  products: ReturnType<typeof useAllProducts>;
  saving: boolean;
  onSave: () => void;
}) {
  const { body } = editing;
  const set = (patch: Partial<Body>) => setEditing({ ...editing, body: { ...body, ...patch } });
  const [filter, setFilter] = useState('');
  const everything = (body.productIds ?? []).length === 0;
  const chosen = new Set(body.productIds ?? []);
  const list = (products ?? []).filter(
    (p) => p.status !== 'ARCHIVED' && p.nameEn.toLowerCase().includes(filter.toLowerCase()),
  );
  const invalid =
    body.nameEn.trim().length < 2 ||
    !body.nameBn.trim() ||
    body.value <= 0 ||
    (body.kind === 'PERCENT' && body.value > 90) ||
    body.endsAt <= body.startsAt;

  return (
    <Dialog
      open
      onClose={() => setEditing(null)}
      title={editing.id ? 'Edit sale' : 'Create a sale'}
      description="Times are Bangladesh time."
      footer={
        <>
          <Button variant="secondary" onClick={() => setEditing(null)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving || invalid}>
            {saving ? 'Saving…' : editing.id ? 'Save sale' : 'Create sale'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name (English)">
            <Input
              value={body.nameEn}
              onChange={(e) => set({ nameEn: e.target.value })}
              placeholder="Eid flash sale"
              autoFocus
            />
          </Field>
          <Field label="Name (বাংলা)">
            <Input
              value={body.nameBn}
              onChange={(e) => set({ nameBn: e.target.value })}
              placeholder="ঈদ ফ্ল্যাশ সেল"
              lang="bn"
            />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Discount">
            <Select
              value={body.kind}
              onChange={(e) => {
                const kind = e.target.value as Body['kind'];
                set({ kind, value: kind === 'PERCENT' ? 15 : 50_000 });
              }}
            >
              <option value="PERCENT">Percent off</option>
              <option value="FIXED">Taka off each piece</option>
            </Select>
          </Field>
          <Field
            label={body.kind === 'PERCENT' ? 'Percent (1–90)' : 'Taka off'}
            error={body.kind === 'PERCENT' && body.value > 90 ? 'At most 90%' : null}
          >
            <Input
              type="number"
              min={1}
              max={body.kind === 'PERCENT' ? 90 : undefined}
              value={body.kind === 'PERCENT' ? body.value : body.value / 100}
              onChange={(e) => {
                const n = Number(e.target.value) || 0;
                set({ value: body.kind === 'PERCENT' ? Math.round(n) : Math.round(n * 100) });
              }}
            />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Starts">
            <Input
              type="datetime-local"
              value={toDhakaInput(body.startsAt)}
              onChange={(e) => e.target.value && set({ startsAt: fromDhakaInput(e.target.value) })}
            />
          </Field>
          <Field
            label="Ends"
            error={body.endsAt <= body.startsAt ? 'Must be after the start' : null}
          >
            <Input
              type="datetime-local"
              value={toDhakaInput(body.endsAt)}
              onChange={(e) => e.target.value && set({ endsAt: fromDhakaInput(e.target.value) })}
            />
          </Field>
        </div>
        <Switch
          checked={body.flash ?? true}
          onChange={(flash) => set({ flash })}
          label="Flash sale"
          description="Shows a Flash sale badge and a real countdown to the end time."
        />
        <div>
          <p className="mb-1.5 text-[0.8125rem] font-medium text-ink">Products</p>
          <Switch
            checked={everything}
            onChange={(all) =>
              set({ productIds: all ? [] : (products ?? []).slice(0, 1).map((p) => p.id) })
            }
            label="Every product"
          />
          {!everything ? (
            <div className="mt-3 rounded-lg border border-line">
              <div className="border-b border-line p-2">
                <Input
                  placeholder="Filter products"
                  aria-label="Filter products"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </div>
              <ul className="max-h-52 overflow-y-auto p-1">
                {list.map((p) => (
                  <li key={p.id}>
                    <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-ink/4">
                      <input
                        type="checkbox"
                        className="size-4 accent-[var(--color-ink)]"
                        checked={chosen.has(p.id)}
                        onChange={(e) => {
                          const next = new Set(chosen);
                          if (e.target.checked) next.add(p.id);
                          else next.delete(p.id);
                          set({ productIds: [...next] });
                        }}
                      />
                      <span className="flex-1 truncate">{p.nameEn}</span>
                      {p.status === 'DRAFT' ? <Badge tone="warning">Draft</Badge> : null}
                    </label>
                  </li>
                ))}
              </ul>
              <p className="border-t border-line px-3 py-2 text-xs text-stone">
                {chosen.size} selected
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </Dialog>
  );
}
