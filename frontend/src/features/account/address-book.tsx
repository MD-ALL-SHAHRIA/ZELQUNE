'use client';

import { MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { toApiError } from '@/shared/api/errors';
import { type District, type SavedAddress, type SavedAddressInput } from '@/shared/api/types';
import { normalizePhone } from '@/shared/lib/forms';
import { Button } from '@/shared/ui/button';
import { Field, Input } from '@/shared/ui/field';
import { Skeleton } from '@/shared/ui/skeleton';
import { AreaSelects, divisionOf } from '@/features/checkout/area-selects';
import { authed } from './session';

type Copy = Pick<
  Dictionary['auth'],
  | 'addressesEmpty'
  | 'addAddress'
  | 'editAddress'
  | 'removeAddress'
  | 'makeDefault'
  | 'defaultBadge'
  | 'saveAddress'
  | 'cancelAddress'
  | 'recipient'
  | 'addressLimit'
> & {
  fields: Dictionary['checkout']['fields'];
  errors: Dictionary['checkout']['errors'];
};

interface Form {
  recipientName: string;
  phone: string;
  division: string;
  district: string;
  area: string;
  line: string;
  landmark: string;
  label: '' | 'HOME' | 'OFFICE';
  isDefault: boolean;
}
const BLANK: Form = {
  recipientName: '',
  phone: '',
  division: '',
  district: '',
  area: '',
  line: '',
  landmark: '',
  label: '',
  isDefault: false,
};

/** Area and district names of a saved address, in the page's language. */
export function placeName(
  districts: District[],
  a: { district: string; area: string },
  lang: Locale,
) {
  const d = districts.find((x) => x.code === a.district);
  const area = d?.areas.find((x) => x.code === a.area);
  const n = (x?: { nameEn: string; nameBn: string }) =>
    x ? (lang === 'bn' ? x.nameBn : x.nameEn) : '';
  return [n(area) || a.area, n(d) || a.district].join(', ');
}

/**
 * The customer's saved delivery addresses (account page): add, edit, delete, choose the default.
 * Checkout offers them and fills the form from the default.
 */
export function AddressBook({
  lang,
  districts,
  copy: c,
  name,
  phone,
}: {
  lang: Locale;
  districts: District[];
  copy: Copy;
  name: string;
  phone: string;
}) {
  const [items, setItems] = useState<SavedAddress[] | null>(null);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<Form>(BLANK);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void authed<{ items: SavedAddress[] }>('/v1/me/addresses')
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  }, []);

  const send = async (path: string, method: string, body?: SavedAddressInput) => {
    setBusy(true);
    setFormError(null);
    try {
      const r = await authed<{ items: SavedAddress[] }>(path, {
        method,
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      setItems(r.items);
      setEditing(null);
    } catch (err) {
      setFormError(toApiError(err).code === 'ADDRESS_LIMIT' ? c.addressLimit : c.errors.generic);
    } finally {
      setBusy(false);
    }
  };

  const open = (a?: SavedAddress) => {
    setErrors({});
    setFormError(null);
    setEditing(a ? a.id : 'new');
    setForm(
      a
        ? {
            recipientName: a.recipientName,
            phone: a.phone,
            division: divisionOf(districts, a.district),
            district: a.district,
            area: a.area,
            line: a.line,
            landmark: a.landmark ?? '',
            label: a.label ?? '',
            isDefault: a.isDefault,
          }
        : { ...BLANK, recipientName: name, phone },
    );
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const found: typeof errors = {};
    if (form.recipientName.trim().length < 2) found.recipientName = c.errors.required;
    if (!normalizePhone(form.phone)) found.phone = c.errors.phone;
    if (!form.division) found.division = c.errors.required;
    if (!form.district) found.district = c.errors.required;
    if (!form.area) found.area = c.errors.area;
    if (form.line.trim().length < 5) found.line = c.errors.line;
    setErrors(found);
    if (Object.keys(found).length) return;
    const body: SavedAddressInput = {
      recipientName: form.recipientName.trim(),
      phone: normalizePhone(form.phone) ?? form.phone,
      district: form.district,
      area: form.area,
      line: form.line.trim(),
      landmark: form.landmark.trim() || null,
      label: form.label || null,
      isDefault: form.isDefault,
    };
    void send(
      editing === 'new' ? '/v1/me/addresses' : `/v1/me/addresses/${editing}`,
      editing === 'new' ? 'POST' : 'PUT',
      body,
    );
  };

  const toInput = (a: SavedAddress, isDefault = a.isDefault): SavedAddressInput => ({
    recipientName: a.recipientName,
    phone: a.phone,
    district: a.district,
    area: a.area,
    line: a.line,
    landmark: a.landmark,
    label: a.label,
    isDefault,
  });

  if (!items) return <Skeleton className="h-32 w-full" />;
  const text = (
    key: 'recipientName' | 'phone' | 'line' | 'landmark',
    label: string,
    props: React.ComponentProps<'input'> = {},
  ) => (
    <Field id={`ab-${key}`} label={label} error={errors[key]}>
      <Input
        id={`ab-${key}`}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        aria-invalid={!!errors[key]}
        {...props}
      />
    </Field>
  );
  return (
    <div className="space-y-6">
      {items.length === 0 && editing === null ? (
        <p className="text-stone">{c.addressesEmpty}</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {items.map((a) => (
            <li key={a.id} className="flex flex-wrap items-start gap-4 py-5 sm:px-2">
              <MapPin aria-hidden className="mt-1 size-4 shrink-0 text-walnut" />
              <div className="min-w-0 flex-1 space-y-1 text-sm">
                <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                  {a.recipientName} · {a.phone}
                  {a.label ? (
                    <span className="border border-line px-2 py-0.5 text-[0.7rem] uppercase tracking-wide text-stone [:lang(bn)_&]:normal-case [:lang(bn)_&]:tracking-normal">
                      {a.label === 'HOME' ? c.fields.labelHome : c.fields.labelOffice}
                    </span>
                  ) : null}
                  {a.isDefault ? (
                    <span className="bg-ink px-2 py-0.5 text-[0.7rem] uppercase tracking-wide text-paper [:lang(bn)_&]:normal-case [:lang(bn)_&]:tracking-normal">
                      {c.defaultBadge}
                    </span>
                  ) : null}
                </p>
                <p className="text-ink/80">{a.line}</p>
                <p className="text-ink/80">{placeName(districts, a, lang)}</p>
                {a.landmark ? <p className="text-stone">{a.landmark}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {!a.isDefault ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => void send(`/v1/me/addresses/${a.id}`, 'PUT', toInput(a, true))}
                  >
                    {c.makeDefault}
                  </Button>
                ) : null}
                <Button variant="outline" size="sm" disabled={busy} onClick={() => open(a)}>
                  {c.editAddress}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void send(`/v1/me/addresses/${a.id}`, 'DELETE')}
                >
                  {c.removeAddress}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing === null ? (
        <Button variant="outline" onClick={() => open()} disabled={items.length >= 10}>
          {c.addAddress}
        </Button>
      ) : (
        <form
          onSubmit={save}
          noValidate
          className="space-y-6 border border-line bg-surface p-5 sm:p-7"
        >
          <div className="grid gap-6 sm:grid-cols-2">
            {text('recipientName', c.recipient, { autoComplete: 'name' })}
            {text('phone', c.fields.phone, { type: 'tel', inputMode: 'tel', autoComplete: 'tel' })}
          </div>
          <AreaSelects
            lang={lang}
            districts={districts}
            value={{ division: form.division, district: form.district, area: form.area }}
            onChange={(next) => setForm((f) => ({ ...f, ...next }))}
            labels={{
              division: c.fields.division,
              district: c.fields.district,
              area: c.fields.area,
            }}
            errors={errors}
            idPrefix="ab"
          />
          {text('line', c.fields.line, { autoComplete: 'street-address' })}
          {text('landmark', c.fields.landmark)}
          <div className="flex flex-wrap items-center gap-3">
            {(['HOME', 'OFFICE'] as const).map((l) => (
              <label
                key={l}
                className="flex cursor-pointer items-center gap-2 border border-line px-4 py-2.5 text-sm transition has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-paper"
              >
                <input
                  type="radio"
                  name="ab-label"
                  checked={form.label === l}
                  onChange={() => setForm((f) => ({ ...f, label: l }))}
                  className="sr-only"
                />
                {l === 'HOME' ? c.fields.labelHome : c.fields.labelOffice}
              </label>
            ))}
            <label className="ml-auto flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                className="accent-ink"
              />
              {c.makeDefault}
            </label>
          </div>
          {formError ? (
            <p role="alert" className="text-sm text-danger">
              {formError}
            </p>
          ) : null}
          <div className="flex gap-3">
            <Button type="submit" disabled={busy}>
              {c.saveAddress}
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>
              {c.cancelAddress}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
