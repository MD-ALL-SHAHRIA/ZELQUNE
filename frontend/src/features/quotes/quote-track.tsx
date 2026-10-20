'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { fill, formatDate, formatNumber, formatTaka } from '@/i18n/format';
import { toApiError } from '@/shared/api/errors';
import { normalizeCode, normalizePhone, QUOTE_CODE } from '@/shared/lib/forms';
import { Button } from '@/shared/ui/button';
import { CopyText } from '@/shared/ui/copy-text';
import { Field, Input } from '@/shared/ui/field';
import { useLazyTrackQuoteQuery } from '@/store/api';

type Copy = Pick<Dictionary, 'bulk' | 'checkout' | 'ui' | 'consult' | 'build'>;

export function QuoteTrack({ lang, copy }: { lang: Locale; copy: Copy }) {
  const b = copy.bulk;
  const [code, setCode] = useState(useSearchParams().get('code') ?? '');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [track, { data: quote, isFetching }] = useLazyTrackQuoteQuery();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const normalized = normalizeCode(code);
    const mobile = normalizePhone(phone);
    if (!QUOTE_CODE.test(normalized)) return setError(b.codeFormat);
    if (!mobile) return setError(copy.checkout.errors.phone);
    try {
      await track({ code: normalized, phone: mobile }).unwrap();
    } catch (err) {
      const apiError = toApiError(err);
      setError(
        apiError.status === 404
          ? b.trackNotFound
          : apiError.code === 'TOO_MANY_REQUESTS'
            ? copy.checkout.errors.rateLimited
            : copy.checkout.errors.generic,
      );
    }
  }

  const totals = quote?.status === 'NEW' ? null : (quote?.totals ?? null);
  return (
    <div className="mx-auto max-w-3xl space-y-12">
      <form
        onSubmit={submit}
        noValidate
        className="grid gap-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <Field id="q-code" label={b.trackCode}>
          <Input
            id="q-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="QT-XXXXXX"
            autoCapitalize="characters"
            className="font-mono tracking-[0.12em]"
          />
        </Field>
        <Field id="q-phone" label={b.trackPhone}>
          <Input
            id="q-phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
        </Field>
        <Button type="submit" disabled={isFetching}>
          {isFetching ? copy.ui.loading : b.trackButton}
        </Button>
      </form>
      {error ? (
        <p role="alert" className="bg-danger/10 p-4 text-danger">
          <CopyText>{error}</CopyText>
        </p>
      ) : null}
      {quote && !error ? (
        <section aria-live="polite" className="space-y-8 bg-surface p-6 ring-1 ring-line sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="font-mono text-lg tracking-[0.16em]">{quote.code}</p>
            <p
              data-testid="quote-status"
              className="bg-glow/50 px-4 py-1.5 text-sm font-medium text-walnut"
            >
              {fill(b.statuses[quote.status], {
                validUntil: quote.validUntil ? formatDate(quote.validUntil, lang) : '',
              })}
            </p>
          </div>
          <div className="space-y-1">
            {quote.kind === 'DESIGN' || quote.kind === 'CONSTRUCTION' ? (
              <p className="text-xs uppercase tracking-eyebrow text-stone">
                {quote.kind === 'DESIGN' ? copy.consult.trackLabel : copy.build.trackLabel}
              </p>
            ) : null}
            {quote.organizationName ? (
              <p className="font-display text-3xl font-light">{quote.organizationName}</p>
            ) : null}
            {quote.design && quote.kind === 'CONSTRUCTION' ? (
              <p className="font-display text-2xl font-light">
                <span data-testid="quote-building">{copy.build.types[quote.design.spaceType]}</span>
                {quote.design.floors ? (
                  <>
                    <span aria-hidden className="mx-3 text-stone">
                      ·
                    </span>
                    <span data-testid="quote-floors">
                      {fill(
                        quote.design.floors === 1 ? copy.build.trackFloor : copy.build.trackFloors,
                        {
                          n: formatNumber(quote.design.floors, lang),
                        },
                      )}
                    </span>
                  </>
                ) : null}
              </p>
            ) : quote.design ? (
              <p data-testid="quote-space" className="font-display text-2xl font-light">
                {fill(copy.consult.trackSpace, {
                  space: copy.consult.spaces[quote.design.spaceType],
                })}
              </p>
            ) : null}
            {quote.neededBy ? (
              <p className="text-sm text-stone">
                {b.quote.neededBy}: {formatDate(quote.neededBy, lang)}
              </p>
            ) : null}
          </div>
          {quote.lines.length ? (
            <ul className="divide-y divide-line border-y border-line">
              {quote.lines.map((l) => (
                <li key={l.id} className="flex justify-between gap-4 py-4 text-sm">
                  <span>
                    {l.description} × {formatNumber(l.qty, lang)}
                  </span>
                  {totals && l.lineTotalPaisa !== null ? (
                    <span>{formatTaka(l.lineTotalPaisa, lang)}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          {totals ? (
            <dl className="grid gap-6 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-eyebrow text-stone">
                  {b.quote.delivery}
                </dt>
                <dd className="mt-1">{formatTaka(totals.shippingFeePaisa, lang)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-eyebrow text-stone">{b.quote.total}</dt>
                <dd className="mt-1 font-display text-2xl font-light">
                  {formatTaka(totals.totalPaisa, lang)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-eyebrow text-stone">{b.quote.advance}</dt>
                <dd className="mt-1">{formatTaka(totals.advanceRequiredPaisa, lang)}</dd>
              </div>
            </dl>
          ) : null}
          {quote.orderCode ? <p>{fill(b.quote.converted, { code: quote.orderCode })}</p> : null}
        </section>
      ) : null}
    </div>
  );
}
