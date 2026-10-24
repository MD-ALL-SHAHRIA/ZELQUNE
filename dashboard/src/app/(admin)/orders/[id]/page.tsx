'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardTitle,
  Field,
  Input,
  Notice,
  PageHeader,
  Textarea,
} from '@/components/ui';
import { api, errorMessage, type Schemas } from '@/lib/api';
import { formatDateTime, formatTaka, humanize } from '@/lib/format';
import { NEXT_STATUS, type OrderStatus, statusTone } from '@/lib/orders';

type Order = Schemas['AdminOrderDetailDto_Output'];

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [received, setReceived] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await api.GET('/v1/admin/orders/{id}', { params: { path: { id } } });
    if (data) {
      setOrder(data);
      setReceived(String(Math.round(data.advanceRequiredPaisa / 100)));
    } else setError(errorMessage(error));
  }, [id]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() awaits the API before setting state
    void load();
  }, [load]);

  const run = async (action: () => Promise<{ error?: unknown }>, done: string) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    const { error } = await action();
    setBusy(false);
    if (error) setError(errorMessage(error));
    else {
      setMessage(done);
      setReason('');
      await load();
    }
  };

  if (!order) {
    return error ? (
      <Notice tone="error">{error}</Notice>
    ) : (
      <p role="status" className="text-sm text-stone">
        Loading…
      </p>
    );
  }
  const payment = order.payment;
  const next = NEXT_STATUS[order.status];

  return (
    <>
      <Link
        href="/orders"
        className="mb-4 inline-flex items-center gap-2 text-sm text-stone hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> Orders
      </Link>
      <PageHeader
        title={order.code}
        description={`${formatDateTime(order.placedAt)} · ${humanize(order.saleMode)} · ${order.channel}`}
        actions={<Badge tone={statusTone(order.status)}>{humanize(order.status)}</Badge>}
      />
      <div className="space-y-3">
        {error ? <Notice tone="error">{error}</Notice> : null}
        {message ? <Notice tone="ok">{message}</Notice> : null}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <Card>
            <CardTitle>Items</CardTitle>
            <ul className="divide-y divide-line text-sm">
              {order.items.map((i) => (
                <li key={i.sku} className="flex justify-between gap-4 py-2.5">
                  <span>
                    {i.nameEn} <span className="text-stone">× {i.qty}</span>
                    <span className="block text-[0.75rem] text-stone">{i.sku}</span>
                  </span>
                  <span className="tabular-nums">{formatTaka(i.lineTotalPaisa)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
              {(
                [
                  ['Subtotal', order.totals.subtotalPaisa],
                  ['Discount', -order.totals.discountPaisa],
                  ['Delivery', order.totals.shippingFeePaisa],
                  ['Total', order.totals.totalPaisa],
                  ['Advance required', order.totals.advanceRequiredPaisa],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-stone">{k}</dt>
                  <dd className="tabular-nums">{formatTaka(v)}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card>
            <CardTitle>History</CardTitle>
            <ol className="space-y-2 text-sm">
              {order.history.map((h, i) => (
                <li key={i} className="flex justify-between gap-4">
                  <span>
                    {h.from ? `${humanize(h.from)} → ` : ''}
                    <strong className="font-medium">{humanize(h.to)}</strong>
                    {h.reason ? (
                      <span className="block text-[0.75rem] text-stone">{h.reason}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-[0.75rem] text-stone">{formatDateTime(h.at)}</span>
                </li>
              ))}
            </ol>
          </Card>
          <Card>
            <CardTitle>Notes</CardTitle>
            <ul className="mb-4 space-y-2 text-sm">
              {order.notes.map((n) => (
                <li key={n.id} className="rounded-md bg-cream px-3 py-2">
                  {n.text}
                  <span className="block text-[0.72rem] text-stone">
                    {n.author} · {formatDateTime(n.at)}
                  </span>
                </li>
              ))}
            </ul>
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!note.trim()) return;
                void run(
                  () =>
                    api.POST('/v1/admin/orders/{id}/notes', {
                      params: { path: { id } },
                      body: { text: note.trim() },
                    }),
                  'Note added.',
                ).then(() => setNote(''));
              }}
            >
              <Textarea
                aria-label="New note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <Button type="submit" variant="secondary" size="sm" disabled={busy}>
                Add note
              </Button>
            </form>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardTitle>Customer</CardTitle>
            <p className="text-sm font-medium">{order.customerName}</p>
            <p className="text-sm">{order.customerPhone}</p>
            <p className="mt-2 text-sm text-stone">
              {order.address.line}, {order.address.area}, {humanize(order.address.district)}
            </p>
            {order.address.note ? (
              <p className="mt-1 text-sm text-stone">“{order.address.note}”</p>
            ) : null}
            {order.isFriend ? <Badge tone="amber">Friend order (not counted for GO)</Badge> : null}
          </Card>

          {payment ? (
            <Card>
              <CardTitle
                aside={
                  <Badge tone={payment.status === 'SUBMITTED' ? 'amber' : 'stone'}>
                    {humanize(payment.status)}
                  </Badge>
                }
              >
                Payment
              </CardTitle>
              <p className="text-sm">
                {humanize(payment.method)} · {humanize(payment.kind)} ·{' '}
                {formatTaka(payment.amountPaisa)}
              </p>
              {payment.trxIdLast4 ? (
                <p className="text-sm text-stone">Transaction ID ends in {payment.trxIdLast4}</p>
              ) : null}
              {payment.status === 'SUBMITTED' ? (
                <div className="mt-4 space-y-3">
                  <Field label="Amount received (৳)" hint="Check it in the bKash/Nagad app first.">
                    <Input
                      inputMode="numeric"
                      value={received}
                      onChange={(e) => setReceived(e.target.value)}
                    />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={busy || !Number(received)}
                      onClick={() =>
                        void run(
                          () =>
                            api.POST('/v1/admin/payments/{id}/verify', {
                              params: { path: { id: payment.id } },
                              body: { amountReceivedPaisa: Math.round(Number(received) * 100) },
                            }),
                          'Payment verified.',
                        )
                      }
                    >
                      Verify payment
                    </Button>
                    <Button
                      variant="danger"
                      disabled={busy || reason.trim().length < 3}
                      onClick={() =>
                        void run(
                          () =>
                            api.POST('/v1/admin/payments/{id}/reject', {
                              params: { path: { id: payment.id } },
                              body: { reason: reason.trim() },
                            }),
                          'Payment rejected.',
                        )
                      }
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ) : null}
              {payment.status === 'COD_PENDING' ? (
                <Button
                  className="mt-4"
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
            </Card>
          ) : null}

          <Card>
            <CardTitle>Move order</CardTitle>
            {next.length ? (
              <div className="space-y-3">
                <Field label="Reason (needed to cancel or reject)">
                  <Input value={reason} onChange={(e) => setReason(e.target.value)} />
                </Field>
                <div className="flex flex-wrap gap-2">
                  {next.map((to: OrderStatus) => (
                    <Button
                      key={to}
                      variant={to === 'CANCELLED' ? 'danger' : 'secondary'}
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () =>
                            api.POST('/v1/admin/orders/{id}/transitions', {
                              params: { path: { id } },
                              body: { to, ...(reason.trim() ? { reason: reason.trim() } : {}) },
                            }),
                          `Order moved to ${humanize(to)}.`,
                        )
                      }
                    >
                      {humanize(to)}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-stone">This order is closed.</p>
            )}
          </Card>
          {order.shipment ? (
            <Card>
              <CardTitle>Shipment</CardTitle>
              <p className="text-sm">
                {humanize(order.shipment.courier)} · {humanize(order.shipment.status)}
              </p>
              {order.shipment.trackingUrl ? (
                <a
                  href={order.shipment.trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm underline"
                >
                  Track parcel
                </a>
              ) : null}
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
