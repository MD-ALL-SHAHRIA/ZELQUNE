import { INTL_LOCALE, type Locale } from './config';

/** Fills `{name}` slots. Unknown slots stay as written so gaps are visible, never blank. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (slot, key: string) =>
    key in values ? String(values[key]) : slot,
  );
}

export function formatNumber(value: number, lang: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[lang], { maximumFractionDigits: 2 }).format(value);
}

/** Integer paisa -> "৳3,490" / "৳৩,৪৯০" (decimals only when there are any). */
export function formatTaka(paisa: number, lang: Locale): string {
  return `৳${formatNumber(paisa / 100, lang)}`;
}

export function formatDate(iso: string, lang: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[lang], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Dhaka',
  }).format(new Date(iso));
}

const PLACEHOLDER = /(\[\[[^\]]+\]\])/;

/** Splits copy into text and `[[...]]` placeholder parts (rendered highlighted, never hidden). */
export function splitPlaceholders(text: string): { text: string; placeholder: boolean }[] {
  return text
    .split(PLACEHOLDER)
    .filter(Boolean)
    .map((part) => ({ text: part, placeholder: PLACEHOLDER.test(part) }));
}
