'use client';

import { type Locale } from '@/i18n/config';
import { type District } from '@/shared/api/types';
import { Field, Select } from '@/shared/ui/field';

export interface AreaValue {
  division: string;
  district: string;
  area: string;
}

type Key = keyof AreaValue;
type Named = { code: string; nameEn: string; nameBn: string };

/**
 * Division -> District -> Area/Thana/Upazila dropdowns, like a courier label (checkout and the
 * address book). Choosing a level clears the ones below it. `idPrefix` keeps ids unique when two
 * forms share a page.
 */
export function AreaSelects({
  lang,
  districts,
  value,
  onChange,
  labels,
  errors = {},
  idPrefix = 'f',
}: {
  lang: Locale;
  districts: District[];
  value: AreaValue;
  onChange: (next: AreaValue) => void;
  labels: Record<Key, string>;
  errors?: Partial<Record<Key, string>>;
  idPrefix?: string;
}) {
  const name = (x: { nameEn: string; nameBn: string }) => (lang === 'bn' ? x.nameBn : x.nameEn);
  const byName = (a: Named, b: Named) => name(a).localeCompare(name(b), lang);
  const divisions = [
    ...new Map(districts.map((d) => [d.division, { nameEn: d.division, nameBn: d.divisionBn }])),
  ]
    .map(([code, v]) => ({ code, ...v }))
    .sort(byName);
  const options: Record<Key, Named[]> = {
    division: divisions,
    district: districts.filter((d) => d.division === value.division).sort(byName),
    area: [...(districts.find((d) => d.code === value.district)?.areas ?? [])].sort(byName),
  };
  const choose = (key: Key, v: string) =>
    onChange({
      ...value,
      [key]: v,
      ...(key === 'division' ? { district: '', area: '' } : key === 'district' ? { area: '' } : {}),
    });
  return (
    <div className="grid gap-6 sm:grid-cols-3">
      {(['division', 'district', 'area'] as const).map((key) => (
        <Field key={key} id={`${idPrefix}-${key}`} label={labels[key]} error={errors[key]}>
          <Select
            id={`${idPrefix}-${key}`}
            name={key}
            value={value[key]}
            onChange={(e) => choose(key, e.target.value)}
            disabled={!options[key].length}
            aria-invalid={!!errors[key]}
          >
            <option value="">—</option>
            {options[key].map((o) => (
              <option key={o.code} value={o.code}>
                {name(o)}
              </option>
            ))}
          </Select>
        </Field>
      ))}
    </div>
  );
}

/** The division of a district code, for filling the dropdowns from a saved address. */
export function divisionOf(districts: District[], district: string): string {
  return districts.find((d) => d.code === district)?.division ?? '';
}
