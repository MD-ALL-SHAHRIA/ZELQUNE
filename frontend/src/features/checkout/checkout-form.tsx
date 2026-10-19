'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useCart } from '@/components/cart/cart-context';
import { Text } from '@/components/text';
import { Turnstile } from '@/components/turnstile';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { fill, formatTaka } from '@/i18n/format';
import { api, ok, visitor } from '@/lib/api-browser';
import { type CheckoutQuote, type District, type PaymentMethod } from '@/lib/api-types';
import { checkoutErrorText, normalizePhone, normalizeTrxId } from '@/lib/forms';
import { LAST_ORDER_KEY, type LastOrder } from '@/lib/last-order';
import { href } from '@/lib/site';

export const INITIATE_CHECKOUT_EVENT = 'zq:initiate-checkout';

type Copy = Pick<Dictionary, 'checkout' | 'ui'> & { cartEmpty: string; shop: string };

interface Fields {
  name: string;
  phone: string;
  district: string;
  area: string;
  line: string;
  note: string;
  trxId: string;
}
type FieldErrors = Partial<Record<keyof Fields | 'turnstile', string>>;

const EMPTY: Fields = {
  name: '',
  phone: '',
  district: '',
  area: '',
  line: '',
  note: '',
  trxId: '',
};

export function CheckoutForm({
  lang,
  districts,
  copy,
}: {
  lang: Locale;
  districts: District[];
  copy: Copy;
}) {
  const router = useRouter();
  const { cart, cartToken, forget } = useCart();
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileKey, setTurnstileKey] = useState(0);
  // One Idempotency-Key per distinct order attempt: a retry of the same payload reuses it.
  const attempt = useRef<{ key: string; payload: string } | null>(null);
  const announced = useRef(false);

  const items = cart?.items ?? [];
  const c = copy.checkout;

  useEffect(() => {
    if (announced.current || !cart?.items.length) return;
    announced.current = true;
    window.dispatchEvent(
      new CustomEvent(INITIATE_CHECKOUT_EVENT, { detail: { valuePaisa: cart.subtotalPaisa } }),
    );
  }, [cart]);

  // Delivery fee, totals, advance and allowed payment methods for the chosen address.
  useEffect(() => {
    const token = cartToken();
    const area = fields.area.trim();
    if (!token || !fields.district || area.length < 2 || !cart?.items.length) return;
    const timer = setTimeout(() => {
      api
        .POST('/v1/carts/current/quote', {
          params: { header: { 'x-cart-token': token } },
          body: { district: fields.district, area },
        })
        .then((r) => {
          const next = ok(r);
          setQuote(next);
          setMethod((m) =>
            m && next.allowedPaymentMethods.includes(m)
              ? m
              : (next.allowedPaymentMethods[0] ?? null),
          );
        })
        .catch(() => setQuote(null));
    }, 350);
    return () => clearTimeout(timer);
  }, [fields.district, fields.area, cart, cartToken]);

  if (!cart || !items.length) {
    return (
      <div className="space-y-4">
        <p>{copy.cartEmpty}</p>
        <Link href={href(lang, '/shop')} className="underline">
          {copy.shop}
        </Link>
      </div>
    );
  }

  const set = (key: keyof Fields) => (e: { target: { value: string } }) =>
    setFields((f) => ({ ...f, [key]: e.target.value }));

  const advanceMethod = method === 'BKASH_MANUAL' || method === 'NAGAD_MANUAL';
  const instructions =
    method === 'BKASH_MANUAL'
      ? quote?.paymentInstructions.bkash
      : method === 'NAGAD_MANUAL'
        ? quote?.paymentInstructions.nagad
        : undefined;

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (fields.name.trim().length < 2) next.name = c.errors.required;
    if (!normalizePhone(fields.phone)) next.phone = c.errors.phone;
    if (!fields.district) next.district = c.errors.required;
    if (fields.area.trim().length < 2) next.area = c.errors.required;
    if (fields.line.trim().length < 5) next.line = c.errors.line;
    if (advanceMethod && !normalizeTrxId(fields.trxId)) next.trxId = c.errors.trxRequired;
    if (!turnstileToken) next.turnstile = c.errors.turnstile;
    return next;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const found = validate();
    setErrors(found);
    const token = cartToken();
    if (Object.keys(found).length || !method || !quote || !token) return;

    const { sessionId, utm } = visitor();
    const body = {
      customer: { name: fields.name.trim(), phone: normalizePhone(fields.phone) ?? fields.phone },
      address: {
        district: fields.district,
        area: fields.area.trim(),
        line: fields.line.trim(),
        ...(fields.note.trim() ? { note: fields.note.trim() } : {}),
      },
      paymentMethod: method,
      ...(advanceMethod ? { trxId: normalizeTrxId(fields.trxId) ?? fields.trxId } : {}),
      ...(utm ? { utm } : {}),
      ...(sessionId ? { sessionId } : {}),
    };
    const payload = JSON.stringify(body);
    if (attempt.current?.payload !== payload) {
      attempt.current = { key: crypto.randomUUID(), payload };
    }

    setSending(true);
    try {
      const placed = ok(
        await api.POST('/v1/checkout', {
          params: {
            header: {
              'x-cart-token': token,
              'idempotency-key': attempt.current.key,
              'cf-turnstile-response': turnstileToken,
            },
          },
          body,
        }),
      );
      const last: LastOrder = {
        code: placed.orderCode,
        totalPaisa: placed.totals.totalPaisa,
        currency: 'BDT',
      };
      try {
        sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(last));
      } catch {
        // Private mode: the success page simply skips the Purchase event.
      }
      forget();
      router.push(href(lang, `/order/${placed.orderCode}`));
    } catch (error) {
      setFormError(checkoutErrorText(error, c.errors));
      // Turnstile tokens are single-use.
      setTurnstileToken('');
      setTurnstileKey((k) => k + 1);
      setSending(false);
    }
  }

  const input =
    'w-full rounded-md border border-line bg-surface px-3 py-2.5 aria-[invalid=true]:border-danger';
  const field = (key: keyof Fields, label: string, props: React.ComponentProps<'input'> = {}) => (
    <div className="space-y-1">
      <label htmlFor={`f-${key}`} className="block text-sm font-semibold">
        {label}
      </label>
      <input
        id={`f-${key}`}
        name={key}
        value={fields[key]}
        onChange={set(key)}
        aria-invalid={!!errors[key]}
        aria-describedby={errors[key] ? `e-${key}` : undefined}
        className={input}
        {...props}
      />
      {errors[key] ? (
        <p id={`e-${key}`} className="text-sm text-danger">
          {errors[key]}
        </p>
      ) : null}
    </div>
  );

  const sorted = [...districts].sort((a, b) =>
    (lang === 'bn' ? a.nameBn : a.nameEn).localeCompare(lang === 'bn' ? b.nameBn : b.nameEn),
  );
  const payLater = quote ? quote.totalPaisa - quote.advanceRequiredPaisa : 0;

  return (
    <form onSubmit={submit} noValidate className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-8">
        <fieldset className="space-y-4">
          <legend className="mb-2 text-xl font-semibold text-walnut">{c.sections.details}</legend>
          {field('name', c.fields.name, { autoComplete: 'name' })}
          {field('phone', c.fields.phone, {
            type: 'tel',
            inputMode: 'tel',
            autoComplete: 'tel',
            placeholder: '01XXXXXXXXX',
          })}
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-2 text-xl font-semibold text-walnut">{c.sections.address}</legend>
          <div className="space-y-1">
            <label htmlFor="f-district" className="block text-sm font-semibold">
              {c.fields.district}
            </label>
            <select
              id="f-district"
              name="district"
              value={fields.district}
              onChange={set('district')}
              aria-invalid={!!errors.district}
              className={input}
            >
              <option value="">—</option>
              {sorted.map((d) => (
                <option key={d.code} value={d.code}>
                  {lang === 'bn' ? d.nameBn : d.nameEn}
                </option>
              ))}
            </select>
            {errors.district ? <p className="text-sm text-danger">{errors.district}</p> : null}
          </div>
          {field('area', c.fields.area, { autoComplete: 'address-level3' })}
          {field('line', c.fields.line, { autoComplete: 'street-address' })}
          {field('note', c.fields.note)}
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-2 text-xl font-semibold text-walnut">{c.sections.payment}</legend>
          {!quote ? (
            <p className="text-sm text-muted">{c.feePending}</p>
          ) : !quote.allowedPaymentMethods.length ? (
            // No payment method configured for this cart (e.g. bKash/Nagad numbers missing).
            <p role="alert" className="rounded-md bg-danger/10 p-3 text-sm text-danger">
              <Text>{c.errors.generic}</Text>
            </p>
          ) : (
            <>
              <div className="space-y-2">
                {quote.allowedPaymentMethods.map((m) => (
                  <label
                    key={m}
                    className="flex cursor-pointer items-center gap-3 rounded-md border border-line bg-surface p-3 has-[:checked]:border-walnut has-[:checked]:ring-1 has-[:checked]:ring-walnut"
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={m}
                      checked={method === m}
                      onChange={() => setMethod(m)}
                    />
                    <span>{c.methods[m]}</span>
                  </label>
                ))}
              </div>
              {advanceMethod && instructions ? (
                <div className="space-y-3 rounded-lg border border-amber bg-amber/15 p-4">
                  <p className="font-semibold">{c.advanceHeading}</p>
                  <p data-testid="advance-instructions">
                    <Text>
                      {fill(c.advanceText, {
                        amount: formatTaka(quote.advanceRequiredPaisa, lang),
                        number: instructions.number,
                      })}
                    </Text>
                  </p>
                  {field('trxId', c.trxId, { autoComplete: 'off', autoCapitalize: 'characters' })}
                </div>
              ) : null}
              {method === 'COD' ? <p className="text-sm">{c.codText}</p> : null}
            </>
          )}
        </fieldset>
      </div>

      <aside className="h-fit space-y-4 rounded-lg bg-surface p-4 ring-1 ring-line lg:sticky lg:top-28">
        <h2 className="text-xl font-semibold text-walnut">{c.sections.summary}</h2>
        <dl className="space-y-2" data-testid="summary">
          <div className="flex justify-between">
            <dt>{c.summary.items}</dt>
            <dd>{formatTaka(quote?.subtotalPaisa ?? cart.subtotalPaisa, lang)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>{c.summary.delivery}</dt>
            <dd>{quote ? formatTaka(quote.shippingFeePaisa, lang) : '—'}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-lg font-semibold">
            <dt>{c.summary.total}</dt>
            <dd data-testid="total">{quote ? formatTaka(quote.totalPaisa, lang) : '—'}</dd>
          </div>
          {quote && quote.advanceRequiredPaisa > 0 ? (
            <>
              <div className="flex justify-between">
                <dt>{c.summary.payNow}</dt>
                <dd data-testid="pay-now">{formatTaka(quote.advanceRequiredPaisa, lang)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>{c.summary.payOnDelivery}</dt>
                <dd>{formatTaka(payLater, lang)}</dd>
              </div>
            </>
          ) : null}
        </dl>
        <Turnstile key={turnstileKey} lang={lang} onToken={setTurnstileToken} />
        {errors.turnstile ? <p className="text-sm text-danger">{errors.turnstile}</p> : null}
        {formError ? (
          <p role="alert" className="rounded-md bg-danger/10 p-3 text-sm text-danger">
            <Text>{formError}</Text>
          </p>
        ) : null}
        <button
          type="submit"
          disabled={sending || !quote}
          className="w-full rounded-md bg-walnut px-6 py-3 font-semibold text-cream disabled:opacity-50"
        >
          {sending ? c.sending : c.placeOrder}
        </button>
      </aside>
    </form>
  );
}
