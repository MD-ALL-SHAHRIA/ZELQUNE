'use client';

import { CircleDot, MessageSquare, Phone, Truck } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, Facts } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Textarea } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage, type Schemas } from '@/lib/api';
import { formatDateTime, formatTaka, humanize, timeAgo } from '@/lib/format';
import { NEXT_STATUS, type OrderStatus, STATUS_LABEL, statusTone } from '@/lib/orders';

type Order = Schemas['AdminOrderDetailDto_Output'];
type Payment = NonNullable<Order['payment']>;

const PAYMENT_TONE: Record<Payment['status'], 'warning' | 'success' | 'danger' | 'neutral'> = {
  SUBMITTED: 'warning',
  COD_PENDING: 'warning',
  VERIFIED: 'success',
  COD_CONFIRMED: 'success',
  COLLECTED: 'success',
  REJECTED: 'danger',
  VOID: 'neutral',
};
const PAYMENT_LABEL: Record<Payment['status'], string> = {
  SUBMITTED: 'Waiting for check',
  COD_PENDING: 'Cash on delivery: to confirm',
  VERIFIED: 'Advance verified',
  COD_CONFIRMED: 'Cash on delivery confirmed',
  COLLECTED: 'Paid in full',
  REJECTED: 'Rejected',
  VOID: 'Void',
};
const MOVE_LABEL: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: 'Confirm order',
  IN_PRODUCTION: 'Start production',
  READY_TO_SHIP: 'Mark ready to ship',
  SHIPPED: 'Mark shipped',
  DELIVERED: 'Mark delivered',
  RETURN_REQUESTED: 'Log a return request',
  RETURNED: 'Mark returned',
  REFUNDED: 'Mark refunded',
  CANCELLED: 'Cancel order',
};

type Modal = null | 'verify' | 'reject' | { move: OrderStatus };

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await api.GET('/v1/admin/orders/{id}', { params: { path: { id } } });
    if (data) setOrder(data);
    else toast('error', errorMessage(error));
  }, [id, toast]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() awaits the API before setting state
    void load();
  }, [load]);

  const run = async (action: () => Promise<{ error?: unknown }>, done: string) => {
    setBusy(true);
    const { error } = await action();
    setBusy(false);
    if (error) return (toast('error', errorMessage(error)), false);
    toast('success', done);
    setModal(null);
    setReason('');
    await load();
    return true;
  };

  if (!order) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const payment = order.payment;
  const moves = NEXT_STATUS[order.status];
  const primary = moves.find((m) => m !== 'CANCELLED' && m !== 'RETURNED');
  const others = moves.filter((m) => m !== primary);
  const paymentPending = payment?.status === 'SUBMITTED';
  const timeline = [
    ...order.history.map((h) => ({ at: h.at, kind: 'status' as const, h })),
    ...order.notes.map((n) => ({ at: n.at, kind: 'note' as const, n })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const move = typeof modal === 'object' && modal ? modal.move : null;

  return (
    <>
      <PageHeader
        crumbs={[{ href: '/orders', label: 'Orders' }]}
        title={order.code}
        meta={
          <>
            <Badge tone={statusTone(order.status)}>{STATUS_LABEL[order.status]}</Badge>
            {payment ? (
              <Badge tone={PAYMENT_TONE[payment.status]}>{PAYMENT_LABEL[payment.status]}</Badge>
            ) : null}
          </>
        }
        description={`Placed ${timeAgo(order.placedAt)} · ${formatDateTime(order.placedAt)} · ${humanize(order.saleMode)} · ${order.channel}`}
        actions={
          <>
            {others.map((m) => (
              <Button
                key={m}
                variant={m === 'CANCELLED' ? 'danger' : 'secondary'}
                onClick={() => setModal({ move: m })}
                disabled={busy}
              >
                {MOVE_LABEL[m] ?? STATUS_LABEL[m]}
              </Button>
            ))}
            {primary ? (
              <Button
                onClick={() =>
                  primary === 'CONFIRMED' && paymentPending
                    ? setModal('verify')
                    : void run(
                        () =>
                          api.POST('/v1/admin/orders/{id}/transitions', {
                            params: { path: { id } },
                            body: { to: primary },
                          }),
                        `${MOVE_LABEL[primary] ?? STATUS_LABEL[primary]}: done.`,
                      )
                }
                disabled={busy}
              >
                {primary === 'CONFIRMED' && paymentPending
                  ? 'Verify payment'
                  : (MOVE_LABEL[primary] ?? STATUS_LABEL[primary])}
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Items"
              description={`${order.items.reduce((a, i) => a + i.qty, 0)} pieces`}
            />
            <ul className="divide-y divide-line border-t border-line">
              {order.items.map((i) => (
                <li key={i.sku} className="flex items-center gap-4 px-5 py-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-sand text-xs font-semibold text-stone">
                    {i.nameEn.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{i.nameEn}</p>
                    <p className="text-xs text-stone">
                      {Object.values(i.options)
                        .filter((v) => typeof v === 'string')
                        .map((v) => humanize(String(v)))
                        .join(' · ') || i.sku}
                    </p>
                  </div>
                  <span className="text-sm text-stone tabular">
                    {formatTaka(i.unitPricePaisa)} × {i.qty}
                  </span>
                  <span className="w-24 text-right font-medium tabular">
                    {formatTaka(i.lineTotalPaisa)}
                  </span>
                </li>
              ))}
            </ul>
            <CardBody className="border-t border-line pt-4">
              <Facts
                items={[
                  ['Subtotal', formatTaka(order.totals.subtotalPaisa)],
                  ...(order.totals.discountPaisa
                    ? ([['Discount', `−${formatTaka(order.totals.discountPaisa)}`]] as [
                        string,
                        string,
                      ][])
                    : []),
                  ['Delivery', formatTaka(order.totals.shippingFeePaisa)],
                  [
                    <span key="t" className="font-semibold text-ink">
                      Total
                    </span>,
                    <span key="v" className="font-semibold">
                      {formatTaka(order.totals.totalPaisa)}
                    </span>,
                  ],
                  ['Advance required', formatTaka(order.totals.advanceRequiredPaisa)],
                ]}
              />
            </CardBody>
          </Card>

          {payment ? (
            <Card>
              <CardHeader
                title="Payment"
                description={`${payment.method === 'COD' ? 'Cash on delivery' : humanize(payment.method.replace('_MANUAL', ''))} · ${humanize(payment.kind)}`}
                action={
                  <Badge tone={PAYMENT_TONE[payment.status]}>{PAYMENT_LABEL[payment.status]}</Badge>
                }
              />
              <CardBody>
                <Facts
                  items={[
                    ['Amount', formatTaka(payment.amountPaisa)],
                    ...(payment.trxIdLast4
                      ? ([['Transaction ID', `•••• ${payment.trxIdLast4}`]] as [string, string][])
                      : []),
                  ]}
                />
                {paymentPending ? (
                  <div className="mt-4 flex flex-wrap gap-2 rounded-lg bg-warning/8 p-3 ring-1 ring-warning/20">
                    <p className="w-full text-[0.8125rem] text-ink/85">
                      Check the transaction in the bKash/Nagad app, then verify or reject it.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => {
                        setAmount(String(Math.round(payment.amountPaisa / 100)));
                        setModal('verify');
                      }}
                    >
                      Verify payment
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setModal('reject')}>
                      Reject
                    </Button>
                  </div>
                ) : null}
                {payment.status === 'COD_PENDING' ? (
                  <Button
                    className="mt-4"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      void run(
                        () =>
                          api.POST('/v1/admin/payments/{id}/confirm-cod', {
                            params: { path: { id: payment.id } },
                          }),
                        'Cash on delivery confirmed.',
                      )
                    }
                  >
                    Confirm cash on delivery
                  </Button>
                ) : null}
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Timeline" />
            <CardBody>
              <form
                className="mb-5 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const text = note.trim();
                  if (!text) return;
                  void run(
                    () =>
                      api.POST('/v1/admin/orders/{id}/notes', {
                        params: { path: { id } },
                        body: { text },
                      }),
                    'Note added.',
                  ).then((ok) => ok && setNote(''));
                }}
              >
                <Input
                  aria-label="Add a note"
                  placeholder="Add a note for the team…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <Button type="submit" variant="secondary" disabled={busy || !note.trim()}>
                  Post
                </Button>
              </form>
              <ol className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[0.6875rem] before:w-px before:bg-line">
                {timeline.map((t, i) => (
                  <li key={i} className="relative flex gap-3">
                    <span className="relative z-10 grid size-6 shrink-0 place-items-center rounded-full border border-line bg-surface text-stone">
                      {t.kind === 'note' ? (
                        <MessageSquare className="size-3" />
                      ) : (
                        <CircleDot className="size-3" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5 text-sm">
                      {t.kind === 'status' ? (
                        <p>
                          {t.h.from ? 'Moved to ' : 'Order placed as '}
                          <span className="font-medium">{STATUS_LABEL[t.h.to]}</span>
                          {t.h.reason ? <span className="text-stone"> · {t.h.reason}</span> : null}
                        </p>
                      ) : (
                        <p className="rounded-lg bg-cream px-3 py-2 text-ink">{t.n.text}</p>
                      )}
                      <p className="mt-0.5 text-xs text-stone">
                        {t.kind === 'note'
                          ? `${t.n.author} · `
                          : t.h.actor
                            ? `${t.h.actor} · `
                            : ''}
                        <span title={formatDateTime(t.at)}>{timeAgo(t.at)}</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Customer"
              action={order.isFriend ? <Badge tone="neutral">Friend</Badge> : null}
            />
            <CardBody className="space-y-3 text-sm">
              <p className="font-medium">{order.customerName}</p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`tel:${order.customerPhone}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[0.8125rem] hover:bg-cream"
                >
                  <Phone className="size-3.5" aria-hidden /> {order.customerPhone}
                </a>
                <a
                  href={`https://wa.me/${order.customerPhone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[0.8125rem] hover:bg-cream"
                >
                  <MessageSquare className="size-3.5" aria-hidden /> WhatsApp
                </a>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Delivery address" />
            <CardBody className="text-sm leading-relaxed text-ink/90">
              <p>{order.address.line}</p>
              <p>
                {order.address.area}, {humanize(order.address.district)}
              </p>
              {order.address.note ? (
                <p className="mt-2 rounded-lg bg-cream px-3 py-2 text-[0.8125rem] text-stone">
                  “{order.address.note}”
                </p>
              ) : null}
            </CardBody>
          </Card>
          <Card>
            <CardHeader
              title="Shipment"
              action={<Truck className="size-4 text-stone" aria-hidden />}
            />
            <CardBody className="text-sm">
              {order.shipment ? (
                <Facts
                  items={[
                    ['Courier', humanize(order.shipment.courier)],
                    ['Status', humanize(order.shipment.status)],
                    ...(order.shipment.consignmentId
                      ? ([['Consignment', order.shipment.consignmentId]] as [string, string][])
                      : []),
                  ]}
                />
              ) : (
                <p className="text-stone">Not shipped yet.</p>
              )}
              {order.shipment?.trackingUrl ? (
                <a
                  href={order.shipment.trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-[0.8125rem] font-medium underline underline-offset-4"
                >
                  Track parcel
                </a>
              ) : null}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Attribution" />
            <CardBody>
              <Facts
                items={[
                  [
                    'Price test',
                    order.experimentKey ? `Price ${order.experimentKey.toUpperCase()}` : '—',
                  ],
                  ...Object.entries(order.utm ?? {})
                    .filter(([, v]) => typeof v === 'string' && v)
                    .map(
                      ([k, v]) =>
                        [humanize(k.replace('utm', '').replace(/^_/, '') || k), String(v)] as [
                          string,
                          string,
                        ],
                    ),
                ]}
              />
            </CardBody>
          </Card>
        </div>
      </div>

      <Dialog
        open={modal === 'verify'}
        onClose={() => setModal(null)}
        title="Verify payment"
        description="Enter the amount you received in the bKash/Nagad app."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button
              disabled={busy || !Number(amount) || !payment}
              onClick={() =>
                payment &&
                void run(
                  () =>
                    api.POST('/v1/admin/payments/{id}/verify', {
                      params: { path: { id: payment.id } },
                      body: { amountReceivedPaisa: Math.round(Number(amount) * 100) },
                    }),
                  'Payment verified. The order is confirmed.',
                )
              }
            >
              Verify
            </Button>
          </>
        }
      >
        <Field
          label="Amount received (৳)"
          hint={
            payment
              ? `Expected ${formatTaka(payment.amountPaisa)}${payment.trxIdLast4 ? ` · transaction ending ${payment.trxIdLast4}` : ''}`
              : undefined
          }
        >
          <Input
            inputMode="numeric"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
          />
        </Field>
      </Dialog>

      <Dialog
        open={modal === 'reject' || move !== null}
        onClose={() => setModal(null)}
        title={
          modal === 'reject'
            ? 'Reject payment'
            : move
              ? (MOVE_LABEL[move] ?? STATUS_LABEL[move])
              : ''
        }
        description={
          modal === 'reject'
            ? 'The customer will be asked to pay again.'
            : 'Add a short reason for the record.'
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>
              Back
            </Button>
            <Button
              variant={modal === 'reject' || move === 'CANCELLED' ? 'danger' : 'primary'}
              disabled={
                busy ||
                (modal === 'reject' || move === 'CANCELLED' ? reason.trim().length < 3 : false)
              }
              onClick={() => {
                if (modal === 'reject' && payment) {
                  void run(
                    () =>
                      api.POST('/v1/admin/payments/{id}/reject', {
                        params: { path: { id: payment.id } },
                        body: { reason: reason.trim() },
                      }),
                    'Payment rejected.',
                  );
                } else if (move) {
                  void run(
                    () =>
                      api.POST('/v1/admin/orders/{id}/transitions', {
                        params: { path: { id } },
                        body: { to: move, ...(reason.trim() ? { reason: reason.trim() } : {}) },
                      }),
                    `${MOVE_LABEL[move] ?? STATUS_LABEL[move]}: done.`,
                  );
                }
              }}
            >
              {modal === 'reject'
                ? 'Reject payment'
                : move
                  ? (MOVE_LABEL[move] ?? STATUS_LABEL[move])
                  : ''}
            </Button>
          </>
        }
      >
        <Field
          label="Reason"
          hint={
            modal === 'reject' || move === 'CANCELLED'
              ? 'Needed (at least 3 characters).'
              : 'Optional.'
          }
        >
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </Dialog>
    </>
  );
}
