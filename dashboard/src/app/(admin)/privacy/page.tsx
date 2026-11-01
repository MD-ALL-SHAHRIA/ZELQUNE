'use client';

import { Download, Lock, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Badge, type Tone } from '@/components/ui/badge';
import { Button, buttonClass } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { EmptyState, PageHeader } from '@/components/ui/page';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage, type Schemas } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { formatDateTime, timeAgo } from '@/lib/format';

type List = Schemas['PrivacyListDto_Output'];
type Detail = Schemas['PrivacyRequestDetailDto_Output'];
type Status = Detail['status'];

const TYPES: Record<Detail['type'], string> = {
  ACCESS: 'See my data',
  CORRECTION: 'Correct my data',
  DELETION: 'Delete my data',
  CONSENT_WITHDRAWAL: 'Withdraw consent',
};
const STATUSES: Record<Status, { label: string; tone: Tone }> = {
  PENDING: { label: 'New', tone: 'info' },
  VERIFICATION_REQUIRED: { label: 'Awaiting identity check', tone: 'warning' },
  IN_PROGRESS: { label: 'Verified, in progress', tone: 'accent' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
};
const METHODS = {
  CALLED_NUMBER_ON_FILE: 'I called the number on file and they confirmed',
  WHATSAPP_FROM_NUMBER_ON_FILE: 'They messaged us on WhatsApp from the number on file',
  IN_PERSON: 'In person',
} as const;

/**
 * Privacy requests (ADR 0020), owner only. Nothing is shown or changed until the owner has
 * confirmed the requester controls the phone number on file.
 */
export default function PrivacyPage() {
  const { state } = useAuth();
  const toast = useToast();
  const owner = 'user' in state && state.user.role === 'OWNER';
  const [status, setStatus] = useState<Status | ''>('');
  const [list, setList] = useState<List | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(() => {
    void api
      .GET('/v1/admin/privacy-requests', {
        params: { query: { limit: 100, page: 1, ...(status ? { status } : {}) } },
      })
      .then(({ data, error }) => (data ? setList(data) : toast('error', errorMessage(error))));
  }, [status, toast]);
  useEffect(() => {
    if (owner) load();
  }, [owner, load]);

  if (!owner)
    return (
      <>
        <PageHeader title="Privacy requests" />
        <Card>
          <EmptyState
            icon={<Lock />}
            title="Only the owner can handle privacy requests"
            action={
              <Link href="/" className={buttonClass('secondary', 'sm')}>
                Back to overview
              </Link>
            }
          >
            These requests show customers&apos; contact details and can export or erase their data,
            so only the owner handles them.
          </EmptyState>
        </Card>
      </>
    );

  return (
    <>
      <PageHeader title="Privacy requests" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card>
          <CardHeader
            title="Queue"
            description="Customers asking to see, correct or delete their data."
            action={
              <Select
                aria-label="Filter by status"
                value={status}
                onChange={(e) => setStatus(e.target.value as Status | '')}
              >
                <option value="">All</option>
                {Object.entries(STATUSES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </Select>
            }
          />
          {!list ? (
            <CardBody>
              <Skeleton className="h-48" />
            </CardBody>
          ) : !list.items.length ? (
            <EmptyState icon={<ShieldCheck />} title="No privacy requests">
              {status
                ? 'None with this status. Try All.'
                : 'Requests sent from the website’s privacy request page appear here.'}
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {list.items.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(r.id)}
                    aria-current={selected === r.id}
                    className={cn(
                      'flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-ink/[0.03]',
                      selected === r.id && 'bg-ink/[0.05]',
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-[0.8125rem]">{r.code}</span>
                      <span className="block text-[0.8125rem] text-stone">
                        {TYPES[r.type]} · {timeAgo(r.createdAt)}
                      </span>
                    </span>
                    <Badge tone={STATUSES[r.status].tone}>{STATUSES[r.status].label}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        {selected ? (
          <RequestPanel key={selected} id={selected} onChanged={load} />
        ) : (
          <Card>
            <EmptyState icon={<ShieldCheck />} title="Pick a request">
              Choose a request on the left to see its details and the next step.
            </EmptyState>
          </Card>
        )}
      </div>
    </>
  );
}

function RequestPanel({ id, onChanged }: { id: string; onChanged: () => void }) {
  const toast = useToast();
  const [r, setR] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState<keyof typeof METHODS>('CALLED_NUMBER_ON_FILE');
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [confirmErase, setConfirmErase] = useState(false);

  useEffect(() => {
    void api
      .GET('/v1/admin/privacy-requests/{id}', { params: { path: { id } } })
      .then(({ data, error }) => (data ? setR(data) : toast('error', errorMessage(error))));
  }, [id, toast]);

  const run = async (
    call: () => Promise<{ data?: Detail; error?: unknown }>,
    done: string,
  ): Promise<void> => {
    setBusy(true);
    const { data, error } = await call();
    setBusy(false);
    if (!data) return toast('error', errorMessage(error));
    setR(data);
    onChanged();
    toast('success', done);
  };
  const path = { params: { path: { id } } };

  const exportData = async () => {
    setBusy(true);
    const { data, error } = await api.POST('/v1/admin/privacy-requests/{id}/export', path);
    setBusy(false);
    if (!data) return toast('error', errorMessage(error));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${r?.code ?? 'privacy'}-data.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('success', 'Downloaded. Send it to the number on file, then mark the request completed.');
    const fresh = await api.GET('/v1/admin/privacy-requests/{id}', path);
    if (fresh.data) setR(fresh.data);
  };

  if (!r)
    return (
      <Card>
        <CardBody>
          <Skeleton className="h-72" />
        </CardBody>
      </Card>
    );

  const open = r.status === 'PENDING' || r.status === 'VERIFICATION_REQUIRED';
  const working = r.status === 'IN_PROGRESS';
  const result = r.result;

  return (
    <Card>
      <CardHeader
        title={<span className="font-mono">{r.code}</span>}
        description={`${TYPES[r.type]} · received ${formatDateTime(r.createdAt)}`}
        action={<Badge tone={STATUSES[r.status].tone}>{STATUSES[r.status].label}</Badge>}
      />
      <CardBody className="space-y-5 text-[0.875rem]">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <Item label="Phone">{r.phone}</Item>
          <Item label="Email for replies">{r.email ?? '—'}</Item>
          <Item label="Reference given">
            {r.reference ?? '—'}
            {r.reference ? (
              <span className={cn('ml-2', r.referenceMatched ? 'text-success' : 'text-warning')}>
                {r.referenceMatched ? 'matches this phone' : 'does not match this phone'}
              </span>
            ) : null}
          </Item>
          <Item label="Records for this phone">
            {r.found.orders} orders, {r.found.quotes} requests
          </Item>
        </dl>
        {r.details ? (
          <p className="rounded-lg bg-ink/[0.04] px-3 py-2.5 whitespace-pre-wrap">{r.details}</p>
        ) : null}
        {r.verification ? (
          <p className="text-stone">
            Identity checked {formatDateTime(r.verification.at)}: {METHODS[r.verification.method]}
            {r.verification.note ? `. ${r.verification.note}` : ''}
          </p>
        ) : null}
        {r.decisionNote ? <p className="text-stone">Note: {r.decisionNote}</p> : null}

        {open ? (
          <section className="space-y-3 border-t border-line pt-5">
            <h3 className="font-medium">1. Check it is really them</h3>
            <p className="text-stone">
              Knowing a phone number or an order code is not proof. Call the number on file (or wait
              for a WhatsApp message from it) and confirm the request before you show or change
              anything.
            </p>
            <Field label="How did you confirm?">
              <Select
                value={method}
                onChange={(e) => setMethod(e.target.value as keyof typeof METHODS)}
              >
                {Object.entries(METHODS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Note (optional, no personal details)">
              <Input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={busy}
                onClick={() =>
                  void run(
                    () =>
                      api.POST('/v1/admin/privacy-requests/{id}/verify', {
                        ...path,
                        body: { method, note },
                      }),
                    'Identity confirmed. You can now act on the request.',
                  )
                }
              >
                Identity confirmed
              </Button>
              {r.status === 'PENDING' ? (
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () =>
                        api.POST('/v1/admin/privacy-requests/{id}/ask-verification', {
                          ...path,
                          body: { note },
                        }),
                      'Marked as waiting for the customer to confirm.',
                    )
                  }
                >
                  Waiting for them to confirm
                </Button>
              ) : null}
            </div>
          </section>
        ) : null}

        {working && r.type === 'ACCESS' ? (
          <section className="space-y-3 border-t border-line pt-5">
            <h3 className="font-medium">2. Send them their data</h3>
            <p className="text-stone">
              Download everything we hold for this phone, send it to the number on file only, then
              mark the request completed.
            </p>
            <Button variant="secondary" disabled={busy} onClick={() => void exportData()}>
              <Download /> Download data (JSON)
            </Button>
            {result?.kind === 'ACCESS' ? (
              <Complete
                busy={busy}
                onDone={(text) =>
                  void run(
                    () =>
                      api.POST('/v1/admin/privacy-requests/{id}/complete', {
                        ...path,
                        body: { note: text },
                      }),
                    'Request completed.',
                  )
                }
              />
            ) : null}
          </section>
        ) : null}

        {working && r.type === 'CORRECTION' ? (
          <section className="space-y-3 border-t border-line pt-5">
            <h3 className="font-medium">2. Apply the correction</h3>
            <p className="text-stone">
              Changes the name and/or email on every order and request for this phone. For an
              address on an order that has not shipped, edit the order itself.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Correct name">
                <Input value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Correct email">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
            </div>
            <Button
              disabled={busy || (!name.trim() && !email.trim())}
              onClick={() =>
                void run(
                  () =>
                    api.POST('/v1/admin/privacy-requests/{id}/correct', {
                      ...path,
                      body: { name, email },
                    }),
                  'Corrected and completed.',
                )
              }
            >
              Apply and complete
            </Button>
          </section>
        ) : null}

        {working && r.type === 'DELETION' ? (
          <section className="space-y-3 border-t border-line pt-5">
            <h3 className="font-medium">2. Erase their data</h3>
            <ul className="list-disc space-y-1 pl-5 text-stone">
              <li>
                Orders cancelled before any payment, and requests that never became a sale, are
                anonymised.
              </li>
              <li>
                Completed sales are kept as accounting records (name, phone, address stay on those
                orders).
              </li>
              <li>Orders still running block the erasure until they finish or are cancelled.</li>
              <li>
                Payment numbers, SMS records and analytics links are removed by the other services.
              </li>
              <li>Database backups and WhatsApp chats are not touched by this step.</li>
            </ul>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-[var(--color-danger)]"
                checked={confirmErase}
                onChange={(e) => setConfirmErase(e.target.checked)}
              />
              <span>I understand this cannot be undone.</span>
            </label>
            <Button
              variant="danger"
              disabled={busy || !confirmErase}
              onClick={() =>
                void run(
                  () => api.POST('/v1/admin/privacy-requests/{id}/erase', path),
                  'Erased and completed. See what was kept below.',
                )
              }
            >
              Erase now
            </Button>
          </section>
        ) : null}

        {working && r.type === 'CONSENT_WITHDRAWAL' ? (
          <section className="space-y-3 border-t border-line pt-5">
            <h3 className="font-medium">2. Record the withdrawal</h3>
            <p className="text-stone">
              We send no marketing messages, and cookie choices live in the visitor’s browser
              (Cookie settings in the footer). Explain this to them, stop anything optional you do
              by hand for this number, and note what you did.
            </p>
            <Complete
              busy={busy}
              onDone={(text) =>
                void run(
                  () =>
                    api.POST('/v1/admin/privacy-requests/{id}/complete', {
                      ...path,
                      body: { note: text },
                    }),
                  'Request completed.',
                )
              }
            />
          </section>
        ) : null}

        {result?.kind === 'ERASURE' ? (
          <section className="space-y-2 border-t border-line pt-5">
            <h3 className="font-medium">What was done</h3>
            <p>Erased orders: {result.erasedOrders.join(', ') || 'none'}</p>
            <p>Erased requests: {result.erasedQuotes.join(', ') || 'none'}</p>
            <p>
              Kept as sale records: {result.retainedOrders.map((o) => o.code).join(', ') || 'none'}
            </p>
            {result.retainedQuotes.length ? (
              <p>Kept with those sales: {result.retainedQuotes.map((q) => q.code).join(', ')}</p>
            ) : null}
          </section>
        ) : null}
        {result?.kind === 'CORRECTION' ? (
          <p className="border-t border-line pt-5">
            Corrected {result.fields.join(' and ')} on {result.orders} orders and {result.quotes}{' '}
            requests.
          </p>
        ) : null}

        {open || working ? (
          <section className="space-y-3 border-t border-line pt-5">
            <Field label="Reject with a reason (shown to staff only)">
              <Textarea
                rows={2}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
            <Button
              variant="secondary"
              disabled={busy || reason.trim().length < 5}
              onClick={() =>
                void run(
                  () =>
                    api.POST('/v1/admin/privacy-requests/{id}/reject', {
                      ...path,
                      body: { reason },
                    }),
                  'Request rejected.',
                )
              }
            >
              Reject
            </Button>
          </section>
        ) : null}
      </CardBody>
    </Card>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[0.75rem] text-stone">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

function Complete({ busy, onDone }: { busy: boolean; onDone: (note: string) => void }) {
  const [text, setText] = useState('');
  return (
    <div className="space-y-2">
      <Field label="What you did (for the record)">
        <Input value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} />
      </Field>
      <Button disabled={busy || text.trim().length < 5} onClick={() => onDone(text)}>
        Mark completed
      </Button>
    </div>
  );
}
