import { expect, test } from '@playwright/test';

/** Phones must never scroll sideways (swipe strips scroll inside their own container). */
const PAGES = [
  '/en',
  '/bn',
  '/en/shop',
  '/bn/products/alo-arch-panel',
  '/en/checkout',
  '/bn/track',
  '/en/bulk',
  '/en/bulk/track',
  '/bn/story',
  '/en/faq',
  '/en/design',
  '/bn/design/restaurant-cafe',
  '/en/category/shelves',
];

for (const path of PAGES) {
  test(`no horizontal overflow on ${path}`, async ({ page }) => {
    await page.goto(path);
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
}

test('the logo links home and the mobile menu opens and closes', async ({ page }) => {
  await page.goto('/en/faq');
  await page.getByRole('link', { name: 'Zelqune' }).first().click();
  await expect(page).toHaveURL(/\/en$/);
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close menu' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
});
