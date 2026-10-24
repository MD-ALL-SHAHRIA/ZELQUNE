'use client';

import { CircleAlert, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { useAuth } from '@/lib/auth';

const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3100';

export default function LoginPage() {
  const { state, signIn } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (state.status === 'signedIn') router.replace('/');
  }, [state.status, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(await signIn(phone.trim(), password));
    setBusy(false);
  };

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-espresso lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element -- the store's own scene, decorative */}
        <img
          src={`${site}/images/hero/moon-v2.webp`}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[70%_50%] opacity-90"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(43,30,25,.15),rgba(43,30,25,.75))]" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-ivory">
          <p className="font-wordmark text-2xl font-semibold tracking-[0.3em] uppercase">Zelqune</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-ivory/80">
            Orders, products and the store front, in one calm place.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center px-6 py-12">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="mb-8">
            <span className="grid size-10 place-items-center rounded-xl bg-ink font-wordmark text-lg font-semibold text-paper lg:hidden">
              Z
            </span>
            <h1 className="mt-6 text-2xl font-semibold tracking-[-0.02em] lg:mt-0">Sign in</h1>
            <p className="mt-1 text-sm text-stone">
              Welcome back. Use your admin phone and password.
            </p>
          </div>
          {error ? (
            <p
              role="alert"
              className="mb-5 flex items-start gap-2 rounded-lg bg-danger/8 px-3 py-2.5 text-sm text-danger ring-1 ring-danger/20"
            >
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
            </p>
          ) : null}
          <div className="space-y-4">
            <Field label="Phone">
              <Input
                name="phone"
                type="tel"
                autoComplete="username"
                inputMode="tel"
                placeholder="01XXXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoFocus
                className="h-10"
              />
            </Field>
            <Field label="Password">
              <div className="relative">
                <Input
                  name="password"
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  aria-label={show ? 'Hide password' : 'Show password'}
                  onClick={() => setShow((s) => !s)}
                  className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-stone hover:text-ink"
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>
          </div>
          <Button type="submit" className="mt-6 h-10 w-full" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : null}
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
          <p className="mt-6 text-center text-xs text-stone">For Zelqune owners and staff only.</p>
        </form>
      </div>
    </main>
  );
}
