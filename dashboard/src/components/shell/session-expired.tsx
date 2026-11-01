'use client';

import { LockKeyhole } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/field';
import { useAuth } from '@/lib/auth';

/**
 * Shown over the page when the session runs out mid-work. The page underneath stays as it was,
 * so unsaved edits survive: sign in again and press Save. "Sign out" is the way out.
 */
export function SessionExpired({ phone }: { phone: string }) {
  const { signIn, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return setError('Enter your password to continue.');
    setBusy(true);
    const problem = await signIn(phone, password);
    setBusy(false);
    if (problem) setError(problem);
  };

  return (
    <Dialog
      open
      onClose={() => undefined}
      title="Your session has ended"
      description="For security you are signed out after a while. Your unsaved changes are still on this page."
    >
      <form onSubmit={(e) => void submit(e)} className="space-y-4 px-5 py-5" noValidate>
        <p className="flex items-start gap-2 rounded-lg bg-ink/5 px-3 py-2.5 text-[0.8125rem]">
          <LockKeyhole className="mt-0.5 size-4 shrink-0 text-stone" aria-hidden />
          Sign in again, then press Save on anything you were editing.
        </p>
        <Field label="Phone">
          <Input value={phone} readOnly autoComplete="username" />
        </Field>
        <Field label="Password" error={error}>
          <Input
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            aria-invalid={!!error}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
          />
        </Field>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => void signOut()}>
            Sign out
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in and continue'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
