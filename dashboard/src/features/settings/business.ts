import type { Schemas } from '@/lib/api';

export type Business = NonNullable<Schemas['UpdateHomeContentDto']['content']['business']>;

export const EMPTY_BUSINESS: Business = {
  legalName: { en: '', bn: '' },
  address: { en: '', bn: '' },
  tradeLicence: '',
  confirmed: false,
};

/** What still blocks publishing: the gateway refuses `confirmed` until all three are filled. */
export function missingBusiness(b: Business): string[] {
  const out: string[] = [];
  if (!b.legalName.en.trim()) out.push('legal business name');
  if (!b.address.en.trim()) out.push('business address');
  if (!b.tradeLicence.trim()) out.push('trade licence number');
  return out;
}

export const LICENCE_PATTERN = /^[\p{L}\p{N} ./-]*$/u;
