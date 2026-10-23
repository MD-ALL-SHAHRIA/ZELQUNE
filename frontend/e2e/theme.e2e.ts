import { expect, test } from '@playwright/test';

/** Day (soft cream, the default) and night (Dark Walnut) themes. */

// A dark system setting must not matter: day is the default. Desktop width: on phones the
// toggle lives in the menu.
test.use({ colorScheme: 'dark', viewport: { width: 1280, height: 800 } });

test('day by default; the visitor can pick night and it is kept', async ({ page }) => {
  await page.goto('/en');
  const html = page.locator('html');
  const bg = () => html.evaluate((el) => getComputedStyle(el).backgroundColor);
  await expect(html).not.toHaveAttribute('data-theme', /./);
  expect(await bg()).toBe('rgb(247, 241, 232)');

  const toggle = page.getByTestId('theme-toggle');
  await expect(toggle).toHaveAccessibleName('Switch to dark mode');
  await toggle.click();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  expect(await bg()).toBe('rgb(20, 17, 15)');

  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await page.getByTestId('theme-toggle').click();
  await expect(html).not.toHaveAttribute('data-theme', /./);
  expect(await bg()).toBe('rgb(247, 241, 232)');
});
