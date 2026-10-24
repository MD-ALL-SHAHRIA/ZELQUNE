'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { formatDate, formatNumber, formatTaka } from '@/i18n/format';
import { toApiError } from '@/shared/api/errors';
import { normalizeCode, normalizePhone, ORDER_CODE } from '@/shared/lib/forms';
import { Button } from '@/shared/ui/button';
import { CopyText } from '@/shared/ui/copy-text';
import { Field, Input } from '@/shared/ui/field';
import { useLazyTrackOrderQuery } from '@/store/api';
import { displayStatus } from './order-status';

type Copy = Pick<Dictionary, 'track' | 'checkout' | 'ui' | 'products' | 'product'>;

/** Track by code + phone; the browser asks the gateway directly (phone never in our URLs). */
export function TrackOrder({ lang, copy }: { lang: Locale; copy: Copy }) {
  const [code, setCode] = useState(useSearchParams().get('code') ?? '');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [track, { data: order, isFetching }] = useLazyTrackOrderQuery();
  const t = copy.track;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const normalized = normalizeCode(code);
    const mobile = normalizePhone(phone);
    if (!ORDER_CODE.test(normalized)) return setError(t.codeFormat);
    if (!mobile) return setError(copy.checkout.errors.phone);
    try {
      await track({ code: normalized, phone: mobile }).unwrap();
    } catch (err) {
      const apiError = toApiError(err);
      setError(
        apiError.status === 404
          ? t.notFound
          : apiError.code === 'TOO_MANY_REQUESTS'
            ? copy.checkout.errors.rateLimited
            : copy.checkout.errors.generic,
      );
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-12">
      <form
        onSubmit={submit}
        noValidate
        className="grid gap-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <Field id="t-code" label={t.code}>
          <Input
            id="t-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoCapitalize="characters"
            placeholder="ZQ-XXXXXX"
            className="font-mono tracking-[0.12em]"
          />
        </Field>
        <Field id="t-phone" label={t.phone}>
          <Input
            id="t-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>
        <Button type="submit" disabled={isFetching}>
          {isFetching ? copy.ui.loading : t.button}
        </Button>
      </form>

      {error ? (
        <p role="alert" className="bg-danger/10 p-4 text-danger">
          <CopyText>{error}</CopyText>
        </p>
      ) : null}

      {order && !error ? (
        <section aria-live="polite" className="space-y-10 bg-surface p-6 ring-1 ring-line sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="font-mono text-lg tracking-[0.16em]">{order.code}</p>
            <p
              data-testid="order-status"
              className="bg-glow/50 px-4 py-1.5 text-sm font-medium text-walnut"
            >
              {t.statuses[displayStatus(order)]}
            </p>
          </div>
          <ol className="relative space-y-6 border-l border-line pl-6">
            {order.history.map((h) => (
              <li key={`${h.status}-${h.at}`} className="relative">
                <span
                  aria-hidden
                  className="absolute -left-[1.86rem] top-1.5 size-2.5 rounded-full bg-walnut"
                />
                <p className="font-display text-xl font-medium">{t.statuses[h.status]}</p>
                <time dateTime={h.at} className="text-xs text-stone">
                  {formatDate(h.at, lang)}
                </time>
              </li>
            ))}
          </ol>
          <ul className="divide-y divide-line border-y border-line">
            {order.items.map((item) => (
              <li key={item.sku} className="flex justify-between gap-4 py-4 text-sm">
                <span>
                  {lang === 'bn' ? item.nameBn : item.nameEn}{' '}
                  {Object.values(item.options)
                    .filter((v): v is string => typeof v === 'string')
                    .map((v) => copy.product.variants[v] ?? v)
                    .join(', ')}{' '}
                  × {formatNumber(item.qty, lang)}
                </span>
                <span>{formatTaka(item.lineTotalPaisa, lang)}</span>
              </li>
            ))}
          </ul>
          <dl className="grid gap-6 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-eyebrow text-stone">
                {copy.checkout.summary.total}
              </dt>
              <dd data-testid="track-total" className="mt-1 font-display text-2xl font-medium">
                {formatTaka(order.totals.totalPaisa, lang)}
              </dd>
            </div>
            {order.payment ? (
              <div>
                <dt className="text-xs uppercase tracking-eyebrow text-stone">
                  {t.sections.payment}
                </dt>
                <dd className="mt-1">
                  {copy.checkout.methods[order.payment.method]} ·{' '}
                  {formatTaka(order.payment.amountPaisa, lang)}
                  {order.payment.trxIdLast4 ? ` · …${order.payment.trxIdLast4}` : ''}
                </dd>
              </div>
            ) : null}
            {order.shipment?.trackingUrl ? (
              <div>
                <dt className="text-xs uppercase tracking-eyebrow text-stone">
                  {t.sections.delivery}
                </dt>
                <dd className="mt-1">
                  <a
                    href={order.shipment.trackingUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="underline"
                  >
                    {t.courierLink}
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}
    </div>
  );
}
