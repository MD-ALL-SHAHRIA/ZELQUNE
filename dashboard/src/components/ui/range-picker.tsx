'use client';

import { CalendarDays } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Input, Select } from '@/components/ui/field';
import { type Preset, PRESET_LABEL, presetRange, rangeLabel } from '@/lib/report-range';

export interface ReportRange {
  from: string;
  to: string;
}

/** Report period: presets (7/30/90 days, this/last month, this year) or two dates. */
export function useReportRange(initial: Exclude<Preset, 'custom'> = '30d') {
  const [preset, setPreset] = useState<Preset>(initial);
  const [custom, setCustom] = useState<ReportRange>(() => presetRange(initial));
  const range = useMemo(
    () => (preset === 'custom' ? custom : presetRange(preset)),
    [preset, custom],
  );
  return { preset, setPreset, range, custom, setCustom };
}

export function RangePicker({ state }: { state: ReturnType<typeof useReportRange> }) {
  const { preset, setPreset, range, custom, setCustom } = state;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2">
        <CalendarDays className="size-4 text-stone" aria-hidden />
        <Select
          aria-label="Period"
          value={preset}
          onChange={(e) => {
            const next = e.target.value as Preset;
            if (next === 'custom') setCustom(range);
            setPreset(next);
          }}
          className="w-40"
        >
          {(Object.keys(PRESET_LABEL) as Preset[]).map((p) => (
            <option key={p} value={p}>
              {PRESET_LABEL[p]}
            </option>
          ))}
        </Select>
      </div>
      {preset === 'custom' ? (
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            aria-label="From"
            value={custom.from}
            max={custom.to}
            onChange={(e) => e.target.value && setCustom({ ...custom, from: e.target.value })}
            className="w-38"
          />
          <span className="text-stone">–</span>
          <Input
            type="date"
            aria-label="To"
            value={custom.to}
            min={custom.from}
            onChange={(e) => e.target.value && setCustom({ ...custom, to: e.target.value })}
            className="w-38"
          />
        </div>
      ) : (
        <span className="text-[0.8125rem] text-stone tabular">{rangeLabel(range)}</span>
      )}
    </div>
  );
}
