import { expect, test } from '@playwright/test';

/** Home: the trust strip and the "Find your perfect piece" collections row (from the catalog). */

test.use({ viewport: { width: 1280, height: 800 } });

test('collections come from the catalog, link to their category and scroll with the arrows', async ({
  page,
}) => {
  await page.goto('/en');
  await expect(page.getByRole('region', { name: 'Why Zelqune' })).toContainText('Handcrafted');
  const section = page.getByRole('region', { name: 'Find your perfect piece' });
  const cards = section.getByRole('link').filter({ hasText: /pieces$/ });
  expect(await cards.count()).toBeGreaterThan(0);
  await expect(cards.first()).toHaveAttribute('href', /\/en\/category\//);

  const row = page.locator('#collections-row');
  const before = await row.evaluate((el) => el.scrollLeft);
  await section.getByRole('button', { name: 'Next collections' }).click();
  await expect.poll(() => row.evaluate((el) => el.scrollLeft)).toBeGreaterThan(before);
});
