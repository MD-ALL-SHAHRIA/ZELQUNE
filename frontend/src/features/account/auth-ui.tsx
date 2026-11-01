'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { cn } from '@/shared/lib/cn';
import { Field, Input } from '@/shared/ui/field';
import { ApiError, oauthUrl, publicCall } from './session';

export type AuthCopy = Dictionary['auth'];

/** The message for an API error: its code when we know it, else whose fault and what to do. */
export function errorText(err: unknown, c: AuthCopy): string {
  const e = c.errors as Record<string, string>;
  if (err instanceof ApiError) {
    if (err.code === 'TOO_MANY_REQUESTS' || err.status === 429)
      return e[err.code] ?? e.TOO_MANY_REQUESTS ?? e.generic!;
    return e[err.code] ?? (err.status >= 500 || err.status === 0 ? e.generic! : e.generic!);
  }
  return e.generic!;
}

/** 0..3: length first (NIST), variety as a small bonus. */
export function strength(pw: string): 0 | 1 | 2 | 3 {
  if (pw.length < 10) return 0;
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^\w]/, /\s/].filter((r) => r.test(pw)).length;
  if (pw.length >= 16 || (pw.length >= 12 && kinds >= 3)) return 3;
  if (pw.length >= 12 || kinds >= 3) return 2;
  return 1;
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  autoComplete,
  copy,
  meter,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  autoComplete: 'current-password' | 'new-password';
  copy: AuthCopy;
  meter?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const level = strength(value);
  return (
    <Field id={id} label={label} error={error} hint={hint}>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          maxLength={128}
          aria-invalid={!!error}
          onChange={(e) => onChange(e.target.value)}
          className="pr-11"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? copy.hide : copy.show}
          aria-pressed={visible}
          className="absolute top-1/2 right-0 grid size-10 -translate-y-1/2 place-items-center text-stone hover:text-ink"
        >
          {visible ? (
            <EyeOff className="size-4" aria-hidden />
          ) : (
            <Eye className="size-4" aria-hidden />
          )}
        </button>
      </div>
      {meter && value ? (
        <div className="flex items-center gap-3 pt-1" aria-live="polite">
          <div aria-hidden className="grid flex-1 grid-cols-3 gap-1">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={cn(
                  'h-1 transition-colors duration-300',
                  level >= n ? (level === 1 ? 'bg-amber' : 'bg-walnut') : 'bg-line',
                )}
              />
            ))}
          </div>
          <span className="w-20 text-right text-xs text-stone">{copy.strength[level]}</span>
        </div>
      ) : null}
    </Field>
  );
}

const GoogleMark = () => (
  <svg aria-hidden viewBox="0 0 48 48" className="size-5">
    <path
      fill="#FFC107"
      d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"
    />
    <path
      fill="#FF3D00"
      d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.3-.4-3.5z"
    />
  </svg>
);
const FacebookMark = () => (
  <svg aria-hidden viewBox="0 0 24 24" className="size-5">
    <path
      fill="#1877F2"
      d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z"
    />
  </svg>
);

/** Google / Facebook buttons, shown only for the providers the owner has switched on. */
export function SocialButtons({
  copy,
  lang,
  next,
}: {
  copy: AuthCopy;
  lang: string;
  next: string;
}) {
  const [providers, setProviders] = useState<string[]>([]);
  const id = useId();
  useEffect(() => {
    publicCall<{ providers: string[] }>('/v1/auth/providers')
      .then((r) => setProviders(r.providers))
      .catch(() => setProviders([]));
  }, []);
  if (!providers.length) return null;
  const btn =
    'flex h-12 w-full items-center justify-center gap-3 border border-line bg-paper text-[0.92rem] font-medium transition-colors hover:border-ink';
  return (
    <div className="space-y-3">
      {providers.includes('GOOGLE') ? (
        <a href={oauthUrl('google', lang, next)} className={btn}>
          <GoogleMark /> {copy.google}
        </a>
      ) : null}
      {providers.includes('FACEBOOK') ? (
        <a href={oauthUrl('facebook', lang, next)} className={btn}>
          <FacebookMark /> {copy.facebook}
        </a>
      ) : null}
      <div
        className="flex items-center gap-4 pt-3 text-xs uppercase tracking-[0.2em] text-stone"
        id={id}
      >
        <span className="h-px flex-1 bg-line" />
        {copy.or}
        <span className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}

/** `?next=` only ever points inside this site. */
export function safeNext(raw: string | null, lang: string): string {
  return raw && /^\/(?!\/)[\w\-./?=&%]*$/.test(raw) ? raw : `/${lang}/account`;
}

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
