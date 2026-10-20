import { expect, type Page, test } from '@playwright/test';

/**
 * Listing pages (shop + categories) and the product page's "you may also like" row, against the
 * seeded catalog. Filters and sort run in the browser on the ISR page.
 */
const items = (page: Page) => page.getByTestId('product-grid').locator('> li');

async function prices(page: Page): Promise<number[]> {
  return items(page).evaluateAll((els) => els.map((el) => Number(el.getAttribute('data-price'))));
}

async function noSideScroll(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

test('shop: all products, availability filter, sort and clear', async ({ page }) => {
  await page.goto('/en/shop');
  await expect(page.getByRole('heading', { level: 1, name: 'All products' })).toBeVisible();
  const pills = page.getByRole('navigation', { name: 'Shop by category' });
  await expect(pills.getByRole('link', { name: 'All products' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await noSideScroll(page);

  const total = await items(page).count();
  expect(total).toBeGreaterThan(1);
  const count = page.getByTestId('results-count').filter({ visible: true });
  await expect(count).toHaveText(`${total} products`);

  // Every card links to its product page and shows its finishes.
  for (const link of await items(page).getByRole('link').all()) {
    await expect(link).toHaveAttribute('href', /^\/en\/products\/[a-z0-9-]+$/);
  }
  await expect(items(page).first()).toContainText(/finish/);

  // Availability: made to order only.
  await page.getByRole('combobox', { name: 'Availability' }).selectOption('madeToOrder');
  const modes = await items(page).evaluateAll((els) =>
    els.map((el) => el.getAttribute('data-sale-mode-item')),
  );
  expect(modes.length).toBeGreaterThan(0);
  expect(modes.length).toBeLessThan(total);
  expect(new Set(modes)).toEqual(new Set(['MADE_TO_ORDER']));
  await expect(count).toHaveText(`${modes.length} products`);
  await expect(page).toHaveURL(/availability=madeToOrder/);

  // Clear, then sort by price.
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(items(page)).toHaveCount(total);
  await page.getByRole('combobox', { name: 'Sort' }).selectOption('priceAsc');
  const asc = await prices(page);
  expect(asc).toEqual([...asc].sort((a, b) => a - b));
  await page.getByRole('combobox', { name: 'Sort' }).selectOption('priceDesc');
  const desc = await prices(page);
  expect(desc).toEqual([...desc].sort((a, b) => b - a));

  // The choice survives a reload (read back from the URL after hydration).
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Sort' })).toHaveValue('priceDesc');
});

test('each category page has its own hero, active pill and products', async ({ page }) => {
  await page.goto('/en/category/shelves');
  await expect(page.getByTestId('listing-hero')).toHaveAttribute('data-category', 'shelves');
  await expect(page.getByRole('heading', { level: 1, name: 'Shelves' })).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Shop' }),
  ).toBeVisible();
  const pills = page.getByRole('navigation', { name: 'Shop by category' });
  await expect(pills.getByRole('link', { name: 'Shelves' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(pills.getByRole('link', { name: 'Lighting' })).not.toHaveAttribute(
    'aria-current',
    'page',
  );
  const shelvesHero = await page
    .getByTestId('listing-hero')
    .locator('img')
    .first()
    .getAttribute('src');
  await noSideScroll(page);

  // Pre-order and made-to-order products never say "in stock".
  const modes = await items(page).evaluateAll((els) =>
    els.map((el) => el.getAttribute('data-sale-mode-item')),
  );
  if (!modes.includes('IN_STOCK'))
    await expect(page.locator('main')).not.toContainText(/in stock/i);

  await pills.getByRole('link', { name: 'Lighting' }).click();
  await expect(page).toHaveURL(/\/en\/category\/lighting$/);
  await expect(page.getByTestId('listing-hero')).toHaveAttribute('data-category', 'lighting');
  const lightingHero = await page
    .getByTestId('listing-hero')
    .locator('img')
    .first()
    .getAttribute('src');
  expect(lightingHero).not.toEqual(shelvesHero);
});

test('Bangla category page: no side scroll, Bangla toolbar', async ({ page }) => {
  await page.goto('/bn/category/lighting');
  await expect(page.getByRole('heading', { level: 1, name: 'আলো' })).toBeVisible();
  await expect(page.getByTestId('results-count').filter({ visible: true })).toContainText(
    'টি পণ্য',
  );
  await noSideScroll(page);
});

test('product page suggests other products', async ({ page }) => {
  await page.goto('/en/products/wave-shelf');
  const related = page.getByTestId('related-products');
  await expect(related).toBeVisible();
  const hrefs = await related
    .getByRole('link')
    .evaluateAll((els) => els.map((el) => el.getAttribute('href')));
  const products = hrefs.filter((h) => h?.startsWith('/en/products/'));
  expect(products.length).toBeGreaterThan(0);
  expect(products).not.toContain('/en/products/wave-shelf');
  await expect(page.getByTestId('price')).toBeVisible();
  await noSideScroll(page);
});
