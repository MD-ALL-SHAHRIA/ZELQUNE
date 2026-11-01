import { expect, test } from '@playwright/test';
import { fillCheckout, uniquePhone, uniqueTrxId, signInCustomer } from './helpers';

/**
 * Checkout path against the real backend (Docker stack, `pnpm seed`): a visitor from an ad
 * with ?p=b still sees the base ৳3,490 in Bangla (the price experiment is off at launch),
 * pre-orders with a bKash advance, and tracks the order.
 */
test('pre-order with a bKash advance, then track it', async ({ page }) => {
  await signInCustomer(page);
  const phone = uniquePhone();

  await page.goto('/bn/products/alo-arch-panel?p=b');
  await expect(page.getByTestId('price')).toHaveText('৳৩,৪৯০');
  await expect(page.locator('[data-sale-mode="PRE_ORDER"]')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('স্টকে আছে');

  // Delivery fee estimate for the product page.
  await page.locator('#estimate-district').selectOption('chattogram');
  await expect(page.getByTestId('delivery-estimate')).toContainText('৳');

  // No experiment: another arm in the link changes nothing either.
  await page.goto('/bn/products/alo-arch-panel?p=a');
  await expect(page.getByTestId('price')).toHaveText('৳৩,৪৯০');

  // The panel button and the mobile sticky bar share the label; either places the pre-order.
  await page.getByRole('button', { name: 'এখনই প্রি-অর্ডার করুন' }).first().click();
  await expect(page).toHaveURL(/\/bn\/checkout$/);

  await fillCheckout(page, {
    name: 'E2E Test',
    phone,
    district: 'dhaka',
    area: 'Mirpur',
    line: 'House 1, Road 2, Mirpur 10',
  });
  // Pre-order: COD is not offered; the ৳300 advance and the bKash number come from the API.
  await expect(page.getByLabel('ক্যাশ অন ডেলিভারি')).toHaveCount(0);
  await page.getByLabel('bKash অগ্রিম').check();
  await expect(page.getByTestId('pay-now')).toHaveText('৳৩০০');
  await expect(page.getByTestId('advance-instructions')).toContainText('৳৩০০');
  await page.locator('#f-trxId').fill(uniqueTrxId());
  await page.getByRole('button', { name: 'অর্ডার করুন', exact: true }).click();

  await expect(page).toHaveURL(/\/bn\/order\/ZQ-[A-Z0-9]{6}$/);
  const code = (await page.getByTestId('order-code').textContent())?.trim() ?? '';
  expect(code).toMatch(/^ZQ-[A-Z0-9]{6}$/);

  await page.getByRole('link', { name: 'অর্ডার ট্র্যাক করুন' }).click();
  await expect(page.locator('#t-code')).toHaveValue(code);
  await page.locator('#t-phone').fill(phone);
  await page.getByRole('button', { name: 'দেখুন', exact: true }).click();
  await expect(page.getByTestId('order-status')).toHaveText('পেমেন্ট যাচাই হচ্ছে');
  await expect(page.locator('section[aria-live]')).toContainText('৳৩,৪৯০');

  // The order is linked to the account and shows in My account (ADR 0021).
  await page.goto('/bn/account');
  await expect(page.getByText(code)).toBeVisible();
});

test('a visitor with no ?p sees the base price, which equals arm a (৳3,490)', async ({ page }) => {
  await page.goto('/en/products/alo-arch-panel');
  await expect(page.getByTestId('price')).toHaveText('৳3,490');
});

test('checkout asks a signed-out visitor to sign in first', async ({ page }) => {
  await page.goto('/en/checkout');
  await expect(page.getByRole('heading', { name: 'Sign in to continue' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
    'href',
    /\/en\/account\/login\?next=%2Fen%2Fcheckout/,
  );
});
