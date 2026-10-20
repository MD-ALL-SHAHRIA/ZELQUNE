import { expect, test } from '@playwright/test';
import { uniquePhone } from './helpers';

/** RFQ path against the real backend: header link -> request -> code -> quote status "New". */
test('a company sends a bulk request and checks its status', async ({ page }) => {
  const phone = uniquePhone();
  await page.goto('/en');
  // Mobile: the header navigation lives in the menu drawer.
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('dialog').getByRole('link', { name: 'Bulk & Corporate' }).click();
  await expect(page).toHaveURL(/\/en\/bulk$/);

  await page.locator('#r-org').fill('E2E Cafe Ltd');
  await page.locator('#r-contact').fill('Nadia Rahman');
  await page.locator('#r-phone').fill(phone);
  await page.locator('#r-qty-0').fill('25');
  await page.locator('#r-desc-0').fill('Walnut, logo engraving');
  await page.getByRole('button', { name: 'Send request' }).click();

  const code = (await page.getByTestId('quote-code').textContent())?.trim() ?? '';
  expect(code).toMatch(/^QT-[A-Z0-9]{6}$/);

  await page.getByRole('main').getByRole('link', { name: 'Check your quote' }).click();
  await expect(page.locator('#q-code')).toHaveValue(code);
  await page.locator('#q-phone').fill(phone);
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(page.getByTestId('quote-status')).toHaveText('New (being priced)');
  await expect(page.locator('section[aria-live]')).toContainText(
    'Alo-Arch Panel: Walnut, logo engraving',
  );
});

test('the bulk page is linked from the footer in Bangla too', async ({ page }) => {
  await page.goto('/bn');
  await page
    .getByRole('contentinfo')
    .getByRole('link', { name: 'বাল্ক / কর্পোরেট অর্ডার' })
    .click();
  await expect(page).toHaveURL(/\/bn\/bulk$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'অফিস, ব্যবসা আর উপহারের জন্য বাল্ক অর্ডার',
  );
});
