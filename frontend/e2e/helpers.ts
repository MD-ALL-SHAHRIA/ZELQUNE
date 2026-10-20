import { type Page } from '@playwright/test';

/** Unique 11-digit BD mobile and trxId per run, so reruns never collide. */
export function uniquePhone(): string {
  return `017${String(Date.now()).slice(-8)}`;
}
export function uniqueTrxId(): string {
  return `E2E${Date.now().toString(36).toUpperCase()}`.slice(0, 20);
}

export async function fillCheckout(
  page: Page,
  input: { name: string; phone: string; district: string; area: string; line: string },
) {
  await page.locator('#f-name').fill(input.name);
  await page.locator('#f-phone').fill(input.phone);
  await page.locator('#f-district').selectOption(input.district);
  await page.locator('#f-area').fill(input.area);
  await page.locator('#f-line').fill(input.line);
}
