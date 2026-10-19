'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Text } from '@/components/text';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { formatDate, formatNumber, formatTaka } from '@/i18n/format';
import { api, ok } from '@/lib/api-browser';
import { ApiError, type OrderTracking } from '@/lib/api-types';
import { normalizeCode, normalizePhone, ORDER_CODE } from '@/lib/forms';
import { displayStatus } from '@/lib/order-status';

type Copy = Pick<Dictionary, 'track' | 'checkout' | 'ui'> & {
  names: Record<string, string>;
  variants: Record<string, string | undefined>;
};

/** Track by code + phone; the browser asks the gateway directly (phone never in our URLs). */
export function TrackOrder({ lang, copy }: { lang: Locale; copy: Copy }) {
  const initialCode = useSearchParams().get('code') ?? '';
  const [code, setCode] = useState(initialCode);
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<OrderTracking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const t = copy.track;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOrder(null);
    const normalized = normalizeCode(code);
    const mobile = normalizePhone(phone);
    if (!ORDER_CODE.test(normalized)) return setError(t.codeFormat);
    if (!mobile) return setError(copy.checkout.errors.phone);
    setBusy(true);
    try {
      setOrder(
        ok(
          await api.GET('/v1/orders/track', {
            params: { query: { code: normalized, phone: mobile } },
          }),
        ),
      );
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 404
          ? t.notFound
          : err instanceof ApiError && err.code === 'TOO_MANY_REQUESTS'
            ? copy.checkout.errors.rateLimited
            : copy.checkout.errors.generic,
      );
    } finally {
      setBusy(false);
    }
  }

  const input = 'w-full rounded-md border border-line bg-surface px-3 py-2.5';
  return (
    <div className="space-y-6">
      <form
        onSubmit={submit}
        noValidate
        className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <div className="space-y-1">
          <label htmlFor="t-code" className="block text-sm font-semibold">
            {t.code}
          </label>
          <input
            id="t-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoCapitalize="characters"
            placeholder="ZQ-XXXXXX"
            className={`${input} font-mono`}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="t-phone" className="block text-sm font-semibold">
            {t.phone}
          </label>
          <input
            id="t-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={input}
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-walnut px-6 py-2.5 font-semibold text-cream disabled:opacity-50"
        >
          {busy ? copy.ui.loading : t.button}
        </button>
      </form>

      {error ? (
        <p role="alert" className="rounded-md bg-danger/10 p-3 text-danger">
          <Text>{error}</Text>
        </p>
      ) : null}

      {order ? (
        <section
          aria-live="polite"
          className="space-y-5 rounded-lg bg-surface p-4 ring-1 ring-line"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-lg font-semibold">{order.code}</p>
            <p
              data-testid="order-status"
              className="rounded-full bg-amber/25 px-3 py-1 font-semibold text-walnut"
            >
              {t.statuses[displayStatus(order)]}
            </p>
          </div>
          <ul className="divide-y divide-line">
            {order.items.map((item) => (
              <li key={item.sku} className="flex justify-between gap-2 py-2">
                <span>
                  {copy.names[item.sku] ?? (lang === 'bn' ? item.nameBn : item.nameEn)}{' '}
                  {Object.values(item.options)
                    .filter((v): v is string => typeof v === 'string')
                    .map((v) => copy.variants[v] ?? v)
                    .join(', ')}{' '}
                  × {formatNumber(item.qty, lang)}
                </span>
                <span>{formatTaka(item.lineTotalPaisa, lang)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-1">
            <div className="flex justify-between">
              <dt>{copy.checkout.summary.delivery}</dt>
              <dd>{formatTaka(order.totals.shippingFeePaisa, lang)}</dd>
            </div>
            <div className="flex justify-between font-semibold">
              <dt>{copy.checkout.summary.total}</dt>
              <dd data-testid="track-total">{formatTaka(order.totals.totalPaisa, lang)}</dd>
            </div>
          </dl>
          {order.payment ? (
            <div>
              <h2 className="font-semibold text-walnut">{t.sections.payment}</h2>
              <p>
                {copy.checkout.methods[order.payment.method]} ·{' '}
                {formatTaka(order.payment.amountPaisa, lang)}
                {order.payment.trxIdLast4 ? ` · …${order.payment.trxIdLast4}` : ''}
              </p>
            </div>
          ) : null}
          {order.shipment?.trackingUrl ? (
            <div>
              <h2 className="font-semibold text-walnut">{t.sections.delivery}</h2>
              <a
                href={order.shipment.trackingUrl}
                rel="noopener noreferrer"
                target="_blank"
                className="underline"
              >
                {t.courierLink}
              </a>
            </div>
          ) : null}
          <div>
            <h2 className="font-semibold text-walnut">{t.sections.history}</h2>
            <ol className="mt-1 space-y-1 text-sm">
              {order.history.map((h) => (
                <li key={`${h.status}-${h.at}`} className="flex justify-between gap-2">
                  <span>{t.statuses[h.status]}</span>
                  <time dateTime={h.at} className="text-muted">
                    {formatDate(h.at, lang)}
                  </time>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}
    </div>
  );
}
