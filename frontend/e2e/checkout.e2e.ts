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
  // The latest arrival date (lead time + courier time for the district), worked out in the browser.
  await expect(page.getByTestId('arrival')).toContainText('পৌঁছানোর শেষ তারিখ');

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
  // Pre-order: the bKash advance comes first and is chosen; cash on delivery is offered too
  // (owner setting, on by default) and takes nothing now.
  await expect(page.getByLabel('bKash অগ্রিম')).toBeChecked();
  await page.getByLabel('ক্যাশ অন ডেলিভারি').check();
  await expect(page.getByTestId('pay-now')).toHaveCount(0);
  await expect(page.getByTestId('pay-later')).toHaveText('৳৩,৬৬০');
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

test('pre-order with cash on delivery: no advance, the whole total on delivery', async ({
  page,
}) => {
  await signInCustomer(page);
  await page.goto('/en/products/alo-arch-panel');
  await page.getByRole('button', { name: 'Pre-order now' }).first().click();
  await expect(page).toHaveURL(/\/en\/checkout$/);
  await fillCheckout(page, {
    name: 'E2E Cod',
    phone: uniquePhone(),
    district: 'dhaka',
    area: 'Mirpur',
    line: 'House 1, Road 2, Mirpur 10',
  });
  await page.getByLabel('Cash on delivery').check();
  await expect(page.getByTestId('advance-instructions')).toHaveCount(0);
  await expect(page.getByTestId('pay-now')).toHaveCount(0);
  await expect(page.getByTestId('pay-later')).toHaveText(
    await page.getByTestId('total').innerText(),
  );
  await page.getByRole('button', { name: 'Place order', exact: true }).click();
  await expect(page).toHaveURL(/\/en\/order\/ZQ-[A-Z0-9]{6}$/);
});

test('a visitor with no ?p sees the base price, which equals arm a (৳3,490)', async ({ page }) => {
  await page.goto('/en/products/alo-arch-panel');
  await expect(page.getByTestId('price')).toHaveText('৳3,490');
});

test('a guest orders with name and phone (no account) and tracks the order', async ({ page }) => {
  const phone = uniquePhone();
  await page.goto('/en/products/alo-arch-panel');
  await page.getByRole('button', { name: 'Pre-order now' }).first().click();
  await expect(page).toHaveURL(/\/en\/checkout$/);
  // Signing in is offered, never required (ADR 0023).
  await expect(page.getByTestId('guest-hint').getByRole('link')).toHaveAttribute(
    'href',
    /\/en\/account\/login\?next=%2Fen%2Fcheckout/,
  );
  await fillCheckout(page, {
    name: 'E2E Guest',
    phone,
    district: 'dhaka',
    area: 'Mirpur',
    line: 'House 1, Road 2, Mirpur 10',
  });
  await page.getByLabel('Cash on delivery').check();
  await page.getByRole('button', { name: 'Place order', exact: true }).click();
  await expect(page).toHaveURL(/\/en\/order\/ZQ-[A-Z0-9]{6}$/);
  const code = (await page.getByTestId('order-code').textContent())?.trim() ?? '';

  await page.goto(`/en/track?code=${code}`);
  await page.locator('#t-phone').fill(phone);
  await page.getByRole('button', { name: 'Track', exact: true }).click();
  await expect(page.getByTestId('order-status')).toBeVisible();
});
