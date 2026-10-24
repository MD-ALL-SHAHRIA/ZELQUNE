'use client';

import { Copy, Pencil, Plus, Ticket, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Badge, type Tone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Select } from '@/components/ui/field';
import { Kpi } from '@/components/ui/kpi';
import { EmptyState, PageHeader } from '@/components/ui/page';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage, type Schemas } from '@/lib/api';
import { formatWhen, fromDhakaInput, toDhakaInput } from '@/lib/dates';
import { formatTaka } from '@/lib/format';

type Coupon = Schemas['CouponDto_Output'];
type Body = Schemas['UpsertCouponDto'];

const blank = (): Body => ({
  code: '',
  description: null,
  kind: 'PERCENT',
  value: 10,
  minSubtotalPaisa: 0,
  maxDiscountPaisa: null,
  startsAt: null,
  endsAt: null,
  maxUses: null,
  active: true,
});

function status(c: Coupon, now = Date.now()): { label: string; tone: Tone } {
  if (!c.active) return { label: 'Inactive', tone: 'neutral' };
  if (c.endsAt && new Date(c.endsAt).getTime() <= now) return { label: 'Expired', tone: 'neutral' };
  if (c.maxUses !== null && c.usedCount >= c.maxUses) return { label: 'Used up', tone: 'warning' };
  if (c.startsAt && new Date(c.startsAt).getTime() > now)
    return { label: 'Scheduled', tone: 'info' };
  return { label: 'Active', tone: 'success' };
}

const offLabel = (c: Pick<Coupon, 'kind' | 'value' | 'maxDiscountPaisa'>) =>
  c.kind === 'PERCENT'
    ? `${c.value}% off${c.maxDiscountPaisa ? ` (up to ${formatTaka(c.maxDiscountPaisa)})` : ''}`
    : `${formatTaka(c.value)} off`;

const taka = (paisa: number | null | undefined) => (paisa ? String(paisa / 100) : '');
const paisa = (v: string) => (v.trim() ? Math.round(Number(v) * 100) : null);

export default function CouponsPage() {
  const toast = useToast();
  const [items, setItems] = useState<Coupon[] | null>(null);
  const [editing, setEditing] = useState<{ id: string | null; body: Body } | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<Coupon | null>(null);

  const load = useCallback(() => {
    void api.GET('/v1/admin/coupons').then(({ data, error }) => {
      if (data) setItems(data.items);
      else toast('error', errorMessage(error));
    });
  }, [toast]);
  useEffect(load, [load]);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const { id, body } = editing;
    const res = id
      ? await api.PUT('/v1/admin/coupons/{id}', { params: { path: { id } }, body })
      : await api.POST('/v1/admin/coupons', { body });
    setSaving(false);
    if (!res.data) return toast('error', errorMessage((res as { error?: unknown }).error));
    toast('success', id ? 'Coupon updated' : `Coupon ${res.data.code} created`);
    setEditing(null);
    load();
  };

  const remove = async (c: Coupon) => {
    const { data, error } = await api.DELETE('/v1/admin/coupons/{id}', {
      params: { path: { id: c.id } },
    });
    setConfirm(null);
    if (!data) return toast('error', errorMessage(error));
    toast('success', data.deleted ? 'Coupon deleted' : 'Coupon was used, so it was switched off');
    load();
  };

  const live = (items ?? []).filter((c) => status(c).label === 'Active');
  const orders = (items ?? []).reduce((s, c) => s + c.ordersCount, 0);
  const given = (items ?? []).reduce((s, c) => s + c.discountGivenPaisa, 0);

  return (
    <>
      <PageHeader
        title="Coupons"
        description="Discount codes customers type at checkout. Shipping is never discounted."
        actions={
          <Button onClick={() => setEditing({ id: null, body: blank() })}>
            <Plus /> Create coupon
          </Button>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {items ? (
          <>
            <Kpi
              label="Active codes"
              value={String(live.length)}
              hint={`${items.length} in total`}
            />
            <Kpi label="Orders with a code" value={String(orders)} hint="Paid orders, all time" />
            <Kpi label="Discount given" value={formatTaka(given)} hint="All time" />
          </>
        ) : (
          Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[104px]" />)
        )}
      </div>
      <Card>
        {!items ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Ticket />} title="No coupons yet">
            Create a welcome code or one for a campaign, a festival or an influencer.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[50rem] text-sm">
              <thead className="bg-cream/60 text-left text-xs text-stone">
                <tr>
                  <th className="py-2.5 pl-5 font-medium">Code</th>
                  <th className="px-4 py-2.5 font-medium">Discount</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Used</th>
                  <th className="px-4 py-2.5 text-right font-medium">Given</th>
                  <th className="px-4 py-2.5 font-medium">Ends</th>
                  <th className="py-2.5 pr-5">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => {
                  const s = status(c);
                  return (
                    <tr key={c.id} className="border-t border-line hover:bg-ink/3">
                      <td className="py-2.5 pl-5">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md border border-dashed border-ink/25 bg-cream px-2 py-0.5 font-mono text-[0.8125rem] font-semibold tracking-wide text-ink">
                            {c.code}
                          </span>
                          <button
                            type="button"
                            aria-label={`Copy ${c.code}`}
                            onClick={() =>
                              void navigator.clipboard
                                .writeText(c.code)
                                .then(() => toast('success', `${c.code} copied`))
                            }
                            className="rounded p-1 text-stone hover:bg-ink/6 hover:text-ink"
                          >
                            <Copy className="size-3.5" />
                          </button>
                        </div>
                        {c.description ? (
                          <p className="mt-1 text-xs text-stone">{c.description}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5 text-ink/85">
                        {offLabel(c)}
                        {c.minSubtotalPaisa ? (
                          <span className="block text-xs text-stone">
                            Orders over {formatTaka(c.minSubtotalPaisa)}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone={s.tone}>{s.label}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular">
                        {c.usedCount}
                        {c.maxUses ? <span className="text-stone"> / {c.maxUses}</span> : null}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular">
                        {formatTaka(c.discountGivenPaisa)}
                      </td>
                      <td className="px-4 py-2.5 text-stone">
                        {c.endsAt ? formatWhen(c.endsAt) : 'No end'}
                      </td>
                      <td className="py-2.5 pr-5">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`Edit ${c.code}`}
                            onClick={() =>
                              setEditing({
                                id: c.id,
                                body: {
                                  code: c.code,
                                  description: c.description,
                                  kind: c.kind,
                                  value: c.value,
                                  minSubtotalPaisa: c.minSubtotalPaisa,
                                  maxDiscountPaisa: c.maxDiscountPaisa,
                                  startsAt: c.startsAt,
                                  endsAt: c.endsAt,
                                  maxUses: c.maxUses,
                                  active: c.active,
                                },
                              })
                            }
                          >
                            <Pencil />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`Delete ${c.code}`}
                            onClick={() => setConfirm(c)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing ? (
        <CouponDialog
          editing={editing}
          setEditing={setEditing}
          saving={saving}
          onSave={() => void save()}
        />
      ) : null}

      <Dialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={`Delete ${confirm?.code ?? 'coupon'}?`}
        description={
          confirm?.usedCount
            ? 'It has been used, so it will be switched off and kept for your reports.'
            : 'Nobody has used it yet, so it will be removed.'
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Keep it
            </Button>
            <Button variant="danger" onClick={() => confirm && void remove(confirm)}>
              {confirm?.usedCount ? 'Switch off' : 'Delete'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-stone">Customers will not be able to use this code any more.</p>
      </Dialog>
    </>
  );
}

function CouponDialog({
  editing,
  setEditing,
  saving,
  onSave,
}: {
  editing: { id: string | null; body: Body };
  setEditing: (e: { id: string | null; body: Body } | null) => void;
  saving: boolean;
  onSave: () => void;
}) {
  const { body } = editing;
  const set = (patch: Partial<Body>) => setEditing({ ...editing, body: { ...body, ...patch } });
  const codeOk = /^[A-Za-z0-9-]{3,24}$/.test(body.code.trim());
  const invalid =
    !codeOk ||
    body.value <= 0 ||
    (body.kind === 'PERCENT' && body.value > 90) ||
    Boolean(body.startsAt && body.endsAt && body.endsAt <= body.startsAt);

  return (
    <Dialog
      open
      onClose={() => setEditing(null)}
      title={editing.id ? `Edit ${body.code}` : 'Create a coupon'}
      footer={
        <>
          <Button variant="secondary" onClick={() => setEditing(null)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving || invalid}>
            {saving ? 'Saving…' : editing.id ? 'Save coupon' : 'Create coupon'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Field
            label="Code"
            hint="Letters, numbers and dashes. Customers can type it in any case."
            error={body.code && !codeOk ? '3 to 24 letters, numbers or dashes' : null}
          >
            <Input
              value={body.code}
              onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/\s/g, '') })}
              placeholder="WELCOME10"
              className="font-mono tracking-wide uppercase"
              autoFocus
            />
          </Field>
          <div className="sm:pt-6">
            <Button
              variant="secondary"
              onClick={() =>
                set({
                  code: `ZQ-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
                })
              }
            >
              Generate
            </Button>
          </div>
        </div>
        <Field label="Note for your team (optional)">
          <Input
            value={body.description ?? ''}
            onChange={(e) => set({ description: e.target.value || null })}
            placeholder="Instagram campaign, October"
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Discount">
            <Select
              value={body.kind}
              onChange={(e) => {
                const kind = e.target.value as Body['kind'];
                set({ kind, value: kind === 'PERCENT' ? 10 : 30_000 });
              }}
            >
              <option value="PERCENT">Percent off</option>
              <option value="FIXED">Taka off the order</option>
            </Select>
          </Field>
          <Field
            label={body.kind === 'PERCENT' ? 'Percent (1–90)' : 'Taka off'}
            error={body.kind === 'PERCENT' && body.value > 90 ? 'At most 90%' : null}
          >
            <Input
              type="number"
              min={1}
              value={body.kind === 'PERCENT' ? body.value : body.value / 100}
              onChange={(e) => {
                const n = Number(e.target.value) || 0;
                set({ value: body.kind === 'PERCENT' ? Math.round(n) : Math.round(n * 100) });
              }}
            />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Minimum order (৳, optional)">
            <Input
              type="number"
              min={0}
              value={taka(body.minSubtotalPaisa)}
              onChange={(e) => set({ minSubtotalPaisa: paisa(e.target.value) ?? 0 })}
            />
          </Field>
          {body.kind === 'PERCENT' ? (
            <Field label="Biggest discount (৳, optional)">
              <Input
                type="number"
                min={0}
                value={taka(body.maxDiscountPaisa)}
                onChange={(e) => set({ maxDiscountPaisa: paisa(e.target.value) })}
              />
            </Field>
          ) : (
            <Field label="Total uses (optional)">
              <Input
                type="number"
                min={1}
                value={body.maxUses ?? ''}
                onChange={(e) => set({ maxUses: e.target.value ? Number(e.target.value) : null })}
              />
            </Field>
          )}
        </div>
        {body.kind === 'PERCENT' ? (
          <Field label="Total uses (optional)" hint="Leave empty for no limit.">
            <Input
              type="number"
              min={1}
              value={body.maxUses ?? ''}
              onChange={(e) => set({ maxUses: e.target.value ? Number(e.target.value) : null })}
            />
          </Field>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Starts (optional)">
            <Input
              type="datetime-local"
              value={body.startsAt ? toDhakaInput(body.startsAt) : ''}
              onChange={(e) =>
                set({ startsAt: e.target.value ? fromDhakaInput(e.target.value) : null })
              }
            />
          </Field>
          <Field label="Ends (optional)">
            <Input
              type="datetime-local"
              value={body.endsAt ? toDhakaInput(body.endsAt) : ''}
              onChange={(e) =>
                set({ endsAt: e.target.value ? fromDhakaInput(e.target.value) : null })
              }
            />
          </Field>
        </div>
        <Switch
          checked={body.active ?? true}
          onChange={(active) => set({ active })}
          label="Active"
          description="Switch off to stop the code without deleting it."
        />
      </div>
    </Dialog>
  );
}
