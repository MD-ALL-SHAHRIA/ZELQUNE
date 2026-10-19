'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Text } from '@/components/text';
import { Turnstile } from '@/components/turnstile';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { asciiDigits, checkoutErrorText, normalizePhone } from '@/lib/forms';
import { api, ok, visitor } from '@/lib/api-browser';
import { href } from '@/lib/site';

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
  const [sending, setSending] = useState(false);
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
    setSending(true);
    try {
      const res = ok(
        await api.POST('/v1/quote-requests', {
          params: { header: { 'cf-turnstile-response': token } },
          body: {
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
        }),
      );
      setDone(res.quoteCode);
    } catch (error) {
      setFormError(checkoutErrorText(error, copy.checkout.errors));
      setToken('');
      setTurnstileKey((k) => k + 1);
    } finally {
      setSending(false);
    }
  }

  if (done) {
    const [before, after] = b.after.split('{code}');
    return (
      <div role="status" className="space-y-4 rounded-lg bg-surface p-6 ring-1 ring-line">
        <p className="text-lg">
          {before}
          <strong data-testid="quote-code" className="font-mono text-walnut">
            {done}
          </strong>
          {after}
        </p>
        <Link
          href={`${href(lang, '/bulk/track')}?code=${done}`}
          className="inline-block rounded-md bg-walnut px-6 py-3 font-semibold text-cream"
        >
          {b.trackHeading}
        </Link>
      </div>
    );
  }

  const input = 'w-full rounded-md border border-line bg-surface px-3 py-2.5';
  const label = 'block text-sm font-semibold';
  const err = (key: string) =>
    errors[key] ? <p className="text-sm text-danger">{errors[key]}</p> : null;

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="r-org" className={label}>
            {b.fields.organizationName}
          </label>
          <input
            id="r-org"
            value={org}
            onChange={(e) => setOrg(e.target.value)}
            autoComplete="organization"
            className={input}
          />
          {err('org')}
        </div>
        <div className="space-y-1">
          <label htmlFor="r-contact" className={label}>
            {b.fields.contactName}
          </label>
          <input
            id="r-contact"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            autoComplete="name"
            className={input}
          />
          {err('contact')}
        </div>
        <div className="space-y-1">
          <label htmlFor="r-phone" className={label}>
            {b.fields.phone}
          </label>
          <input
            id="r-phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            className={input}
          />
          {err('phone')}
        </div>
        <div className="space-y-1">
          <label htmlFor="r-email" className={label}>
            {b.fields.email}
          </label>
          <input
            id="r-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className={input}
          />
          {err('email')}
        </div>
      </div>

      {lines.map((line, i) => (
        <fieldset
          key={i}
          className="grid gap-3 rounded-lg bg-surface p-4 ring-1 ring-line sm:grid-cols-[1fr_8rem]"
        >
          <div className="space-y-1">
            <label htmlFor={`r-product-${i}`} className={label}>
              {b.fields.product}
            </label>
            <select
              id={`r-product-${i}`}
              value={line.product}
              onChange={(e) => setLine(i, { product: e.target.value })}
              className={input}
            >
              {products.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
              <option value={OTHER}>{b.somethingElse}</option>
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor={`r-qty-${i}`} className={label}>
              {b.fields.qty}
            </label>
            <input
              id={`r-qty-${i}`}
              inputMode="numeric"
              value={line.qty}
              onChange={(e) => setLine(i, { qty: e.target.value })}
              className={input}
            />
            {err(`qty${i}`)}
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label htmlFor={`r-desc-${i}`} className={label}>
              {b.describe}
            </label>
            <input
              id={`r-desc-${i}`}
              value={line.description}
              onChange={(e) => setLine(i, { description: e.target.value })}
              className={input}
            />
            {err(`desc${i}`)}
          </div>
        </fieldset>
      ))}
      {lines.length < 10 ? (
        <button
          type="button"
          onClick={() => setLines((ls) => [...ls, { product: OTHER, description: '', qty: '' }])}
          className="text-sm underline"
        >
          + {b.addLine}
        </button>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="r-needed" className={label}>
            {b.fields.neededBy}
          </label>
          <input
            id="r-needed"
            type="date"
            value={neededBy}
            onChange={(e) => setNeededBy(e.target.value)}
            className={input}
          />
        </div>
      </div>
      <div className="space-y-1">
        <label htmlFor="r-custom" className={label}>
          {b.fields.customization}
        </label>
        <textarea
          id="r-custom"
          rows={3}
          value={customization}
          onChange={(e) => setCustomization(e.target.value)}
          className={input}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="r-notes" className={label}>
          {b.fields.notes}
        </label>
        <textarea
          id="r-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={input}
        />
      </div>

      <Turnstile key={turnstileKey} lang={lang} onToken={setToken} />
      {err('turnstile')}
      {formError ? (
        <p role="alert" className="rounded-md bg-danger/10 p-3 text-sm text-danger">
          <Text>{formError}</Text>
        </p>
      ) : null}
      <button
        type="submit"
        disabled={sending}
        className="rounded-md bg-walnut px-6 py-3 font-semibold text-cream disabled:opacity-50"
      >
        {sending ? b.sending : b.button}
      </button>
    </form>
  );
}
