'use client';

import { useState } from 'react';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { formatDate } from '@/i18n/format';
import { FormNotice } from '@/features/legal/form-notice';
import { toApiError } from '@/shared/api/errors';
import { normalizeCode, normalizePhone } from '@/shared/lib/forms';
import { Button } from '@/shared/ui/button';
import { Field, Input } from '@/shared/ui/field';
import { useTrackPrivacyRequestMutation } from '@/store/api';

type Copy = Pick<Dictionary, 'privacyRequest' | 'checkout'>;
const PRIVACY_CODE = /^PR-[A-Z0-9]{6}$/;

/** Status of a privacy request by code + phone; shows nothing personal. */
export function PrivacyTrack({ lang, copy }: { lang: Locale; copy: Copy }) {
  const c = copy.privacyRequest;
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [track, { data, isLoading }] = useTrackPrivacyRequestMutation();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const normalized = normalizeCode(code);
    const mobile = normalizePhone(phone);
    if (!PRIVACY_CODE.test(normalized)) return setError(c.trackCode);
    if (!mobile) return setError(copy.checkout.errors.phone);
    try {
      await track({ privacyTrackDto: { code: normalized, phone: mobile } }).unwrap();
    } catch (err) {
      const apiError = toApiError(err);
      setError(
        apiError.status === 404
          ? c.trackNotFound
          : apiError.code === 'TOO_MANY_REQUESTS'
            ? copy.checkout.errors.rateLimited
            : copy.checkout.errors.generic,
      );
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={submit}
        noValidate
        className="grid gap-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <Field id="prt-code" label={c.trackCode}>
          <Input
            id="prt-code"
            value={code}
            placeholder="PR-XXXXXX"
            autoCapitalize="characters"
            className="font-mono tracking-[0.12em]"
            onChange={(e) => setCode(e.target.value)}
          />
        </Field>
        <Field id="prt-phone" label={c.phone}>
          <Input
            id="prt-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>
        <Button type="submit" disabled={isLoading}>
          {c.trackButton}
        </Button>
        <FormNotice
          lang={lang}
          text={copy.checkout.privacyNotice.lookup}
          link={copy.checkout.privacyNotice.link}
          className="sm:col-span-3"
        />
      </form>
      {error ? (
        <p role="alert" className="text-danger">
          {error}
        </p>
      ) : null}
      {data && !error ? (
        <p role="status" className="border border-line p-5 text-lg">
          <span className="font-mono">{data.code}</span> · {c.types[data.type].title} ·{' '}
          {c.statusLabel}: <strong>{c.statuses[data.status]}</strong>
          <span className="mt-1 block text-sm text-stone">{formatDate(data.updatedAt, lang)}</span>
        </p>
      ) : null}
    </div>
  );
}
