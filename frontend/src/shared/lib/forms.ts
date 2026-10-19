import { ApiError } from './api-types';

const BANGLA_DIGITS = '০১২৩৪৫৬৭৮৯';

/** Bangla digits -> ASCII (people type ০১৭… on Bangla keyboards). */
export function asciiDigits(value: string): string {
  return value.replace(/[০-৯]/g, (d) => String(BANGLA_DIGITS.indexOf(d)));
}

/** Same rule as the gateway's bdPhoneSchema: returns 01XXXXXXXXX or null. */
export function normalizePhone(input: string): string | null {
  let digits = asciiDigits(input).replace(/[\s\-().]/g, '');
  if (!/^\+?\d+$/.test(digits)) return null;
  digits = digits.replace(/^\+/, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('880')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return /^1[3-9]\d{8}$/.test(digits) ? `0${digits}` : null;
}

/** Same rule as the gateway's trxIdSchema. */
export function normalizeTrxId(input: string): string | null {
  const value = asciiDigits(input).replace(/[\s-]/g, '').toUpperCase();
  return /^[A-Z0-9]{6,20}$/.test(value) ? value : null;
}

export const ORDER_CODE = /^ZQ-[A-Z0-9]{6}$/;
export const QUOTE_CODE = /^QT-[A-Z0-9]{6}$/;

export function normalizeCode(input: string): string {
  return asciiDigits(input).trim().toUpperCase().replace(/\s/g, '');
}

/** Field paths the gateway rejected (VALIDATION_FAILED details), e.g. "customer.phone". */
export function invalidFields(error: unknown): string[] {
  if (!(error instanceof ApiError) || error.code !== 'VALIDATION_FAILED') return [];
  return error.details.map((d) => d.path.join('.'));
}

export interface CheckoutErrorCopy {
  phone: string;
  trxUsed: string;
  outOfStock: string;
  generic: string;
  turnstile: string;
  priceChanged: string;
  rateLimited: string;
  trxRequired: string;
}

/** Gateway error code -> the copy's message for the checkout form. */
export function checkoutErrorText(error: unknown, copy: CheckoutErrorCopy): string {
  if (!(error instanceof ApiError)) return copy.generic;
  switch (error.code) {
    case 'TRX_ID_ALREADY_USED':
      return copy.trxUsed;
    case 'TRX_ID_REQUIRED':
      return copy.trxRequired;
    case 'OUT_OF_STOCK':
    case 'VARIANT_NOT_AVAILABLE':
    case 'CART_HAS_UNAVAILABLE_ITEMS':
      return copy.outOfStock;
    case 'INVALID_PHONE':
      return copy.phone;
    case 'TURNSTILE_FAILED':
    case 'TURNSTILE_REQUIRED':
      return copy.turnstile;
    case 'PRICE_CHANGED':
      return copy.priceChanged;
    case 'TOO_MANY_REQUESTS':
      return copy.rateLimited;
    case 'VALIDATION_FAILED':
      return invalidFields(error).some((f) => f.endsWith('phone')) ? copy.phone : copy.generic;
    default:
      return copy.generic;
  }
}
