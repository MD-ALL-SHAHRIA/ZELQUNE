'use client';

import { KeyRound, MoreHorizontal, Plus, ShieldCheck, UserRound } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Select } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage, type Schemas } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { timeAgo } from '@/lib/format';
import { passwordProblem } from './password';

type Member = Schemas['TeamMemberDto_Output'];
type Role = Member['role'];

const ROLE: Record<Role, { label: string; text: string }> = {
  OWNER: { label: 'Owner', text: 'Everything, including finance, settings and the team.' },
  STAFF: {
    label: 'Staff',
    text: 'Orders, products, quotes and marketing. No finance or settings.',
  },
};
const local = (p: string) => p.replace(/^\+880/, '0');

export function TeamSettings() {
  const toast = useToast();
  const { state } = useAuth();
  const me = 'user' in state ? state.user.id : null;
  const [items, setItems] = useState<Member[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    role: 'STAFF' as Role,
    password: '',
  });
  const [reset, setReset] = useState<{ member: Member; password: string } | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    void api.GET('/v1/admin/team').then(({ data, error }) => {
      if (data) setItems(data.items);
      else toast('error', errorMessage(error));
    });
  }, [toast]);
  useEffect(load, [load]);

  const add = async () => {
    setBusy(true);
    const { error } = await api.POST('/v1/admin/team', {
      body: { ...form, email: form.email.trim() || null },
    });
    setBusy(false);
    if (error) return toast('error', errorMessage(error));
    toast('success', `${form.name} can now sign in with ${form.phone}`);
    setAdding(false);
    setForm({ name: '', phone: '', email: '', role: 'STAFF', password: '' });
    load();
  };

  const update = async (m: Member, body: Schemas['UpdateTeamMemberDto'], done: string) => {
    setMenu(null);
    const { error } = await api.PATCH('/v1/admin/team/{id}', {
      params: { path: { id: m.id } },
      body,
    });
    if (error) return toast('error', errorMessage(error));
    toast('success', done);
    load();
  };

  const resetPassword = async () => {
    if (!reset) return;
    setBusy(true);
    const { error } = await api.POST('/v1/admin/team/{id}/password', {
      params: { path: { id: reset.member.id } },
      body: { password: reset.password },
    });
    setBusy(false);
    if (error) return toast('error', errorMessage(error));
    toast('success', `New password set. ${reset.member.name ?? 'They'} must sign in again.`);
    setReset(null);
  };

  const formProblem =
    form.name.trim().length < 2
      ? 'name'
      : !/^(?:\+?880|0)1[3-9]\d{8}$/.test(form.phone.trim())
        ? 'phone'
        : passwordProblem(form.password);

  return (
    <Card>
      <CardHeader
        title="Team"
        description="People who can sign in to this dashboard. Changes to access sign them out at once."
        action={
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus /> Add member
          </Button>
        }
      />
      {!items ? (
        <div className="space-y-2 px-5 pb-5">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {items.map((m) => (
            <li key={m.id} className="relative flex flex-wrap items-center gap-3 px-5 py-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-walnut/12 text-walnut">
                {m.role === 'OWNER' ? (
                  <ShieldCheck className="size-4" />
                ) : (
                  <UserRound className="size-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">
                  {m.name ?? local(m.phone)}{' '}
                  {m.id === me ? (
                    <span className="text-xs font-normal text-stone">(you)</span>
                  ) : null}
                </p>
                <p className="text-xs text-stone">
                  {local(m.phone)}
                  {m.email ? ` · ${m.email}` : ''} ·{' '}
                  {m.lastLoginAt ? `signed in ${timeAgo(m.lastLoginAt)}` : 'never signed in'}
                </p>
              </div>
              <Badge tone={m.role === 'OWNER' ? 'accent' : 'neutral'}>{ROLE[m.role].label}</Badge>
              {m.isActive ? null : <Badge tone="danger">No access</Badge>}
              {m.id !== me ? (
                <div className="relative">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Actions for ${m.name ?? m.phone}`}
                    aria-expanded={menu === m.id}
                    onClick={() => setMenu(menu === m.id ? null : m.id)}
                  >
                    <MoreHorizontal />
                  </Button>
                  {menu === m.id ? (
                    <div
                      role="menu"
                      className="absolute top-9 right-0 z-20 w-56 rounded-xl border border-line bg-surface p-1 text-sm shadow-[var(--shadow-pop)]"
                    >
                      <MenuItem
                        onClick={() =>
                          void update(
                            m,
                            { role: m.role === 'OWNER' ? 'STAFF' : 'OWNER' },
                            `${m.name ?? 'Member'} is now ${m.role === 'OWNER' ? 'staff' : 'an owner'}`,
                          )
                        }
                      >
                        Make {m.role === 'OWNER' ? 'staff' : 'owner'}
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          setMenu(null);
                          setReset({ member: m, password: '' });
                        }}
                      >
                        <KeyRound className="size-4" /> Set a new password
                      </MenuItem>
                      <MenuItem
                        danger={m.isActive}
                        onClick={() =>
                          void update(
                            m,
                            { isActive: !m.isActive },
                            m.isActive ? 'Access removed and signed out' : 'Access restored',
                          )
                        }
                      >
                        {m.isActive ? 'Remove access' : 'Restore access'}
                      </MenuItem>
                    </div>
                  ) : null}
                </div>
              ) : (
                <span className="size-8" />
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title="Add a team member"
        description="They sign in at this dashboard with their phone and this password."
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button disabled={busy || formProblem !== null} onClick={() => void add()}>
              {busy ? 'Adding…' : 'Add member'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <Input
                value={form.name}
                autoFocus
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Mobile number">
              <Input
                inputMode="tel"
                placeholder="01XXXXXXXXX"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Email (optional)">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Role" hint={ROLE[form.role].text}>
            <Select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            >
              <option value="STAFF">Staff</option>
              <option value="OWNER">Owner</option>
            </Select>
          </Field>
          <Field
            label="Password"
            hint="At least 10 characters with letters and numbers. Share it privately."
            error={
              form.password && formProblem === 'password'
                ? 'At least 10 characters with letters and numbers'
                : null
            }
          >
            <Input
              type="text"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </Field>
        </div>
      </Dialog>

      <Dialog
        open={reset !== null}
        onClose={() => setReset(null)}
        title={`New password for ${reset?.member.name ?? 'this member'}`}
        description="They are signed out everywhere and use this password next time."
        footer={
          <>
            <Button variant="secondary" onClick={() => setReset(null)}>
              Cancel
            </Button>
            <Button
              disabled={busy || !reset || passwordProblem(reset.password) !== null}
              onClick={() => void resetPassword()}
            >
              Set password
            </Button>
          </>
        }
      >
        <Field label="New password" hint="At least 10 characters with letters and numbers.">
          <Input
            type="text"
            autoComplete="new-password"
            value={reset?.password ?? ''}
            onChange={(e) => reset && setReset({ ...reset, password: e.target.value })}
          />
        </Field>
      </Dialog>
    </Card>
  );
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-ink/5 ${danger ? 'text-danger' : 'text-ink'}`}
    >
      {children}
    </button>
  );
}
