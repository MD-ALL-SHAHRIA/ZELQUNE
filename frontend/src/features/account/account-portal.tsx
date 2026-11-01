'use client';

import { ArrowRight, Laptop, LogOut, ShieldCheck, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { type Locale } from '@/i18n/config';
import { fill, formatDate } from '@/i18n/format';
import { focusFirstInvalid } from '@/shared/lib/focus-invalid';
import { normalizePhone } from '@/shared/lib/forms';
import { href } from '@/shared/lib/site';
import { Button } from '@/shared/ui/button';
import { Field, Input } from '@/shared/ui/field';
import { Skeleton } from '@/shared/ui/skeleton';
import { type AuthCopy, errorText, PasswordField } from './auth-ui';
import { authed, type Customer, setCustomer, signOut } from './session';
import { useCustomer } from './use-customer';

type Session = {
  id: string;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string;
  current: boolean;
};

const providerName = (p: string) => (p === 'GOOGLE' ? 'Google' : 'Facebook');
function deviceName(ua: string | null, fallback: string): { label: string; phone: boolean } {
  if (!ua) return { label: fallback, phone: false };
  const os = /Android/.test(ua)
    ? 'Android'
    : /iPhone|iPad/.test(ua)
      ? 'iPhone'
      : /Mac OS/.test(ua)
        ? 'Mac'
        : /Windows/.test(ua)
          ? 'Windows'
          : /Linux/.test(ua)
            ? 'Linux'
            : '';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Firefox\//.test(ua)
      ? 'Firefox'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Safari\//.test(ua)
          ? 'Safari'
          : fallback;
  return { label: [browser, os].filter(Boolean).join(' · '), phone: /Android|iPhone/.test(ua) };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-6 border-t border-line pt-10">
      <h2 className="font-display text-[1.9rem] leading-tight">{title}</h2>
      {children}
    </section>
  );
}

/**
 * The customer's own page (ADR 0021): details, links to orders and requests, password and the
 * devices that are signed in. Signed-out visitors are sent to sign in and brought back here.
 */
export function AccountPortal({
  lang,
  copy: c,
  phoneError,
  links,
}: {
  lang: Locale;
  copy: AuthCopy;
  phoneError: string;
  links: { href: string; label: string }[];
}) {
  const router = useRouter();
  const state = useCustomer();
  useEffect(() => {
    if (state.status === 'signedOut')
      router.replace(
        `${href(lang, '/account/login')}?next=${encodeURIComponent(href(lang, '/account'))}`,
      );
  }, [state.status, router, lang]);

  if (state.status !== 'signedIn')
    return (
      <div role="status" aria-label={c.redirecting} className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  const me = state.customer;
  return (
    <div className="space-y-14">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="space-y-2">
          <p className="font-display text-[2.6rem] leading-tight">
            {fill(c.hello, { name: me.name ?? '' })}
          </p>
          <p className="flex items-center gap-2 text-stone">
            {me.email}
            {me.emailVerified ? (
              <span className="inline-flex items-center gap-1 text-xs text-walnut">
                <ShieldCheck className="size-3.5" aria-hidden /> {c.verified}
              </span>
            ) : null}
          </p>
          {me.providers.length ? (
            <p className="text-sm text-stone">
              {fill(c.linkedWith, { providers: me.providers.map(providerName).join(', ') })}
            </p>
          ) : null}
        </div>
        <Button
          variant="outline"
          onClick={() => void signOut().then(() => router.replace(href(lang, '/')))}
        >
          <LogOut className="size-4" aria-hidden /> {c.signOut}
        </Button>
      </div>

      <Section title={c.activityHeading}>
        <ul className="grid gap-px border border-line bg-line sm:grid-cols-2">
          {links.map((l) => (
            <li key={l.href} className="flex">
              <Link
                href={l.href}
                className="group flex w-full items-center justify-between gap-6 bg-paper p-6 transition-colors hover:bg-cream"
              >
                <span className="font-display text-2xl">{l.label}</span>
                <ArrowRight
                  className="size-5 transition-transform group-hover:translate-x-1"
                  strokeWidth={1.2}
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={c.profileHeading}>
        <Profile me={me} copy={c} phoneError={phoneError} />
      </Section>

      <Section title={c.securityHeading}>
        <PasswordChange me={me} copy={c} />
        <Devices lang={lang} copy={c} />
      </Section>
    </div>
  );
}

function Profile({
  me,
  copy: c,
  phoneError,
}: {
  me: Customer;
  copy: AuthCopy;
  phoneError: string;
}) {
  const [name, setName] = useState(me.name ?? '');
  const [phone, setPhone] = useState(me.phone.replace(/^\+88/, ''));
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const mobile = normalizePhone(phone);
    const found = {
      name: name.trim().length >= 2 ? undefined : c.errors.nameShort,
      phone: mobile ? undefined : phoneError,
    };
    setErrors(found);
    setMsg(null);
    if (found.name || found.phone) return focusFirstInvalid(form);
    setBusy(true);
    try {
      setCustomer(
        await authed<Customer>('/v1/auth/me', {
          method: 'PUT',
          body: JSON.stringify({ name, phone: mobile }),
        }),
      );
      setMsg({ ok: true, text: c.saved });
    } catch (err) {
      setMsg({ ok: false, text: errorText(err, c) });
    }
    setBusy(false);
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      noValidate
      className="grid max-w-2xl gap-5 sm:grid-cols-2"
    >
      <Field id="pf-name" label={c.name} error={errors.name}>
        <Input
          id="pf-name"
          autoComplete="name"
          value={name}
          maxLength={80}
          aria-invalid={!!errors.name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field id="pf-phone" label={c.phone} error={errors.phone}>
        <Input
          id="pf-phone"
          type="tel"
          autoComplete="tel"
          value={phone}
          aria-invalid={!!errors.phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </Field>
      <Field id="pf-email" label={c.email} hint={c.emailNote} className="sm:col-span-2">
        <Input id="pf-email" value={me.email ?? ''} readOnly className="text-stone" />
      </Field>
      <div className="flex items-center gap-4 sm:col-span-2">
        <Button type="submit" disabled={busy}>
          {busy ? c.saving : c.save}
        </Button>
        {msg ? (
          <p
            role={msg.ok ? 'status' : 'alert'}
            className={msg.ok ? 'text-sm text-walnut' : 'text-sm text-danger'}
          >
            {msg.text}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function PasswordChange({ me, copy: c }: { me: Customer; copy: AuthCopy }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setMsg(null);
    if (next.length < 10) {
      setError(c.errors.passwordShort);
      return focusFirstInvalid(form);
    }
    setError(undefined);
    setBusy(true);
    try {
      await authed('/v1/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      setCurrent('');
      setNext('');
      setMsg({ ok: true, text: c.passwordChanged });
      if (!me.hasPassword) setCustomer({ ...me, hasPassword: true });
    } catch (err) {
      setMsg({ ok: false, text: errorText(err, c) });
    }
    setBusy(false);
  }

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="max-w-md space-y-5">
      <h3 className="font-medium">{me.hasPassword ? c.changePassword : c.setPassword}</h3>
      {!me.hasPassword ? (
        <p className="text-sm text-stone">
          {fill(c.setPasswordText, { providers: me.providers.map(providerName).join(', ') })}
        </p>
      ) : (
        <PasswordField
          id="pw-current"
          label={c.currentPassword}
          value={current}
          onChange={setCurrent}
          autoComplete="current-password"
          copy={c}
        />
      )}
      <PasswordField
        id="pw-new"
        label={c.newPassword}
        value={next}
        onChange={setNext}
        error={error}
        hint={c.passwordHint}
        autoComplete="new-password"
        copy={c}
        meter
      />
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={busy}>
          {busy ? c.saving : me.hasPassword ? c.changePassword : c.setPassword}
        </Button>
        {msg ? (
          <p
            role={msg.ok ? 'status' : 'alert'}
            className={msg.ok ? 'text-sm text-walnut' : 'text-sm text-danger'}
          >
            {msg.text}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function Devices({ lang, copy: c }: { lang: Locale; copy: AuthCopy }) {
  const [items, setItems] = useState<Session[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(() => {
    void authed<{ items: Session[] }>('/v1/auth/sessions')
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  }, []);
  useEffect(load, [load]);

  return (
    <div className="space-y-4">
      <h3 className="font-medium">{c.devicesHeading}</h3>
      {!items ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {items.map((s) => {
            const d = deviceName(s.userAgent, c.unknownDevice);
            const Icon = d.phone ? Smartphone : Laptop;
            return (
              <li key={s.id} className="flex items-center gap-4 py-4">
                <Icon className="size-5 shrink-0 text-walnut" strokeWidth={1.3} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{d.label}</p>
                  <p className="text-sm text-stone">
                    {s.current
                      ? c.thisDevice
                      : fill(c.lastActive, { when: formatDate(s.lastUsedAt, lang) })}
                  </p>
                </div>
                {!s.current ? (
                  <button
                    type="button"
                    className="text-sm underline underline-offset-4"
                    onClick={() =>
                      void authed(`/v1/auth/sessions/${s.id}`, { method: 'DELETE' }).then(load)
                    }
                  >
                    {c.signOutDevice}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {items && items.length > 1 ? (
        <Button
          variant="outline"
          onClick={() =>
            void authed('/v1/auth/sessions/revoke-others', { method: 'POST' }).then(() => {
              setMsg(c.signedOutOthers);
              load();
            })
          }
        >
          {c.signOutOthers}
        </Button>
      ) : null}
      {msg ? (
        <p role="status" className="text-sm text-walnut">
          {msg}
        </p>
      ) : null}
    </div>
  );
}
