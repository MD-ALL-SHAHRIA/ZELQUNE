'use client';

import { useState } from 'react';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { toApiError } from '@/shared/api/errors';
import { asciiDigits, checkoutErrorText, normalizePhone } from '@/shared/lib/forms';
import { href } from '@/shared/lib/site';
import { visitor } from '@/shared/lib/visitor-client';
import { Button, ButtonLink } from '@/shared/ui/button';
import { CopyText } from '@/shared/ui/copy-text';
import { Field, Input, Select, Textarea } from '@/shared/ui/field';
import { Turnstile } from '@/shared/ui/turnstile';
import { useRequestQuoteMutation } from '@/store/api';
import { FormNotice } from '@/features/legal/form-notice';

const OTHER = '__other__';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Line {
  product: string;
  description: string;
  qty: string;
}

type Copy = Pick<Dictionary, 'bulk' | 'checkout'>;

export function RfqForm({
  lang,
  products,
  copy,
}: {
  lang: Locale;
  products: { slug: string; name: string }[];
  copy: Copy;
}) {
  const b = copy.bulk;
  const [org, setOrg] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [lines, setLines] = useState<Line[]>([
    { product: products[0]?.slug ?? OTHER, description: '', qty: '' },
  ]);
  const [neededBy, setNeededBy] = useState('');
  const [customization, setCustomization] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [requestQuote, { isLoading: sending }] = useRequestQuoteMutation();
  const [token, setToken] = useState('');
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [done, setDone] = useState<string | null>(null);

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const found: Record<string, string> = {};
    const required = copy.checkout.errors.required;
    if (org.trim().length < 2) found.org = required;
    if (contact.trim().length < 2) found.contact = required;
    const mobile = normalizePhone(phone);
    if (!mobile) found.phone = copy.checkout.errors.phone;
    if (email.trim() && !EMAIL.test(email.trim())) found.email = b.errors.email;
    const items = lines.map((l, i) => {
      const qty = Number(asciiDigits(l.qty));
      if (!Number.isInteger(qty) || qty < 1) found[`qty${i}`] = b.errors.qty;
      const product = products.find((p) => p.slug === l.product);
      const description = product
        ? [product.name, l.description.trim()].filter(Boolean).join(': ')
        : l.description.trim();
      if (description.length < 2) found[`desc${i}`] = required;
      return { ...(product ? { productSlug: product.slug } : {}), description, qty };
    });
    if (!token) found.turnstile = copy.checkout.errors.turnstile;
    setErrors(found);
    if (Object.keys(found).length || !mobile) return;

    const { utm } = visitor();
    try {
      const res = await requestQuote({
        'cf-turnstile-response': token,
        rfqRequestDto: {
          organizationName: org.trim(),
          contactName: contact.trim(),
          phone: mobile,
          ...(email.trim() ? { email: email.trim() } : {}),
          items,
          ...(neededBy ? { neededBy } : {}),
          ...(customization.trim() ? { customizationNotes: customization.trim() } : {}),
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
    const [before, after] = b.after.split('{code}');
    return (
      <div role="status" className="space-y-8">
        <p className="font-display text-3xl font-medium leading-snug">
          {before}
          <strong
            data-testid="quote-code"
            className="mx-1 inline-block border border-ink px-3 py-1 font-mono text-lg font-normal tracking-[0.16em]"
          >
            {done}
          </strong>
          {after}
        </p>
        <ButtonLink href={`${href(lang, '/bulk/track')}?code=${done}`} size="lg">
          {b.trackHeading}
        </ButtonLink>
      </div>
    );
  }

  const err = (key: string) => errors[key];

  return (
    <form onSubmit={submit} noValidate className="space-y-10">
      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="r-org" label={b.fields.organizationName} error={err('org')}>
          <Input
            id="r-org"
            value={org}
            onChange={(e) => setOrg(e.target.value)}
            autoComplete="organization"
            aria-invalid={!!err('org')}
          />
        </Field>
        <Field id="r-contact" label={b.fields.contactName} error={err('contact')}>
          <Input
            id="r-contact"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            autoComplete="name"
            aria-invalid={!!err('contact')}
          />
        </Field>
        <Field id="r-phone" label={b.fields.phone} error={err('phone')}>
          <Input
            id="r-phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            aria-invalid={!!err('phone')}
          />
        </Field>
        <Field id="r-email" label={b.fields.email} error={err('email')}>
          <Input
            id="r-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            aria-invalid={!!err('email')}
          />
        </Field>
      </div>

      <div className="space-y-4">
        {lines.map((line, i) => (
          <fieldset
            key={i}
            className="grid gap-6 border border-line bg-surface p-6 sm:grid-cols-[1fr_9rem]"
          >
            <Field id={`r-product-${i}`} label={b.fields.product}>
              <Select
                id={`r-product-${i}`}
                value={line.product}
                onChange={(e) => setLine(i, { product: e.target.value })}
              >
                {products.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name}
                  </option>
                ))}
                <option value={OTHER}>{b.somethingElse}</option>
              </Select>
            </Field>
            <Field id={`r-qty-${i}`} label={b.fields.qty} error={err(`qty${i}`)}>
              <Input
                id={`r-qty-${i}`}
                inputMode="numeric"
                value={line.qty}
                onChange={(e) => setLine(i, { qty: e.target.value })}
                aria-invalid={!!err(`qty${i}`)}
              />
            </Field>
            <Field
              id={`r-desc-${i}`}
              label={b.describe}
              error={err(`desc${i}`)}
              className="sm:col-span-2"
            >
              <Input
                id={`r-desc-${i}`}
                value={line.description}
                onChange={(e) => setLine(i, { description: e.target.value })}
                aria-invalid={!!err(`desc${i}`)}
              />
            </Field>
          </fieldset>
        ))}
        {lines.length < 10 ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setLines((ls) => [...ls, { product: OTHER, description: '', qty: '' }])}
          >
            + {b.addLine}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="r-needed" label={b.fields.neededBy}>
          <Input
            id="r-needed"
            type="date"
            value={neededBy}
            onChange={(e) => setNeededBy(e.target.value)}
          />
        </Field>
      </div>
      <Field id="r-custom" label={b.fields.customization}>
        <Textarea
          id="r-custom"
          rows={3}
          value={customization}
          onChange={(e) => setCustomization(e.target.value)}
        />
      </Field>
      <Field id="r-notes" label={b.fields.notes}>
        <Textarea id="r-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      <Turnstile key={turnstileKey} lang={lang} onToken={setToken} />
      {err('turnstile') ? <p className="text-sm text-danger">{err('turnstile')}</p> : null}
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
      <Button type="submit" size="lg" disabled={sending}>
        {sending ? b.sending : b.button}
      </Button>
    </form>
  );
}
