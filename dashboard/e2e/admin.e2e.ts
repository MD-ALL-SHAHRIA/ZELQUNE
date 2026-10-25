import { expect, test } from '@playwright/test';

const phone = process.env.E2E_ADMIN_PHONE;
const password = process.env.E2E_ADMIN_PASSWORD;

test.skip(!phone || !password, 'E2E_ADMIN_PHONE / E2E_ADMIN_PASSWORD not set');

// One sign-in for the whole flow: the gateway allows 5 logins per 15 minutes per IP.
test('sign in, home, edit the home page, orders, a coupon, settings and finance', async ({
  page,
}) => {
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

  // Edit: the save bar appears; discard puts the text back.
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

  // Marketing: a coupon is created, listed and deleted (unused, so really removed).
  await nav.getByRole('link', { name: 'Coupons' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Coupons' })).toBeVisible();
  await page.getByRole('button', { name: 'Create coupon' }).click();
  const code = `E2E-${Date.now().toString(36).toUpperCase()}`;
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: /^Code/ }).fill(code);
  await dialog.getByRole('button', { name: 'Create coupon' }).click();
  await expect(page.getByText(code, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: `Delete ${code}` }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText(code, { exact: true })).toBeHidden();

  // Settings: change the Inside-Dhaka delivery fee, save, see it kept, then put it back.
  await nav.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
  await page.getByRole('navigation', { name: 'Settings sections' }).getByText('Shipping').click();
  const dhaka = page.getByRole('spinbutton', { name: 'Inside Dhaka (৳)' });
  const before = await dhaka.inputValue();
  await dhaka.fill(String(Number(before) + 5));
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Settings saved', { exact: false })).toBeVisible();
  await page.reload();
  await expect(dhaka).toHaveValue(String(Number(before) + 5));
  await dhaka.fill(before);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(dhaka).toHaveValue(before);

  // Finance is there for the owner.
  await nav.getByRole('link', { name: 'Profit and loss' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Profit and loss' })).toBeVisible();
  await expect(page.getByText('Net profit', { exact: true }).first()).toBeVisible();
});
