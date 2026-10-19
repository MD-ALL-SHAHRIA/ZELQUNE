'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Text } from '@/components/text';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { fill, formatDate, formatNumber, formatTaka } from '@/i18n/format';
import { api, ok } from '@/lib/api-browser';
import { ApiError, type PublicQuote } from '@/lib/api-types';
import { normalizeCode, normalizePhone, QUOTE_CODE } from '@/lib/forms';

type Copy = Pick<Dictionary, 'bulk' | 'checkout' | 'ui'>;

export function QuoteTrack({ lang, copy }: { lang: Locale; copy: Copy }) {
  const b = copy.bulk;
  const [code, setCode] = useState(useSearchParams().get('code') ?? '');
  const [phone, setPhone] = useState('');
  const [quote, setQuote] = useState<PublicQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setQuote(null);
    const normalized = normalizeCode(code);
    const mobile = normalizePhone(phone);
    if (!QUOTE_CODE.test(normalized)) return setError(b.codeFormat);
    if (!mobile) return setError(copy.checkout.errors.phone);
    setBusy(true);
    try {
      setQuote(
        ok(
          await api.GET('/v1/quote-requests/track', {
            params: { query: { code: normalized, phone: mobile } },
          }),
        ),
      );
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 404
          ? b.trackNotFound
          : err instanceof ApiError && err.code === 'TOO_MANY_REQUESTS'
            ? copy.checkout.errors.rateLimited
            : copy.checkout.errors.generic,
      );
    } finally {
      setBusy(false);
    }
  }

  const input = 'w-full rounded-md border border-line bg-surface px-3 py-2.5';
  const totals = quote?.status === 'NEW' ? null : (quote?.totals ?? null);
  return (
    <div className="space-y-6">
      <form
        onSubmit={submit}
        noValidate
        className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <div className="space-y-1">
          <label htmlFor="q-code" className="block text-sm font-semibold">
            {b.trackCode}
          </label>
          <input
            id="q-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="QT-XXXXXX"
            autoCapitalize="characters"
            className={`${input} font-mono`}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="q-phone" className="block text-sm font-semibold">
            {b.trackPhone}
          </label>
          <input
            id="q-phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            className={input}
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-walnut px-6 py-2.5 font-semibold text-cream disabled:opacity-50"
        >
          {busy ? copy.ui.loading : b.trackButton}
        </button>
      </form>
      {error ? (
        <p role="alert" className="rounded-md bg-danger/10 p-3 text-danger">
          <Text>{error}</Text>
        </p>
      ) : null}
      {quote ? (
        <section
          aria-live="polite"
          className="space-y-4 rounded-lg bg-surface p-4 ring-1 ring-line"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-lg font-semibold">{quote.code}</p>
            <p
              data-testid="quote-status"
              className="rounded-full bg-amber/25 px-3 py-1 font-semibold text-walnut"
            >
              {fill(b.statuses[quote.status], {
                validUntil: quote.validUntil ? formatDate(quote.validUntil, lang) : '',
              })}
            </p>
          </div>
          <p className="font-semibold">{quote.organizationName}</p>
          {quote.neededBy ? (
            <p className="text-sm">
              {b.quote.neededBy}: {formatDate(quote.neededBy, lang)}
            </p>
          ) : null}
          <ul className="divide-y divide-line">
            {quote.lines.map((l) => (
              <li key={l.id} className="flex justify-between gap-2 py-2">
                <span>
                  {l.description} × {formatNumber(l.qty, lang)}
                </span>
                {totals && l.lineTotalPaisa !== null ? (
                  <span>{formatTaka(l.lineTotalPaisa, lang)}</span>
                ) : null}
              </li>
            ))}
          </ul>
          {totals ? (
            <dl className="space-y-1">
              <div className="flex justify-between">
                <dt>{b.quote.delivery}</dt>
                <dd>{formatTaka(totals.shippingFeePaisa, lang)}</dd>
              </div>
              <div className="flex justify-between font-semibold">
                <dt>{b.quote.total}</dt>
                <dd>{formatTaka(totals.totalPaisa, lang)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>{b.quote.advance}</dt>
                <dd>{formatTaka(totals.advanceRequiredPaisa, lang)}</dd>
              </div>
            </dl>
          ) : null}
          {quote.orderCode ? <p>{fill(b.quote.converted, { code: quote.orderCode })}</p> : null}
        </section>
      ) : null}
    </div>
  );
}
