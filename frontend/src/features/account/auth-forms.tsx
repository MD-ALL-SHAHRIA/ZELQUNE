'use client';

import { CheckCircle2, MailCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { type Locale } from '@/i18n/config';
import { fill } from '@/i18n/format';
import { FormNotice } from '@/features/legal/form-notice';
import { focusFirstInvalid } from '@/shared/lib/focus-invalid';
import { normalizePhone } from '@/shared/lib/forms';
import { href } from '@/shared/lib/site';
import { Button, ButtonLink } from '@/shared/ui/button';
import { Field, Input } from '@/shared/ui/field';
import { Turnstile } from '@/shared/ui/turnstile';
import { type AuthCopy, EMAIL, errorText, PasswordField, safeNext, SocialButtons } from './auth-ui';
import { ApiError, publicCall, refresh, reloadProfile, signedIn } from './session';

type Props = { lang: Locale; copy: AuthCopy; privacyLink: string; phoneError: string };
type Errors = Record<string, string | undefined>;
type TokenReply = { accessToken: string };

function FormError({ text }: { text: string | null }) {
  return text ? (
    <p role="alert" className="border-l-2 border-danger bg-danger/5 px-4 py-3 text-sm text-danger">
      {text}
    </p>
  ) : null;
}

function Done({
  icon,
  title,
  text,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div role="status" className="space-y-5">
      <span className="grid size-12 place-items-center rounded-full bg-cream text-walnut [&_svg]:size-6">
        {icon}
      </span>
      <h2 className="font-display text-3xl">{title}</h2>
      <p className="leading-relaxed text-stone">{text}</p>
      {children}
    </div>
  );
}

const linkCls = 'font-medium text-ink underline underline-offset-4';

/* ------------------------------------------------------------------------------------------ */

export function LoginForm({ lang, copy: c }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'), lang);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(() => {
    const code = params.get('error');
    return code ? errorText(new ApiError(400, code, code), c) : null;
  });
  const [unverified, setUnverified] = useState(false);
  const [resent, setResent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const found: Errors = {
      email: EMAIL.test(email.trim()) ? undefined : c.errors.emailInvalid,
      password: password ? undefined : c.errors.passwordMissing,
    };
    setErrors(found);
    setFormError(null);
    setUnverified(false);
    if (found.email || found.password) return focusFirstInvalid(form);
    setBusy(true);
    try {
      await signedIn(
        await publicCall<TokenReply>('/v1/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        }),
      );
      router.replace(next);
    } catch (err) {
      setUnverified(err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED');
      setFormError(errorText(err, c));
      setBusy(false);
    }
  }

  async function resend() {
    await publicCall('/v1/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email, lang }),
    }).catch(() => undefined);
    setResent(true);
  }

  return (
    <div className="space-y-7">
      <SocialButtons copy={c} lang={lang} next={next} />
      <form onSubmit={(e) => void submit(e)} noValidate className="space-y-5">
        <FormError text={formError} />
        {unverified ? (
          <p className="text-sm">
            {resent ? (
              c.resent
            ) : (
              <button type="button" onClick={() => void resend()} className={linkCls}>
                {c.resend}
              </button>
            )}
          </p>
        ) : null}
        <Field id="li-email" label={c.email} error={errors.email}>
          <Input
            id="li-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            aria-invalid={!!errors.email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <PasswordField
          id="li-password"
          label={c.password}
          value={password}
          onChange={setPassword}
          error={errors.password}
          autoComplete="current-password"
          copy={c}
        />
        <div className="flex justify-end">
          <Link
            href={href(lang, '/account/forgot-password')}
            className="text-sm text-stone underline-offset-4 hover:text-ink hover:underline"
          >
            {c.forgotLink}
          </Link>
        </div>
        <Button type="submit" size="lg" disabled={busy} className="w-full">
          {busy ? c.signingIn : c.loginButton}
        </Button>
      </form>
      <p className="text-sm text-stone">
        {c.noAccount}{' '}
        <Link
          href={`${href(lang, '/account/register')}?next=${encodeURIComponent(next)}`}
          className={linkCls}
        >
          {c.createLink}
        </Link>
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */

export function RegisterForm({ lang, copy: c, privacyLink, phoneError }: Props) {
  const next = safeNext(useSearchParams().get('next'), lang);
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const phone = normalizePhone(f.phone);
    const found: Errors = {
      name: f.name.trim().length >= 2 ? undefined : c.errors.nameShort,
      email: EMAIL.test(f.email.trim()) ? undefined : c.errors.emailInvalid,
      phone: phone ? undefined : phoneError,
      password: f.password.length >= 10 ? undefined : c.errors.passwordShort,
      turnstile: token ? undefined : c.errors.turnstile,
    };
    setErrors(found);
    setFormError(null);
    if (Object.values(found).some(Boolean)) return focusFirstInvalid(form);
    setBusy(true);
    try {
      await publicCall('/v1/auth/register', {
        method: 'POST',
        headers: { 'cf-turnstile-response': token },
        body: JSON.stringify({ name: f.name, email: f.email, phone, password: f.password, lang }),
      });
      setSentTo(f.email.trim().toLowerCase());
    } catch (err) {
      if (err instanceof ApiError && err.code === 'WEAK_PASSWORD') {
        setErrors({ password: c.errors.WEAK_PASSWORD });
        focusFirstInvalid(form);
      } else setFormError(errorText(err, c));
      setToken('');
      setTurnstileKey((k) => k + 1);
    }
    setBusy(false);
  }

  if (sentTo)
    return (
      <Done icon={<MailCheck />} title={c.checkTitle} text={fill(c.checkText, { email: sentTo })}>
        <p className="text-sm text-stone">
          {c.checkSpam}{' '}
          {resent ? (
            c.resent
          ) : (
            <button
              type="button"
              className={linkCls}
              onClick={() =>
                void publicCall('/v1/auth/resend-verification', {
                  method: 'POST',
                  body: JSON.stringify({ email: sentTo, lang }),
                })
                  .catch(() => undefined)
                  .then(() => setResent(true))
              }
            >
              {c.resend}
            </button>
          )}
        </p>
      </Done>
    );

  return (
    <div className="space-y-7">
      <SocialButtons copy={c} lang={lang} next={next} />
      <form onSubmit={(e) => void submit(e)} noValidate className="space-y-5">
        <FormError text={formError} />
        <Field id="rg-name" label={c.name} error={errors.name}>
          <Input
            id="rg-name"
            autoComplete="name"
            value={f.name}
            maxLength={80}
            aria-invalid={!!errors.name}
            onChange={(e) => set('name')(e.target.value)}
          />
        </Field>
        <Field id="rg-email" label={c.email} error={errors.email}>
          <Input
            id="rg-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={f.email}
            aria-invalid={!!errors.email}
            onChange={(e) => set('email')(e.target.value)}
          />
        </Field>
        <Field id="rg-phone" label={c.phone} error={errors.phone}>
          <Input
            id="rg-phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="01XXXXXXXXX"
            value={f.phone}
            aria-invalid={!!errors.phone}
            onChange={(e) => set('phone')(e.target.value)}
          />
        </Field>
        <PasswordField
          id="rg-password"
          label={c.password}
          value={f.password}
          onChange={set('password')}
          error={errors.password}
          hint={c.passwordHint}
          autoComplete="new-password"
          copy={c}
          meter
        />
        <div>
          <Turnstile key={turnstileKey} lang={lang} onToken={setToken} />
          {errors.turnstile ? <p className="mt-2 text-sm text-danger">{errors.turnstile}</p> : null}
        </div>
        <FormNotice lang={lang} text={c.notice} link={privacyLink} />
        <Button type="submit" size="lg" disabled={busy} className="w-full">
          {busy ? c.creating : c.registerButton}
        </Button>
      </form>
      <p className="text-sm text-stone">
        {c.haveAccount}{' '}
        <Link
          href={`${href(lang, '/account/login')}?next=${encodeURIComponent(next)}`}
          className={linkCls}
        >
          {c.signInLink}
        </Link>
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */

/** Reads #token= (never sent to any server), then forgets it from the address bar. */
function useFragmentToken(): string | null {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    const t = new URLSearchParams(window.location.hash.slice(1)).get('token');
    // After Next has synced its own history entry (same tick would be undone), drop the fragment
    // and keep Next's state object.
    const id = window.setTimeout(() =>
      history.replaceState(history.state, '', window.location.pathname + window.location.search),
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from the URL fragment
    setToken(t ?? '');
    return () => window.clearTimeout(id);
  }, []);
  return token;
}

export function VerifyView({ lang, copy: c }: Props) {
  const token = useFragmentToken();
  const [state, setState] = useState<'working' | 'ok' | 'failed'>('working');
  const [error, setError] = useState('');
  const once = useRef(false);
  useEffect(() => {
    if (token === null || once.current) return;
    once.current = true;
    publicCall<TokenReply>('/v1/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
      .then(signedIn)
      .then(() => setState('ok'))
      .catch((err: unknown) => {
        setError(errorText(err, c));
        setState('failed');
      });
  }, [token, c]);
  if (state === 'working')
    return (
      <p role="status" className="text-stone">
        {c.verifying}
      </p>
    );
  if (state === 'failed')
    return (
      <div className="space-y-5">
        <FormError text={error} />
        <ButtonLink href={href(lang, '/account/login')} variant="outline">
          {c.backToSignIn}
        </ButtonLink>
      </div>
    );
  return (
    <Done icon={<CheckCircle2 />} title={c.verifiedTitle} text={c.verifiedText}>
      <ButtonLink href={href(lang, '/account')} size="lg">
        {c.goAccount}
      </ButtonLink>
    </Done>
  );
}

/* ------------------------------------------------------------------------------------------ */

export function ForgotForm({ lang, copy: c }: Props) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const bad = !EMAIL.test(email.trim());
    setError(bad ? c.errors.emailInvalid : undefined);
    setFormError(!bad && !token ? c.errors.turnstile : null);
    if (bad) return focusFirstInvalid(form);
    if (!token) return;
    setBusy(true);
    try {
      await publicCall('/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'cf-turnstile-response': token },
        body: JSON.stringify({ email, lang }),
      });
      setSent(email.trim().toLowerCase());
    } catch (err) {
      setFormError(errorText(err, c));
      setToken('');
      setTurnstileKey((k) => k + 1);
    }
    setBusy(false);
  }

  if (sent)
    return (
      <Done icon={<MailCheck />} title={c.checkTitle} text={fill(c.forgotSent, { email: sent })}>
        <Link href={href(lang, '/account/login')} className={linkCls}>
          {c.backToSignIn}
        </Link>
      </Done>
    );
  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="space-y-5">
      <FormError text={formError} />
      <Field id="fp-email" label={c.email} error={error}>
        <Input
          id="fp-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          aria-invalid={!!error}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Turnstile key={turnstileKey} lang={lang} onToken={setToken} />
      <Button type="submit" size="lg" disabled={busy} className="w-full">
        {busy ? c.sending : c.forgotButton}
      </Button>
      <Link href={href(lang, '/account/login')} className="block text-sm text-stone hover:text-ink">
        {c.backToSignIn}
      </Link>
    </form>
  );
}

/* ------------------------------------------------------------------------------------------ */

export function ResetForm({ lang, copy: c }: Props) {
  const token = useFragmentToken();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const bad = password.length < 10;
    setError(bad ? c.errors.passwordShort : undefined);
    setFormError(null);
    if (bad) return focusFirstInvalid(form);
    setBusy(true);
    try {
      await publicCall('/v1/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'WEAK_PASSWORD') {
        setError(c.errors.WEAK_PASSWORD);
        focusFirstInvalid(form);
      } else setFormError(errorText(err, c));
    }
    setBusy(false);
  }

  if (done)
    return (
      <Done icon={<CheckCircle2 />} title={c.resetTitle} text={c.resetDone}>
        <ButtonLink href={href(lang, '/account/login')} size="lg">
          {c.loginButton}
        </ButtonLink>
      </Done>
    );
  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="space-y-5">
      <FormError text={token === '' ? c.errors.INVALID_LINK : formError} />
      <PasswordField
        id="rp-password"
        label={c.newPassword}
        value={password}
        onChange={setPassword}
        error={error}
        hint={c.passwordHint}
        autoComplete="new-password"
        copy={c}
        meter
      />
      <Button type="submit" size="lg" disabled={busy || !token} className="w-full">
        {busy ? c.saving : c.resetButton}
      </Button>
    </form>
  );
}

/* ------------------------------------------------------------------------------------------ */

export function CompleteForm({ lang, copy: c, privacyLink, phoneError }: Props) {
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'), lang);
  const [pending, setPending] = useState<{
    email: string;
    name: string | null;
    provider: string;
  } | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    publicCall<{ email: string; name: string | null; provider: string }>('/v1/auth/oauth/pending')
      .then((p) => {
        setPending(p);
        setName(p.name ?? '');
      })
      .catch((err: unknown) => setFormError(errorText(err, c)));
  }, [c]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const mobile = normalizePhone(phone);
    const found: Errors = {
      name: name.trim().length >= 2 ? undefined : c.errors.nameShort,
      phone: mobile ? undefined : phoneError,
    };
    setErrors(found);
    if (found.name || found.phone) return focusFirstInvalid(form);
    setBusy(true);
    try {
      await signedIn(
        await publicCall<TokenReply>('/v1/auth/oauth/complete', {
          method: 'POST',
          body: JSON.stringify({ name, phone: mobile }),
        }),
      );
      router.replace(next);
    } catch (err) {
      setFormError(errorText(err, c));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="space-y-5">
      {pending ? (
        <p className="bg-cream px-4 py-3 text-sm">
          {fill(c.completeVia, {
            provider: pending.provider === 'GOOGLE' ? 'Google' : 'Facebook',
            email: pending.email,
          })}
        </p>
      ) : null}
      <FormError text={formError} />
      <Field id="cp-name" label={c.name} error={errors.name}>
        <Input
          id="cp-name"
          autoComplete="name"
          value={name}
          maxLength={80}
          aria-invalid={!!errors.name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field id="cp-phone" label={c.phone} error={errors.phone}>
        <Input
          id="cp-phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="01XXXXXXXXX"
          value={phone}
          aria-invalid={!!errors.phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </Field>
      <FormNotice lang={lang} text={c.notice} link={privacyLink} />
      <Button type="submit" size="lg" disabled={busy || !pending} className="w-full">
        {busy ? c.creating : c.completeButton}
      </Button>
    </form>
  );
}

/* ------------------------------------------------------------------------------------------ */

/** Back from Google/Facebook: the session cookie is set; fetch a token and go on. */
export function SignedInRedirect({ lang, copy: c }: Props) {
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'), lang);
  useEffect(() => {
    void refresh().then(async (ok) => {
      if (!ok) return router.replace(`${href(lang, '/account/login')}?error=OAUTH_STATE`);
      await reloadProfile();
      router.replace(next);
    });
  }, [lang, next, router]);
  return (
    <p role="status" className="text-stone">
      {c.redirecting}
    </p>
  );
}
