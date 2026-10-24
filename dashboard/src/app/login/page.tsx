'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, Field, Input, Notice } from '@/components/ui';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { state, signIn } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
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
    <main className="grid min-h-dvh place-items-center bg-cream px-5">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-6 rounded-2xl border border-line bg-surface p-8"
      >
        <div className="space-y-1 text-center">
          <p className="font-wordmark text-2xl font-medium uppercase tracking-wordmark">Zelqune</p>
          <h1 className="text-sm text-stone">Sign in to the admin</h1>
        </div>
        {error ? <Notice tone="error">{error}</Notice> : null}
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
          />
        </Field>
        <Field label="Password">
          <Input
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </main>
  );
}
