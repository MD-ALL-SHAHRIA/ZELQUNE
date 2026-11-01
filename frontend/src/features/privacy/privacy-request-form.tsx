'use client';

import { useState } from 'react';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { FormNotice } from '@/features/legal/form-notice';
import { toApiError } from '@/shared/api/errors';
import {
  checkoutErrorText,
  normalizeCode,
  normalizePhone,
  ORDER_CODE,
  QUOTE_CODE,
} from '@/shared/lib/forms';
import { focusFirstInvalid } from '@/shared/lib/focus-invalid';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { Field, Input, Textarea } from '@/shared/ui/field';
import { Turnstile } from '@/shared/ui/turnstile';
import { useSubmitPrivacyRequestMutation } from '@/store/api';

type Copy = Pick<Dictionary, 'privacyRequest' | 'checkout'>;
type Kind = keyof Dictionary['privacyRequest']['types'];
const KINDS: Kind[] = ['ACCESS', 'CORRECTION', 'DELETION', 'CONSENT_WITHDRAWAL'];

/**
 * Privacy request (ADR 0020). Asks only for what is needed to find the records and reach the
 * person; the reply is the same whether or not the number has records.
 */
export function PrivacyRequestForm({ lang, copy }: { lang: Locale; copy: Copy }) {
  const c = copy.privacyRequest;
  const [type, setType] = useState<Kind>('ACCESS');
  const [phone, setPhone] = useState('');
  const [reference, setReference] = useState('');
  const [email, setEmail] = useState('');
  const [details, setDetails] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [done, setDone] = useState<string | null>(null);
  const [send, { isLoading: sending }] = useSubmitPrivacyRequestMutation();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const mobile = normalizePhone(phone);
    const ref = normalizeCode(reference);
    const found: Record<string, string> = {};
    if (!mobile) found.phone = copy.checkout.errors.phone;
    if (ref && !ORDER_CODE.test(ref) && !QUOTE_CODE.test(ref)) found.reference = c.referenceInvalid;
    if (type === 'CORRECTION' && details.trim().length < 5) found.details = c.detailsRequired;
    if (!token) found.turnstile = copy.checkout.errors.turnstile;
    setErrors(found);
    if (Object.keys(found).length) focusFirstInvalid(e.currentTarget as HTMLFormElement);
    if (Object.keys(found).length || !mobile) return;
    try {
      const res = await send({
        'cf-turnstile-response': token,
        submitPrivacyRequestDto: {
          type,
          phone: mobile,
          ...(ref ? { reference: ref } : {}),
          ...(email.trim() ? { email: email.trim() } : {}),
          details: details.trim(),
        },
      }).unwrap();
      setDone(res.code);
    } catch (error) {
      setFormError(checkoutErrorText(toApiError(error), copy.checkout.errors));
      setToken('');
      setTurnstileKey((k) => k + 1);
    }
  }

  if (done) {
    const [before, after] = c.done.split('{code}');
    return (
      <div role="status" className="space-y-5 border border-line p-6 sm:p-8">
        <h2 className="font-display text-3xl">{c.doneHeading}</h2>
        <p className="text-lg leading-relaxed">
          {before}
          <strong
            data-testid="privacy-code"
            className="mx-1 inline-block border border-ink px-3 py-1 font-mono text-base font-normal tracking-[0.16em]"
          >
            {done}
          </strong>
          {after}
        </p>
        <p className="leading-relaxed">{c.doneNext}</p>
        <p className="text-sm text-stone">{c.doneNoDelivery}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-7">
      <fieldset>
        <legend className="mb-3 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-stone [:lang(bn)_&]:text-sm [:lang(bn)_&]:tracking-normal">
          {c.typeLabel}
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {KINDS.map((k) => (
            <label
              key={k}
              className={cn(
                'flex cursor-pointer gap-3 border p-4 transition-colors',
                type === k ? 'border-ink' : 'border-line hover:border-ink/40',
              )}
            >
              <input
                type="radio"
                name="privacy-type"
                value={k}
                checked={type === k}
                onChange={() => setType(k)}
                className="mt-1 size-4 accent-[var(--color-walnut)]"
              />
              <span>
                <span className="block font-medium">{c.types[k].title}</span>
                <span className="mt-1 block text-sm leading-relaxed text-stone">
                  {c.types[k].text}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="pr-phone" label={c.phone} error={errors.phone}>
          <Input
            id="pr-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? 'pr-phone-error' : undefined}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>
        <Field id="pr-ref" label={c.reference} hint={c.referenceHint} error={errors.reference}>
          <Input
            id="pr-ref"
            value={reference}
            autoCapitalize="characters"
            placeholder="ZQ-XXXXXX"
            className="font-mono tracking-[0.12em]"
            aria-invalid={!!errors.reference}
            aria-describedby={errors.reference ? 'pr-ref-error' : undefined}
            onChange={(e) => setReference(e.target.value)}
          />
        </Field>
      </div>
      <Field id="pr-email" label={c.email}>
        <Input
          id="pr-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field
        id="pr-details"
        label={type === 'CORRECTION' ? c.detailsCorrection : c.details}
        error={errors.details}
      >
        <Textarea
          id="pr-details"
          rows={4}
          maxLength={1000}
          value={details}
          aria-invalid={!!errors.details}
          aria-describedby={errors.details ? 'pr-details-error' : undefined}
          onChange={(e) => setDetails(e.target.value)}
        />
      </Field>

      <div>
        <Turnstile key={turnstileKey} lang={lang} onToken={setToken} />
        {errors.turnstile ? <p className="mt-2 text-sm text-danger">{errors.turnstile}</p> : null}
      </div>
      {formError ? (
        <p role="alert" className="text-sm text-danger">
          {formError}
        </p>
      ) : null}
      <FormNotice lang={lang} text={c.notice} link={copy.checkout.privacyNotice.link} />
      <Button type="submit" size="lg" disabled={sending} className="w-full sm:w-auto">
        {sending ? c.sending : c.submit}
      </Button>
    </form>
  );
}
