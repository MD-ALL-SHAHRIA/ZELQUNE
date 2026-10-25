'use client';

import { Check, MessageCircle, Phone, Send, X } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClass } from '@/components/ui/button';
import { Card, CardBody, CardHeader, Facts } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { BUDGET, QUOTE_KIND, QUOTE_STATUS, SPACE, type Quote } from '@/features/quotes/quotes';
import { api, errorMessage, type Schemas } from '@/lib/api';
import { formatWhen } from '@/lib/dates';
import { formatTaka, humanize } from '@/lib/format';

type Product = Schemas['AdminProductDto_Output'];
type District = Schemas['DistrictListDto_Output']['items'][number];
type Method = 'COD' | 'BKASH_MANUAL' | 'NAGAD_MANUAL';
interface VariantOption {
  id: string;
  label: string;
  retail: number | null;
}

const taka = (paisa: number) => (paisa ? String(paisa / 100) : '');
const toPaisa = (v: string) => Math.max(0, Math.round((Number(v) || 0) * 100));

/** Every variant across products, for matching a requested line to a SKU. */
function useVariants() {
  const [options, setOptions] = useState<VariantOption[] | null>(null);
  useEffect(() => {
    void api
      .GET('/v1/admin/products', { params: { query: { limit: 100 } } })
      .then(async ({ data }) => {
        const details = await Promise.all(
          (data?.items ?? []).map((p) =>
            api
              .GET('/v1/admin/products/{id}', { params: { path: { id: p.id } } })
              .then((r) => r.data),
          ),
        );
        setOptions(
          details
            .filter((p): p is Product => Boolean(p))
            .flatMap((p) =>
              p.variants.map((v) => ({
                id: v.id,
                label: `${p.nameEn} · ${Object.values(v.options).map(humanize).join(' · ') || v.sku} (${v.sku})`,
                retail: v.basePrice?.amountPaisa ?? null,
              })),
            ),
        );
      });
  }, []);
  return options;
}

export default function QuotePage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [decline, setDecline] = useState<string | null>(null);
  const [convert, setConvert] = useState(false);

  const load = useCallback(() => {
    void api.GET('/v1/admin/quotes/{id}', { params: { path: { id } } }).then(({ data, error }) => {
      if (data) setQuote(data);
      else toast('error', errorMessage(error));
    });
  }, [id, toast]);
  useEffect(load, [load]);

  const act = async (action: 'accept' | 'reject', reason?: string | null) => {
    setBusy(true);
    const res =
      action === 'accept'
        ? await api.POST('/v1/admin/quotes/{id}/accept', { params: { path: { id } } })
        : await api.POST('/v1/admin/quotes/{id}/reject', {
            params: { path: { id } },
            body: { reason: reason ?? null },
          });
    setBusy(false);
    setDecline(null);
    if (!res.data) return toast('error', errorMessage((res as { error?: unknown }).error));
    toast('success', action === 'accept' ? 'Marked as accepted' : 'Request declined');
    setQuote(res.data);
  };

  if (!quote)
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72" />
      </div>
    );

  const lead = quote.kind !== 'PRODUCT';
  const s = QUOTE_STATUS[quote.status];
  const phone = quote.phone.replace(/^\+880/, '0');

  return (
    <>
      <PageHeader
        crumbs={[{ href: '/quotes', label: 'Quotes' }]}
        title={<span className="font-mono">{quote.code}</span>}
        meta={
          <>
            <Badge tone={s.tone}>{s.label}</Badge>
            <Badge tone="accent">{QUOTE_KIND[quote.kind]}</Badge>
          </>
        }
        description={`Received ${formatWhen(quote.createdAt)}`}
        actions={
          <>
            {quote.status === 'QUOTED' ? (
              <Button variant="secondary" disabled={busy} onClick={() => void act('accept')}>
                <Check /> Customer accepted
              </Button>
            ) : null}
            {quote.status === 'ACCEPTED' && !quote.orderCode && !lead ? (
              <Button onClick={() => setConvert(true)}>Create the order</Button>
            ) : null}
            {quote.orderCode && quote.orderId ? (
              <Link href={`/orders/${quote.orderId}`} className={buttonClass('primary')}>
                Order {quote.orderCode}
              </Link>
            ) : null}
            {['NEW', 'QUOTED', 'ACCEPTED'].includes(quote.status) && !quote.orderCode ? (
              <Button variant="danger" disabled={busy} onClick={() => setDecline('')}>
                <X /> Decline
              </Button>
            ) : null}
          </>
        }
      />
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          {lead && quote.design ? (
            <Card>
              <CardHeader
                title={quote.kind === 'DESIGN' ? 'Design brief' : 'Building brief'}
                description="Call the client to plan a site visit. These requests are not priced here."
              />
              <CardBody>
                <Facts
                  items={[
                    ['Space', SPACE[quote.design.spaceType] ?? quote.design.spaceType],
                    [
                      'Size',
                      quote.design.sizeSqft
                        ? `${quote.design.sizeSqft.toLocaleString('en-IN')} sq ft`
                        : '—',
                    ],
                    ...(quote.design.floors
                      ? [['Floors', String(quote.design.floors)] as [string, string]]
                      : []),
                    ['District', quote.design.district ? humanize(quote.design.district) : '—'],
                    ['Budget', BUDGET[quote.design.budget] ?? quote.design.budget],
                    ['Needed by', quote.neededBy ?? '—'],
                  ]}
                />
              </CardBody>
            </Card>
          ) : (
            <Pricing quote={quote} onSaved={setQuote} />
          )}
          {quote.customizationNotes || quote.notes ? (
            <Card>
              <CardHeader title="What they wrote" />
              <CardBody className="space-y-3 text-sm leading-relaxed whitespace-pre-line text-ink/90">
                {quote.customizationNotes ? (
                  <div>
                    <p className="mb-1 text-xs font-medium text-stone">Custom work</p>
                    {quote.customizationNotes}
                  </div>
                ) : null}
                {quote.notes ? (
                  <div>
                    <p className="mb-1 text-xs font-medium text-stone">Notes</p>
                    {quote.notes}
                  </div>
                ) : null}
              </CardBody>
            </Card>
          ) : null}
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Contact" />
            <CardBody>
              <p className="font-medium text-ink">{quote.contactName}</p>
              {quote.organizationName ? (
                <p className="text-sm text-stone">{quote.organizationName}</p>
              ) : null}
              <p className="mt-2 text-sm text-ink tabular">{phone}</p>
              {quote.email ? <p className="text-sm text-stone">{quote.email}</p> : null}
              <div className="mt-3 flex gap-2">
                <a href={`tel:${quote.phone}`} className={buttonClass('secondary', 'sm')}>
                  <Phone /> Call
                </a>
                <a
                  href={`https://wa.me/${quote.phone.replace('+', '')}?text=${encodeURIComponent(`Hello ${quote.contactName}, this is Zelqune about your request ${quote.code}.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonClass('secondary', 'sm')}
                >
                  <MessageCircle /> WhatsApp
                </a>
              </div>
            </CardBody>
          </Card>
          {quote.totals ? (
            <Card>
              <CardHeader
                title="Quote"
                description={
                  quote.validUntil ? `Valid until ${formatWhen(quote.validUntil)}` : undefined
                }
              />
              <CardBody>
                <Facts
                  items={[
                    ['Items', formatTaka(quote.totals.subtotalPaisa)],
                    ['Delivery', formatTaka(quote.totals.shippingFeePaisa)],
                    [
                      <span key="t" className="font-medium text-ink">
                        Total
                      </span>,
                      <span key="v" className="font-semibold">
                        {formatTaka(quote.totals.totalPaisa)}
                      </span>,
                    ],
                    ['Advance', formatTaka(quote.totals.advanceRequiredPaisa)],
                  ]}
                />
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>

      <Dialog
        open={decline !== null}
        onClose={() => setDecline(null)}
        title="Decline this request?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDecline(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => void act('reject', decline?.trim() || null)}
            >
              Decline
            </Button>
          </>
        }
      >
        <Field label="Reason (optional, for your records)">
          <Textarea
            value={decline ?? ''}
            maxLength={300}
            onChange={(e) => setDecline(e.target.value)}
          />
        </Field>
      </Dialog>

      {convert ? (
        <ConvertDialog quote={quote} onClose={() => setConvert(false)} onDone={load} />
      ) : null}
    </>
  );
}

function Pricing({ quote, onSaved }: { quote: Quote; onSaved: (q: Quote) => void }) {
  const toast = useToast();
  const variants = useVariants();
  const editable = quote.status === 'NEW' || quote.status === 'QUOTED';
  const [lines, setLines] = useState(() =>
    quote.lines.map((l) => ({
      lineId: l.id,
      variantId: l.variantId ?? '',
      unit: l.unitPricePaisa ?? 0,
    })),
  );
  const [shipping, setShipping] = useState(quote.totals?.shippingFeePaisa ?? 0);
  const [advance, setAdvance] = useState(quote.totals?.advanceRequiredPaisa ?? 0);
  const [saving, setSaving] = useState(false);
  const retail = useMemo(() => new Map((variants ?? []).map((v) => [v.id, v.retail])), [variants]);

  const subtotal = lines.reduce((s, l, i) => s + l.unit * (quote.lines[i]?.qty ?? 0), 0);
  const ready = lines.every((l) => l.variantId && l.unit > 0);

  const send = async () => {
    setSaving(true);
    const { data, error } = await api.PUT('/v1/admin/quotes/{id}/pricing', {
      params: { path: { id: quote.id } },
      body: {
        lines: lines.map((l) => ({
          lineId: l.lineId,
          variantId: l.variantId,
          unitPricePaisa: l.unit,
        })),
        shippingFeePaisa: shipping,
        advanceRequiredPaisa: advance,
      },
    });
    setSaving(false);
    if (!data) return toast('error', errorMessage(error));
    toast('success', 'Quote priced. Share the total with the customer.');
    onSaved(data);
  };

  return (
    <Card>
      <CardHeader
        title="Items and pricing"
        description={
          editable ? 'Match each line to a finish and set the B2B unit price.' : undefined
        }
      />
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="bg-cream/60 text-left text-xs text-stone">
            <tr>
              <th className="py-2 pl-5 font-medium">Requested</th>
              <th className="px-3 py-2 font-medium">Finish (SKU)</th>
              <th className="px-3 py-2 text-right font-medium">Qty</th>
              <th className="px-3 py-2 text-right font-medium">Unit price (৳)</th>
              <th className="py-2 pr-5 text-right font-medium">Line</th>
            </tr>
          </thead>
          <tbody>
            {quote.lines.map((l, i) => {
              const row = lines[i]!;
              const r = row.variantId ? retail.get(row.variantId) : null;
              return (
                <tr key={l.id} className="border-t border-line align-top">
                  <td className="py-2.5 pl-5 text-ink">{l.description}</td>
                  <td className="px-3 py-2">
                    {editable ? (
                      <Select
                        aria-label={`Finish for ${l.description}`}
                        value={row.variantId}
                        onChange={(e) => {
                          const v = e.target.value;
                          setLines(
                            lines.map((x, j) =>
                              j === i
                                ? { ...x, variantId: v, unit: x.unit || retail.get(v) || 0 }
                                : x,
                            ),
                          );
                        }}
                        className="w-64"
                      >
                        <option value="">{variants ? 'Choose a finish' : 'Loading…'}</option>
                        {(variants ?? []).map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.label}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <span className="font-mono text-xs">{l.sku ?? '—'}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular">
                    {l.qty.toLocaleString('en-IN')}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {editable ? (
                      <>
                        <Input
                          type="number"
                          min={0}
                          aria-label={`Unit price for ${l.description}`}
                          value={taka(row.unit)}
                          onChange={(e) =>
                            setLines(
                              lines.map((x, j) =>
                                j === i ? { ...x, unit: toPaisa(e.target.value) } : x,
                              ),
                            )
                          }
                          className="ml-auto w-28 text-right"
                        />
                        {r ? (
                          <span className="mt-1 block text-xs text-stone">
                            Retail {formatTaka(r)}
                            {row.unit && row.unit < r
                              ? ` · ${Math.round((1 - row.unit / r) * 100)}% off`
                              : ''}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <span className="tabular">
                        {l.unitPricePaisa ? formatTaka(l.unitPricePaisa) : '—'}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-5 text-right font-medium tabular">
                    {formatTaka(row.unit * l.qty)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editable ? (
        <div className="flex flex-wrap items-end justify-between gap-4 border-t border-line px-5 py-4">
          <div className="flex flex-wrap gap-3">
            <Field label="Delivery (৳)">
              <Input
                type="number"
                min={0}
                value={taka(shipping)}
                onChange={(e) => setShipping(toPaisa(e.target.value))}
                className="w-32"
              />
            </Field>
            <Field label="Advance to start (৳)">
              <Input
                type="number"
                min={0}
                value={taka(advance)}
                onChange={(e) => setAdvance(toPaisa(e.target.value))}
                className="w-36"
              />
            </Field>
          </div>
          <div className="text-right">
            <p className="text-sm text-stone">
              Total{' '}
              <span className="ml-1 text-lg font-semibold text-ink tabular">
                {formatTaka(subtotal + shipping)}
              </span>
            </p>
            <Button className="mt-2" disabled={!ready || saving} onClick={() => void send()}>
              <Send />{' '}
              {saving ? 'Saving…' : quote.status === 'QUOTED' ? 'Update quote' : 'Save quote'}
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function ConvertDialog({
  quote,
  onClose,
  onDone,
}: {
  quote: Quote;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [districts, setDistricts] = useState<District[]>([]);
  const [district, setDistrict] = useState(quote.design?.district ?? 'dhaka');
  const [area, setArea] = useState('');
  const [line, setLine] = useState('');
  const [method, setMethod] = useState<Method>('BKASH_MANUAL');
  const [trxId, setTrxId] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void api.GET('/v1/shipping/districts').then(({ data }) => setDistricts(data?.items ?? []));
  }, []);

  const submit = async () => {
    setBusy(true);
    const { data, error } = await api.POST('/v1/admin/quotes/{id}/convert', {
      params: { path: { id: quote.id } },
      body: {
        address: { district, area: area.trim(), line: line.trim(), note: null },
        paymentMethod: method,
        trxId: method === 'COD' ? null : trxId.trim() || null,
        payerPhone: null,
      },
    });
    setBusy(false);
    if (!data) return toast('error', errorMessage(error));
    toast('success', `Order ${data.orderCode} created`);
    onClose();
    onDone();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Create the B2B order"
      description="At the quoted prices. Advance 0 or cash on delivery needs the owner."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={
              busy ||
              area.trim().length < 2 ||
              line.trim().length < 5 ||
              (method !== 'COD' && !trxId.trim())
            }
            onClick={() => void submit()}
          >
            {busy ? 'Creating…' : 'Create order'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="District">
            <Select value={district} onChange={(e) => setDistrict(e.target.value)}>
              {districts.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.nameEn}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Area">
            <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Gulshan 2" />
          </Field>
        </div>
        <Field label="Address">
          <Input
            value={line}
            onChange={(e) => setLine(e.target.value)}
            placeholder="House, road, floor"
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Advance paid by">
            <Select value={method} onChange={(e) => setMethod(e.target.value as Method)}>
              <option value="BKASH_MANUAL">bKash</option>
              <option value="NAGAD_MANUAL">Nagad</option>
              <option value="COD">Cash on delivery</option>
            </Select>
          </Field>
          {method !== 'COD' ? (
            <Field label="Transaction ID">
              <Input value={trxId} onChange={(e) => setTrxId(e.target.value.toUpperCase())} />
            </Field>
          ) : null}
        </div>
      </div>
    </Dialog>
  );
}
