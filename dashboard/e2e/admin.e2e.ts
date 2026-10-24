import { expect, test } from '@playwright/test';

const phone = process.env.E2E_ADMIN_PHONE;
const password = process.env.E2E_ADMIN_PASSWORD;

test.skip(!phone || !password, 'E2E_ADMIN_PHONE / E2E_ADMIN_PASSWORD not set');

test('sign in, see home, edit the home page with the save bar, open orders', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Phone').fill(phone ?? '');
  await page.getByLabel('Password', { exact: true }).fill(password ?? '');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    /^Good (morning|afternoon|evening)/,
  );
  await expect(page.getByRole('heading', { name: 'GO counter' })).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Main' });

  // Edit: the save bar appears; discard puts the text back; save stores a new version.
  await nav.getByRole('link', { name: 'Home page', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Home page' })).toBeVisible();
  const text = page.getByRole('textbox').first();
  const original = await text.inputValue();
  await text.fill(`${original} ✦`);
  await expect(page.getByText('Unsaved changes to the home page')).toBeVisible();
  await page.getByRole('button', { name: 'Discard' }).click();
  await expect(text).toHaveValue(original);
  await expect(page.getByText('Unsaved changes to the home page')).toBeHidden();

  // ⌘K jumps to orders.
  await page.keyboard.press('ControlOrMeta+k');
  await page.getByRole('textbox', { name: 'Search' }).fill('orders');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Orders' })).toBeVisible();
  await expect(page.getByRole('tablist', { name: 'Order status' })).toBeVisible();
});
