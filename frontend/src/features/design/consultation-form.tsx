'use client';

import { useState } from 'react';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { toApiError } from '@/shared/api/errors';
import { type District } from '@/shared/api/types';
import { asciiDigits, checkoutErrorText, normalizePhone } from '@/shared/lib/forms';
import { href } from '@/shared/lib/site';
import { visitor } from '@/shared/lib/visitor-client';
import { Button, ButtonLink } from '@/shared/ui/button';
import { CopyText } from '@/shared/ui/copy-text';
import { Field, Input, Select, Textarea } from '@/shared/ui/field';
import { Turnstile } from '@/shared/ui/turnstile';
import { useRequestQuoteMutation } from '@/store/api';
import { FormNotice } from '@/features/legal/form-notice';

type Space = keyof Dictionary['consult']['spaces'];
type Budget = keyof Dictionary['consult']['budgets'];
type Copy = Pick<Dictionary, 'consult' | 'checkout' | 'bulk'>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Interior design consultation request: an RFQ of kind DESIGN with a space brief. */
export function ConsultationForm({
  lang,
  districts,
  copy,
  defaultSpace = 'HOME',
}: {
  lang: Locale;
  districts: District[];
  copy: Copy;
  defaultSpace?: Space;
}) {
  const c = copy.consult;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [space, setSpace] = useState<Space>(defaultSpace);
  const [size, setSize] = useState('');
  const [district, setDistrict] = useState('');
  const [budget, setBudget] = useState<Budget>('NOT_SURE');
  const [start, setStart] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [done, setDone] = useState<string | null>(null);
  const [requestQuote, { isLoading: sending }] = useRequestQuoteMutation();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const found: Record<string, string> = {};
    if (name.trim().length < 2) found.name = copy.checkout.errors.required;
    const mobile = normalizePhone(phone);
    if (!mobile) found.phone = copy.checkout.errors.phone;
    if (email.trim() && !EMAIL.test(email.trim())) found.email = copy.bulk.errors.email;
    const sqft = size.trim() ? Number(asciiDigits(size)) : null;
    if (sqft !== null && (!Number.isInteger(sqft) || sqft < 20)) found.size = copy.bulk.errors.qty;
    if (!token) found.turnstile = copy.checkout.errors.turnstile;
    setErrors(found);
    if (Object.keys(found).length || !mobile) return;

    const { utm } = visitor();
    try {
      const res = await requestQuote({
        'cf-turnstile-response': token,
        rfqRequestDto: {
          kind: 'DESIGN',
          contactName: name.trim(),
          phone: mobile,
          ...(email.trim() ? { email: email.trim() } : {}),
          design: {
            spaceType: space,
            ...(sqft ? { sizeSqft: sqft } : {}),
            ...(district ? { district } : {}),
            budget,
          },
          ...(start ? { neededBy: start } : {}),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
          ...(utm ? { utm } : {}),
        },
      }).unwrap();
      setDone(res.quoteCode);
    } catch (error) {
      setFormError(checkoutErrorText(toApiError(error), copy.checkout.errors));
      setToken('');
      setTurnstileKey((k) => k + 1);
    }
  }

  if (done) {
    const [before, after] = c.after.split('{code}');
    return (
      <div role="status" className="space-y-8">
        <p className="font-display text-3xl font-medium leading-snug">
          {before}
          <strong
            data-testid="consult-code"
            className="mx-1 inline-block border border-ink px-3 py-1 font-mono text-lg font-normal tracking-[0.16em]"
          >
            {done}
          </strong>
          <CopyText>{after ?? ''}</CopyText>
        </p>
        <ButtonLink href={`${href(lang, '/bulk/track')}?code=${done}`} size="lg">
          {copy.bulk.trackHeading}
        </ButtonLink>
      </div>
    );
  }

  const sorted = [...districts].sort((a, b) =>
    (lang === 'bn' ? a.nameBn : a.nameEn).localeCompare(lang === 'bn' ? b.nameBn : b.nameEn),
  );
  return (
    <form onSubmit={submit} noValidate className="space-y-8">
      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="c-name" label={c.fields.name} error={errors.name}>
          <Input
            id="c-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            aria-invalid={!!errors.name}
          />
        </Field>
        <Field id="c-phone" label={c.fields.phone} error={errors.phone}>
          <Input
            id="c-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-invalid={!!errors.phone}
          />
        </Field>
        <Field id="c-email" label={c.fields.email} error={errors.email}>
          <Input
            id="c-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!errors.email}
          />
        </Field>
        <Field id="c-space" label={c.fields.space}>
          <Select id="c-space" value={space} onChange={(e) => setSpace(e.target.value as Space)}>
            {(Object.keys(c.spaces) as Space[]).map((s) => (
              <option key={s} value={s}>
                {c.spaces[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="c-size" label={c.fields.size} error={errors.size}>
          <Input
            id="c-size"
            inputMode="numeric"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            aria-invalid={!!errors.size}
          />
        </Field>
        <Field id="c-district" label={c.fields.district}>
          <Select id="c-district" value={district} onChange={(e) => setDistrict(e.target.value)}>
            <option value="">—</option>
            {sorted.map((d) => (
              <option key={d.code} value={d.code}>
                {lang === 'bn' ? d.nameBn : d.nameEn}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="c-budget" label={c.fields.budget}>
          <Select
            id="c-budget"
            value={budget}
            onChange={(e) => setBudget(e.target.value as Budget)}
          >
            {(Object.keys(c.budgets) as Budget[]).map((b) => (
              <option key={b} value={b}>
                {c.budgets[b]}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="c-start" label={c.fields.start}>
          <Input
            id="c-start"
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </Field>
      </div>
      <Field id="c-notes" label={c.fields.notes}>
        <Textarea id="c-notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <Turnstile key={turnstileKey} lang={lang} onToken={setToken} />
      {errors.turnstile ? <p className="text-sm text-danger">{errors.turnstile}</p> : null}
      {formError ? (
        <p role="alert" className="bg-danger/10 p-4 text-sm text-danger">
          <CopyText>{formError}</CopyText>
        </p>
      ) : null}
      <FormNotice
        lang={lang}
        text={copy.checkout.privacyNotice.request}
        link={copy.checkout.privacyNotice.link}
      />
      <Button type="submit" size="lg" disabled={sending} className="w-full sm:w-auto">
        {sending ? c.sending : c.button}
      </Button>
    </form>
  );
}
