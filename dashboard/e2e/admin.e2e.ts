import { expect, test } from '@playwright/test';

const phone = process.env.E2E_ADMIN_PHONE;
const password = process.env.E2E_ADMIN_PASSWORD;

test.skip(!phone || !password, 'E2E_ADMIN_PHONE / E2E_ADMIN_PASSWORD not set');

test('sign in, see the overview, edit and save the home page', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Phone').fill(phone ?? '');
  await page.getByLabel('Password').fill(password ?? '');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
  await expect(page.getByText('GO counter', { exact: true })).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Main' });

  await nav.getByRole('link', { name: 'Home page', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Home page' })).toBeVisible();
  const announcement = page.getByLabel('Text (English)');
  const original = await announcement.inputValue();
  await announcement.fill(`${original} `);
  await announcement.fill(original);
  await page.getByRole('button', { name: 'Save changes' }).first().click();
  await expect(page.getByText(/^Saved\./)).toBeVisible();
  await expect(page.getByText(/^Version \d+/)).toBeVisible();

  await nav.getByRole('link', { name: 'Orders', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Orders' })).toBeVisible();
});
