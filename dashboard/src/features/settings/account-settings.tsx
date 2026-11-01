'use client';

import { Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { setAdminTheme, useAdminTheme } from '@/components/shell/theme-toggle';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { passwordProblem } from './password';

export function AccountSettings() {
  const toast = useToast();
  const { state } = useAuth();
  const user = 'user' in state ? state.user : null;
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [pw, setPw] = useState({ current: '', next: '', again: '' });
  const [busy, setBusy] = useState<'profile' | 'password' | null>(null);

  const saveProfile = async () => {
    setBusy('profile');
    const { error } = await api.PUT('/v1/admin/account/profile', {
      body: { name: name.trim(), email: email.trim() || null },
    });
    setBusy(null);
    if (error) return toast('error', errorMessage(error));
    toast('success', 'Profile saved');
  };

  const savePassword = async () => {
    setBusy('password');
    const { error } = await api.PUT('/v1/admin/account/password', {
      body: { currentPassword: pw.current, newPassword: pw.next },
    });
    setBusy(null);
    if (error) return toast('error', errorMessage(error));
    toast('success', 'Password changed. Use it next time you sign in.');
    setPw({ current: '', next: '', again: '' });
  };

  const pwError =
    pw.next && passwordProblem(pw.next)
      ? 'At least 10 characters with letters and numbers'
      : pw.again && pw.again !== pw.next
        ? 'The two new passwords do not match'
        : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Your profile"
          description={`You sign in with ${user?.phone.replace(/^\+880/, '0') ?? 'your phone'}.`}
        />
        <CardBody className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Email (optional)">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
          </div>
          <Button
            variant="secondary"
            disabled={busy !== null || name.trim().length < 2}
            onClick={() => void saveProfile()}
          >
            {busy === 'profile' ? 'Saving…' : 'Save profile'}
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Password"
          description="Use a long password you don't use anywhere else."
        />
        <CardBody className="space-y-4">
          <Field label="Current password">
            <Input
              type="password"
              autoComplete="current-password"
              value={pw.current}
              onChange={(e) => setPw({ ...pw, current: e.target.value })}
              className="max-w-sm"
            />
          </Field>
          <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
            <Field label="New password" error={pwError}>
              <Input
                type="password"
                autoComplete="new-password"
                value={pw.next}
                onChange={(e) => setPw({ ...pw, next: e.target.value })}
              />
            </Field>
            <Field label="New password again">
              <Input
                type="password"
                autoComplete="new-password"
                value={pw.again}
                onChange={(e) => setPw({ ...pw, again: e.target.value })}
              />
            </Field>
          </div>
          <Button
            disabled={
              busy !== null || !pw.current || !pw.next || pw.next !== pw.again || pwError !== null
            }
            onClick={() => void savePassword()}
          >
            {busy === 'password' ? 'Changing…' : 'Change password'}
          </Button>
        </CardBody>
      </Card>

      <AppearanceCard />
    </div>
  );
}

type Theme = 'light' | 'dark';

function AppearanceCard() {
  const theme = useAdminTheme();
  const apply = setAdminTheme;
  const options: { value: Theme; label: string; text: string; icon: React.ReactNode }[] = [
    {
      value: 'light',
      label: 'Day',
      text: 'Soft cream with espresso',
      icon: <Sun className="size-4" />,
    },
    { value: 'dark', label: 'Night', text: 'Dark walnut', icon: <Moon className="size-4" /> },
  ];
  return (
    <Card>
      <CardHeader title="Appearance" description="How the dashboard looks on this device." />
      <CardBody>
        <div role="radiogroup" aria-label="Theme" className="grid max-w-lg gap-3 sm:grid-cols-2">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={theme === o.value}
              onClick={() => apply(o.value)}
              className={cn(
                'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                theme === o.value
                  ? 'border-ink bg-surface text-ink ring-1 ring-ink'
                  : 'border-line text-ink/75 hover:border-ink/30',
              )}
            >
              {o.icon}
              <span>
                <span className="block text-sm font-medium">{o.label}</span>
                <span className="block text-xs text-stone">{o.text}</span>
              </span>
            </button>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
