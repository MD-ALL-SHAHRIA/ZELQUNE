'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { SAMPLE } from '@/content/sample-images';
import { checkoutStarted, orderPlaced } from '@/features/analytics/events';
import { forgetCart } from '@/features/cart/cart-thunks';
import { useCart } from '@/features/cart/use-cart';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { fill, formatNumber, formatTaka } from '@/i18n/format';
import { toApiError } from '@/shared/api/errors';
import { type CheckoutQuote, type District, type PaymentMethod } from '@/shared/api/types';
import { checkoutErrorText, normalizePhone, normalizeTrxId } from '@/shared/lib/forms';
import { href } from '@/shared/lib/site';
import { visitor } from '@/shared/lib/visitor-client';
import { Button, ButtonLink } from '@/shared/ui/button';
import { CopyText } from '@/shared/ui/copy-text';
import { Field, Input, Select } from '@/shared/ui/field';
import { Turnstile } from '@/shared/ui/turnstile';
import { useCheckoutMutation, useCheckoutQuoteMutation } from '@/store/api';
import { useAppDispatch } from '@/store/hooks';

type Copy = Pick<Dictionary, 'checkout' | 'ui' | 'cart' | 'products' | 'product'>;

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
  const dispatch = useAppDispatch();
  const { cart, token } = useCart();
  const [requestQuote] = useCheckoutQuoteMutation();
  const [placeOrder, { isLoading: sending }] = useCheckoutMutation();
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileKey, setTurnstileKey] = useState(0);
  // One Idempotency-Key per distinct order attempt: a retry of the same payload reuses it.
  const attempt = useRef<{ key: string; payload: string } | null>(null);
  const announced = useRef(false);
  const c = copy.checkout;
  const items = cart?.items ?? [];

  useEffect(() => {
    if (announced.current || !cart?.items.length) return;
    announced.current = true;
    dispatch(checkoutStarted({ valuePaisa: cart.subtotalPaisa }));
  }, [cart, dispatch]);

  // Delivery fee, totals, advance and allowed payment methods for the chosen address.
  useEffect(() => {
    const area = fields.area.trim();
    if (!token || !fields.district || area.length < 2 || !cart?.items.length) return;
    const timer = setTimeout(() => {
      requestQuote({ 'x-cart-token': token, quoteRequestDto: { district: fields.district, area } })
        .unwrap()
        .then((next) => {
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
  }, [fields.district, fields.area, cart, token, requestQuote]);

  if (!cart || !items.length) {
    return (
      <div className="space-y-6 py-10">
        <p className="font-display text-3xl font-medium">{c.emptyCart}</p>
        <ButtonLink href={href(lang, '/shop')} variant="outline">
          {copy.cart.keepBrowsing}
        </ButtonLink>
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

    try {
      const placed = await placeOrder({
        'idempotency-key': attempt.current.key,
        'x-cart-token': token,
        'cf-turnstile-response': turnstileToken,
        checkoutRequestDto: body,
      }).unwrap();
      dispatch(orderPlaced({ code: placed.orderCode, totalPaisa: placed.totals.totalPaisa }));
      dispatch(forgetCart());
      router.push(href(lang, `/order/${placed.orderCode}`));
    } catch (error) {
      setFormError(checkoutErrorText(toApiError(error), c.errors));
      // Turnstile tokens are single-use.
      setTurnstileToken('');
      setTurnstileKey((k) => k + 1);
    }
  }

  const field = (key: keyof Fields, label: string, props: React.ComponentProps<'input'> = {}) => (
    <Field id={`f-${key}`} label={label} error={errors[key]}>
      <Input
        id={`f-${key}`}
        name={key}
        value={fields[key]}
        onChange={set(key)}
        aria-invalid={!!errors[key]}
        {...props}
      />
    </Field>
  );
  const sorted = [...districts].sort((a, b) =>
    (lang === 'bn' ? a.nameBn : a.nameEn).localeCompare(lang === 'bn' ? b.nameBn : b.nameEn),
  );
  const payLater = quote ? quote.totalPaisa - quote.advanceRequiredPaisa : 0;
  const section = (n: number, title: string) => (
    <legend className="mb-6 flex items-baseline gap-4">
      <span className="font-display text-2xl font-medium italic text-walnut">
        {formatNumber(n, lang)}
      </span>
      <span className="font-display text-3xl font-medium">{title}</span>
    </legend>
  );

  return (
    <form onSubmit={submit} noValidate className="grid gap-14 lg:grid-cols-[1.25fr_1fr] lg:gap-20">
      <div className="space-y-14">
        <fieldset className="space-y-6">
          {section(1, c.sections.details)}
          <div className="grid gap-6 sm:grid-cols-2">
            {field('name', c.fields.name, { autoComplete: 'name' })}
            {field('phone', c.fields.phone, {
              type: 'tel',
              inputMode: 'tel',
              autoComplete: 'tel',
              placeholder: '01XXXXXXXXX',
            })}
          </div>
        </fieldset>

        <fieldset className="space-y-6">
          {section(2, c.sections.address)}
          <div className="grid gap-6 sm:grid-cols-2">
            <Field id="f-district" label={c.fields.district} error={errors.district}>
              <Select
                id="f-district"
                name="district"
                value={fields.district}
                onChange={set('district')}
                aria-invalid={!!errors.district}
              >
                <option value="">—</option>
                {sorted.map((d) => (
                  <option key={d.code} value={d.code}>
                    {lang === 'bn' ? d.nameBn : d.nameEn}
                  </option>
                ))}
              </Select>
            </Field>
            {field('area', c.fields.area, { autoComplete: 'address-level3' })}
          </div>
          {field('line', c.fields.line, { autoComplete: 'street-address' })}
          {field('note', c.fields.note)}
        </fieldset>

        <fieldset className="space-y-6">
          {section(3, c.sections.payment)}
          {!quote ? (
            <p className="text-sm text-stone">{c.feePending}</p>
          ) : !quote.allowedPaymentMethods.length ? (
            <p role="alert" className="bg-danger/10 p-4 text-sm text-danger">
              <CopyText>{c.errors.generic}</CopyText>
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {quote.allowedPaymentMethods.map((m) => (
                  <label
                    key={m}
                    className="flex cursor-pointer items-center gap-3 border border-line bg-surface px-5 py-4 transition has-[:checked]:border-ink"
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={m}
                      checked={method === m}
                      onChange={() => setMethod(m)}
                      className="accent-ink"
                    />
                    <span>{c.methods[m]}</span>
                  </label>
                ))}
              </div>
              {advanceMethod && instructions ? (
                <div className="space-y-5 border-l-2 border-amber bg-glow/25 px-6 py-5">
                  <p className="text-[0.7rem] font-medium uppercase tracking-eyebrow text-walnut [:lang(bn)_&]:text-sm [:lang(bn)_&]:tracking-normal">
                    {c.advanceHeading}
                  </p>
                  <p data-testid="advance-instructions" className="leading-relaxed">
                    <CopyText>
                      {fill(c.advanceText, {
                        amount: formatTaka(quote.advanceRequiredPaisa, lang),
                        number: instructions.number,
                      })}
                    </CopyText>
                  </p>
                  {field('trxId', c.trxId, { autoComplete: 'off', autoCapitalize: 'characters' })}
                </div>
              ) : null}
              {method === 'COD' ? <p className="text-sm text-stone">{c.codText}</p> : null}
            </>
          )}
        </fieldset>
      </div>

      <aside className="h-fit space-y-6 bg-cream/70 p-6 sm:p-8 lg:sticky lg:top-28">
        <h2 className="font-display text-3xl font-medium">{c.sections.summary}</h2>
        <ul className="space-y-4 border-b border-line pb-6">
          {items.map((item) => (
            <li key={item.variantId} className="flex items-center gap-4">
              <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-t-full bg-sand">
                <Image src={SAMPLE.zenith.src} alt="" fill sizes="64px" className="object-cover" />
              </div>
              <div className="flex-1 text-sm">
                <p className="font-display text-lg font-medium leading-tight">
                  {(item.productSlug && copy.products[item.productSlug]?.name) ??
                    (lang === 'bn' ? item.nameBn : item.nameEn)}
                </p>
                <p className="text-stone">
                  {Object.values(item.options)
                    .filter((v): v is string => typeof v === 'string')
                    .map((v) => copy.product.variants[v] ?? v)
                    .join(', ')}{' '}
                  × {formatNumber(item.qty, lang)}
                </p>
              </div>
              <p className="text-sm">
                {item.lineTotalPaisa === null ? '' : formatTaka(item.lineTotalPaisa, lang)}
              </p>
            </li>
          ))}
        </ul>
        <dl className="space-y-3 text-sm" data-testid="summary">
          <div className="flex justify-between">
            <dt className="text-stone">{c.summary.items}</dt>
            <dd>{formatTaka(quote?.subtotalPaisa ?? cart.subtotalPaisa, lang)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-stone">{c.summary.delivery}</dt>
            <dd>{quote ? formatTaka(quote.shippingFeePaisa, lang) : '—'}</dd>
          </div>
          <div className="flex items-baseline justify-between border-t border-line pt-4">
            <dt className="text-[0.7rem] uppercase tracking-eyebrow">{c.summary.total}</dt>
            <dd data-testid="total" className="font-display text-3xl font-medium">
              {quote ? formatTaka(quote.totalPaisa, lang) : '—'}
            </dd>
          </div>
          {quote && quote.advanceRequiredPaisa > 0 ? (
            <>
              <div className="flex justify-between font-medium">
                <dt>{c.summary.payNow}</dt>
                <dd data-testid="pay-now">{formatTaka(quote.advanceRequiredPaisa, lang)}</dd>
              </div>
              <div className="flex justify-between text-stone">
                <dt>{c.summary.payOnDelivery}</dt>
                <dd>{formatTaka(payLater, lang)}</dd>
              </div>
            </>
          ) : null}
        </dl>
        <Turnstile key={turnstileKey} lang={lang} onToken={setTurnstileToken} />
        {errors.turnstile ? <p className="text-sm text-danger">{errors.turnstile}</p> : null}
        {formError ? (
          <p role="alert" className="bg-danger/10 p-4 text-sm text-danger">
            <CopyText>{formError}</CopyText>
          </p>
        ) : null}
        <Button type="submit" size="lg" disabled={sending || !quote} className="w-full">
          {sending ? c.sending : c.placeOrder}
        </Button>
      </aside>
    </form>
  );
}
