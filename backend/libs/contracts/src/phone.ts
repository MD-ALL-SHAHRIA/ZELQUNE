import { z } from 'zod';

/** Canonical Bangladeshi mobile number: +880 1[3-9] XXXXXXXX (e.g. +8801712345678). */
export const BD_PHONE_E164 = /^\+8801[3-9]\d{8}$/;

const BANGLA_DIGITS = '০১২৩৪৫৬৭৮৯';

/**
 * Normalises user input to E.164 (`+8801XXXXXXXXX`) or returns null.
 * Accepts 01XXXXXXXXX, 8801…, +8801…, 008801…, +880 01…, spaces/dashes/dots/parentheses,
 * and Bangla digits (০-৯). Only mobile operator prefixes 013–019 are valid.
 */
export function normalizeBdPhone(input: string): string | null {
  const ascii = input.replace(/[০-৯]/g, (d) => String(BANGLA_DIGITS.indexOf(d)));
  let digits = ascii.replace(/[\s\-().]/g, '');
  if (!/^\+?\d+$/.test(digits)) return null;

  digits = digits.replace(/^\+/, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('880')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);

  return /^1[3-9]\d{8}$/.test(digits) ? `+880${digits}` : null;
}

/** zod schema: accepts any supported format, outputs E.164. */
export const bdPhoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .transform((value, ctx) => {
    const normalized = normalizeBdPhone(value);
    if (!normalized) {
      ctx.addIssue({ code: 'custom', message: 'Must be a Bangladeshi mobile number (01XXXXXXXXX)' });
      return z.NEVER;
    }
    return normalized;
  })
  .meta({ example: '01712345678' });
