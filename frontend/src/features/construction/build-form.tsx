'use client';

import { useEffect, useRef, useState } from 'react';
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

type BuildingType = keyof Dictionary['build']['types'];
type Budget = keyof Dictionary['build']['budgets'];
type Copy = Pick<Dictionary, 'build' | 'checkout' | 'bulk' | 'consult'>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MAX_FLOORS = 60;

/** Construction enquiry: an RFQ of kind CONSTRUCTION with a building brief. */
export function BuildForm({
  lang,
  districts,
  copy,
}: {
  lang: Locale;
  districts: District[];
  copy: Copy;
}) {
  const c = copy.build;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState<BuildingType>('HOME');
  const [size, setSize] = useState('');
  const [floors, setFloors] = useState('');
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
  const doneRef = useRef<HTMLDivElement>(null);

  // The confirmation is shorter than the form: bring it into view and move focus to it.
  useEffect(() => {
    if (!done) return;
    doneRef.current?.scrollIntoView({ block: 'center' });
    doneRef.current?.focus({ preventScroll: true });
  }, [done]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const found: Record<string, string> = {};
    if (name.trim().length < 2) found.name = copy.checkout.errors.required;
    const mobile = normalizePhone(phone);
    if (!mobile) found.phone = copy.checkout.errors.phone;
    if (email.trim() && !EMAIL.test(email.trim())) found.email = copy.bulk.errors.email;
    const sqft = size.trim() ? Number(asciiDigits(size.trim())) : null;
    if (sqft !== null && (!Number.isInteger(sqft) || sqft < 20)) found.size = copy.bulk.errors.qty;
    const storeys = floors.trim() ? Number(asciiDigits(floors.trim())) : null;
    if (storeys !== null && (!Number.isInteger(storeys) || storeys < 1 || storeys > MAX_FLOORS))
      found.floors = c.errors.floors;
    if (!token) found.turnstile = copy.checkout.errors.turnstile;
    setErrors(found);
    if (Object.keys(found).length || !mobile) return;

    const { utm } = visitor();
    try {
      const res = await requestQuote({
        'cf-turnstile-response': token,
        rfqRequestDto: {
          kind: 'CONSTRUCTION',
          contactName: name.trim(),
          phone: mobile,
          ...(email.trim() ? { email: email.trim() } : {}),
          design: {
            spaceType: type,
            ...(sqft ? { sizeSqft: sqft } : {}),
            ...(district ? { district } : {}),
            budget,
            ...(storeys ? { floors: storeys } : {}),
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
      <div
        ref={doneRef}
        tabIndex={-1}
        role="status"
        className="space-y-8 bg-surface p-8 outline-none ring-1 ring-line sm:p-12"
      >
        <p className="font-display text-3xl font-light leading-snug">
          <CopyText>{before ?? ''}</CopyText>
          <strong
            data-testid="build-code"
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
    <form
      onSubmit={submit}
      noValidate
      className="space-y-8 bg-surface/80 p-6 ring-1 ring-line backdrop-blur-sm sm:p-10"
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="b-name" label={c.fields.name} error={errors.name}>
          <Input
            id="b-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
            aria-invalid={!!errors.name}
          />
        </Field>
        <Field id="b-phone" label={c.fields.phone} error={errors.phone}>
          <Input
            id="b-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            aria-invalid={!!errors.phone}
          />
        </Field>
        <Field id="b-email" label={c.fields.email} error={errors.email} className="sm:col-span-2">
          <Input
            id="b-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!errors.email}
          />
        </Field>
        <Field id="b-type" label={c.fields.type}>
          <Select
            id="b-type"
            value={type}
            onChange={(e) => setType(e.target.value as BuildingType)}
          >
            {(Object.keys(c.types) as BuildingType[]).map((t) => (
              <option key={t} value={t}>
                {c.types[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="b-floors" label={c.fields.floors} error={errors.floors}>
          <Input
            id="b-floors"
            inputMode="numeric"
            value={floors}
            onChange={(e) => setFloors(e.target.value)}
            aria-invalid={!!errors.floors}
          />
        </Field>
        <Field id="b-size" label={c.fields.size} error={errors.size}>
          <Input
            id="b-size"
            inputMode="numeric"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            aria-invalid={!!errors.size}
          />
        </Field>
        <Field id="b-district" label={c.fields.district}>
          <Select id="b-district" value={district} onChange={(e) => setDistrict(e.target.value)}>
            <option value="">—</option>
            {sorted.map((d) => (
              <option key={d.code} value={d.code}>
                {lang === 'bn' ? d.nameBn : d.nameEn}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="b-budget" label={c.fields.budget}>
          <Select
            id="b-budget"
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
        <Field id="b-start" label={c.fields.start}>
          <Input
            id="b-start"
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </Field>
      </div>
      <Field id="b-notes" label={c.fields.notes}>
        <Textarea id="b-notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <Turnstile key={turnstileKey} lang={lang} onToken={setToken} />
      {errors.turnstile ? <p className="text-sm text-danger">{errors.turnstile}</p> : null}
      {formError ? (
        <p role="alert" className="bg-danger/10 p-4 text-sm text-danger">
          <CopyText>{formError}</CopyText>
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={sending} className="w-full sm:w-auto">
        {sending ? c.sending : c.button}
      </Button>
    </form>
  );
}
