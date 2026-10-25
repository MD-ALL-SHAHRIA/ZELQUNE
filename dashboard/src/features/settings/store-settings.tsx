'use client';

import { Info } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Field, Input, Select } from '@/components/ui/field';
import { SaveBar } from '@/components/ui/page';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { formatTaka, timeAgo } from '@/lib/format';
import { useSetting } from './use-setting';

const PHONE = /^(?:\+?880|0)1[3-9]\d{8}$/;
const taka = (paisa: number) => String(paisa / 100);
const toPaisa = (v: string) => Math.max(0, Math.round((Number(v) || 0) * 100));
const local = (n: string | null) => (n ? `0${n.replace(/^\+?880/, '').replace(/^0/, '')}` : '');

function Saved({ at }: { at: string | null }) {
  return (
    <p className="text-xs text-stone">
      {at ? `Last saved ${timeAgo(at)}` : 'Using the default from the server setup'}
    </p>
  );
}

function ReadOnlyNote({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p className="mb-4 flex items-center gap-2 rounded-lg bg-ink/5 px-3 py-2 text-[0.8125rem] text-stone">
      <Info className="size-4" aria-hidden /> Only the owner can change these.
    </p>
  );
}

/** The parts of useSetting() the card frame needs (any settings group). */
interface FrameState {
  saved: { meta: { updatedAt: string | null } } | null;
  draft: unknown;
  dirty: boolean;
  saving: boolean;
  save: () => Promise<boolean>;
  discard: () => void;
}

function Frame({
  setting,
  title,
  description,
  readOnly,
  children,
}: {
  setting: FrameState;
  title: string;
  description: string;
  readOnly: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader
        title={title}
        description={description}
        action={setting.saved ? <Saved at={setting.saved.meta.updatedAt} /> : null}
      />
      <CardBody>
        <ReadOnlyNote show={readOnly} />
        {setting.draft ? (
          <fieldset disabled={readOnly} className="space-y-5">
            {children}
          </fieldset>
        ) : (
          <Skeleton className="h-40" />
        )}
      </CardBody>
      <SaveBar
        dirty={setting.dirty && !readOnly}
        saving={setting.saving}
        onSave={() => void setting.save()}
        onDiscard={setting.discard}
        message={`Unsaved changes to ${title.toLowerCase()}`}
      />
    </Card>
  );
}

export function PaymentSettings({ readOnly }: { readOnly: boolean }) {
  const s = useSetting('payments');
  const d = s.draft;
  const wallet = (key: 'bkash' | 'nagad', label: string) => {
    if (!d) return null;
    const w = d[key];
    const bad = w.number !== null && !PHONE.test(w.number);
    return (
      <div className="rounded-xl border border-line p-4">
        <Switch
          checked={w.number !== null}
          onChange={(on) => s.setDraft({ ...d, [key]: { ...w, number: on ? '' : null } })}
          label={`Accept ${label}`}
          description={`Customers send the advance to this ${label} number and type the Transaction ID.`}
        />
        {w.number !== null ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field
              label={`${label} number`}
              error={bad && w.number ? 'Use an 11-digit number like 01711000000' : null}
            >
              <Input
                inputMode="tel"
                placeholder="01XXXXXXXXX"
                value={local(w.number) || w.number}
                onChange={(e) =>
                  s.setDraft({ ...d, [key]: { ...w, number: e.target.value.trim() } })
                }
              />
            </Field>
            <Field label="Account type">
              <Select
                value={w.accountType}
                onChange={(e) =>
                  s.setDraft({
                    ...d,
                    [key]: { ...w, accountType: e.target.value as typeof w.accountType },
                  })
                }
              >
                <option value="personal">Personal (Send Money)</option>
                <option value="agent">Agent (Cash Out)</option>
                <option value="merchant">Merchant (Payment)</option>
              </Select>
            </Field>
          </div>
        ) : null}
      </div>
    );
  };
  const invalid = !!d && [d.bkash, d.nagad].some((w) => w.number !== null && !PHONE.test(w.number));
  return (
    <Frame
      setting={invalid ? { ...s, dirty: false } : s}
      title="Payments"
      description="Where customers pay the advance. Cash on delivery is offered for in-stock items."
      readOnly={readOnly}
    >
      {wallet('bkash', 'bKash')}
      {wallet('nagad', 'Nagad')}
    </Frame>
  );
}

export function CheckoutSettings({ readOnly }: { readOnly: boolean }) {
  const s = useSetting('checkout');
  const d = s.draft;
  return (
    <Frame
      setting={s}
      title="Checkout"
      description="The advance customers pay before you make a pre-order or made-to-order piece."
      readOnly={readOnly}
    >
      {d ? (
        <>
          <Field label="Advance">
            <Select
              value={d.advanceMode}
              onChange={(e) =>
                s.setDraft({ ...d, advanceMode: e.target.value as typeof d.advanceMode })
              }
            >
              <option value="fixed">A fixed amount per order</option>
              <option value="percent">A percentage of the order</option>
            </Select>
          </Field>
          {d.advanceMode === 'fixed' ? (
            <Field label="Amount (৳)" hint="Capped at the order total.">
              <Input
                type="number"
                min={1}
                value={taka(d.advanceFixedPaisa)}
                onChange={(e) =>
                  s.setDraft({ ...d, advanceFixedPaisa: Math.max(100, toPaisa(e.target.value)) })
                }
                className="max-w-48"
              />
            </Field>
          ) : (
            <Field label="Percent of the products (1–100)" hint="Rounded up to a whole taka.">
              <Input
                type="number"
                min={1}
                max={100}
                value={d.advancePercent}
                onChange={(e) =>
                  s.setDraft({
                    ...d,
                    advancePercent: Math.min(
                      100,
                      Math.max(1, Math.round(Number(e.target.value) || 1)),
                    ),
                  })
                }
                className="max-w-48"
              />
            </Field>
          )}
          <p className="text-[0.8125rem] text-stone">
            Example: on a {formatTaka(500_000)} order the advance is{' '}
            <span className="font-medium text-ink">
              {formatTaka(
                d.advanceMode === 'fixed'
                  ? Math.min(d.advanceFixedPaisa, 500_000)
                  : Math.ceil((500_000 * d.advancePercent) / 100 / 100) * 100,
              )}
            </span>
            .
          </p>
        </>
      ) : null}
    </Frame>
  );
}

export function ShippingSettings({ readOnly }: { readOnly: boolean }) {
  const s = useSetting('shipping');
  const d = s.draft;
  const fee = (
    key: 'dhakaFeePaisa' | 'suburbFeePaisa' | 'outsideFeePaisa' | 'extraPerKgPaisa',
    label: string,
    hint?: string,
  ) =>
    d ? (
      <Field label={label} hint={hint}>
        <Input
          type="number"
          min={0}
          value={taka(d[key])}
          onChange={(e) => s.setDraft({ ...d, [key]: toPaisa(e.target.value) })}
        />
      </Field>
    ) : null;
  return (
    <Frame
      setting={s}
      title="Shipping"
      description="Delivery fees customers see at checkout, by zone and by weight."
      readOnly={readOnly}
    >
      {d ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {fee('dhakaFeePaisa', 'Inside Dhaka (৳)')}
            {fee('suburbFeePaisa', 'Dhaka suburbs (৳)', 'Savar, Gazipur, Narayanganj…')}
            {fee('outsideFeePaisa', 'Outside Dhaka (৳)')}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Weight included (kg)">
              <Input
                type="number"
                min={0.1}
                step={0.1}
                value={d.baseWeightGrams / 1000}
                onChange={(e) =>
                  s.setDraft({
                    ...d,
                    baseWeightGrams: Math.max(
                      100,
                      Math.round((Number(e.target.value) || 0) * 1000),
                    ),
                  })
                }
              />
            </Field>
            {fee('extraPerKgPaisa', 'Each extra kg (৳)')}
          </div>
          <p className="text-[0.8125rem] text-stone">
            A 3 kg parcel inside Dhaka costs{' '}
            <span className="font-medium text-ink">
              {formatTaka(
                d.dhakaFeePaisa +
                  Math.max(0, Math.ceil((3000 - d.baseWeightGrams) / 1000)) * d.extraPerKgPaisa,
              )}
            </span>
            . Packages are charged by the bigger of real and size weight.
          </p>
        </>
      ) : null}
    </Frame>
  );
}

export function NotificationSettings({ readOnly }: { readOnly: boolean }) {
  const s = useSetting('notifications');
  const d = s.draft;
  const bad = !!d && d.ownerPhone !== null && !PHONE.test(d.ownerPhone);
  return (
    <Frame
      setting={bad ? { ...s, dirty: false } : s}
      title="Notifications"
      description="Customers get SMS updates on their orders automatically. You get alerts here."
      readOnly={readOnly}
    >
      {d ? (
        <>
          <Switch
            checked={d.ownerPhone !== null}
            onChange={(on) => s.setDraft({ ownerPhone: on ? '' : null })}
            label="SMS me about new requests"
            description="Bulk and corporate orders, interior design and construction requests."
          />
          {d.ownerPhone !== null ? (
            <Field
              label="Your mobile number"
              error={bad && d.ownerPhone ? 'Use an 11-digit number like 01711000000' : null}
            >
              <Input
                inputMode="tel"
                placeholder="01XXXXXXXXX"
                value={d.ownerPhone.startsWith('+880') ? local(d.ownerPhone) : d.ownerPhone}
                onChange={(e) => s.setDraft({ ownerPhone: e.target.value.trim() })}
                className="max-w-64"
              />
            </Field>
          ) : null}
        </>
      ) : null}
    </Frame>
  );
}
