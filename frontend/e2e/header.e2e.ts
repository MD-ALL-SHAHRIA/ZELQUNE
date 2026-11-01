import { expect, test } from '@playwright/test';

test('category tabs mark the current section', async ({ page }) => {
  await page.goto('/en/shop');
  const tabs = page.getByRole('navigation', { name: 'Shop', exact: true });
  await expect(tabs.getByRole('link', { name: 'All products' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await tabs.getByRole('link', { name: 'Bulk & Corporate' }).click();
  await expect(page).toHaveURL(/\/en\/bulk$/);
  await expect(tabs.getByRole('link', { name: 'Bulk & Corporate' })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('search finds products by English name and Enter opens the first result', async ({ page }) => {
  await page.goto('/en/faq');
  await page.getByRole('button', { name: 'Search' }).click();
  const dialog = page.getByRole('dialog', { name: 'Search' });
  await expect(dialog).toBeVisible();
  const input = dialog.getByRole('combobox', { name: 'Search' });
  await expect(input).toBeFocused();
  await input.fill('SHELF');
  await expect(dialog.getByRole('option', { name: /Wave Shelf/ })).toBeVisible();
  await expect(dialog.getByRole('option', { name: /Lighting|Capsule/ })).toHaveCount(0);
  await input.press('Enter');
  await expect(page).toHaveURL(/\/en\/products\/[a-z0-9-]+$/);
  await expect(dialog).toBeHidden();
});

test('search matches Bangla names, finds service pages and shows an empty state', async ({
  page,
}) => {
  await page.goto('/bn');
  await page.getByRole('button', { name: 'খুঁজুন' }).click();
  const dialog = page.getByRole('dialog');
  const input = dialog.getByRole('combobox');
  await input.fill('শেলফ');
  await expect(dialog.getByRole('option', { name: /ওয়েভ শেলফ/ })).toBeVisible();
  // English words find Bangla pages too.
  await input.fill('construction');
  await expect(dialog.getByRole('option', { name: 'নির্মাণ' })).toBeVisible();
  await input.fill('zzzz');
  await expect(dialog.getByText('"zzzz" দিয়ে কিছু পাওয়া যায়নি।')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('the account icon asks a signed-out visitor to sign in', async ({ page }) => {
  await page.goto('/en');
  await page.getByRole('banner').getByRole('link', { name: 'Account' }).click();
  await expect(page).toHaveURL(/\/en\/account\/login\?next=/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sign in');
});

test('the menu lists services and the language switch', async ({ page }) => {
  await page.goto('/en/story');
  await page.getByRole('button', { name: 'Menu' }).click();
  const menu = page.getByRole('dialog');
  await expect(menu.getByRole('link', { name: 'Construction' })).toBeVisible();
  await expect(menu.getByRole('link', { name: 'Our story' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(menu.getByRole('navigation', { name: 'Language' })).toBeVisible();
});
