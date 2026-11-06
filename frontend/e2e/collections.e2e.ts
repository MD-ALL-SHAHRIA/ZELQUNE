import { expect, test } from '@playwright/test';

/** Home: the trust strip and the "Find your perfect piece" collections row (from the catalog). */

test.use({ viewport: { width: 1280, height: 800 } });

test('collections come from the catalog, each an arch that links to its category', async ({
  page,
}) => {
  await page.goto('/en');
  await expect(page.getByRole('region', { name: 'Why Zelqune' })).toContainText('Handcrafted');
  const section = page.getByRole('region', { name: 'Find your perfect piece' });
  const cards = section.getByRole('link').filter({ hasText: /pieces$/ });
  expect(await cards.count()).toBeGreaterThan(0);
  await expect(cards.first()).toHaveAttribute('href', /\/en\/category\//);
  // Each collection name is a heading, and every card is fully in view on desktop (no carousel).
  await expect(section.getByRole('heading', { level: 3 }).first()).toBeVisible();
  for (const card of await cards.all()) {
    const box = await card.boundingBox();
    expect(box && box.x >= 0 && box.x + box.width <= 1280).toBe(true);
  }
});
