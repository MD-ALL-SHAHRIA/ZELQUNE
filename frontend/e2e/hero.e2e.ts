import { expect, test } from '@playwright/test';

/** The hero slides: our panels, then interior design, construction and bulk orders. */

test.use({ viewport: { width: 1280, height: 800 } });

const current = (page: import('@playwright/test').Page) =>
  page.locator('section.hero-root section.slide-on');

test('arrows and bars change the slide; pause holds it', async ({ page }) => {
  await page.goto('/en');
  const hero = page.locator('section.hero-root');
  const bars = hero.getByRole('button', { name: /^Show / });
  await expect(bars).toHaveCount(4);
  await expect(bars.first()).toHaveAttribute('aria-current', 'true');
  const first = await current(page).getAttribute('aria-label');

  await hero.getByRole('button', { name: 'Next scene' }).click();
  await expect(bars.nth(1)).toHaveAttribute('aria-current', 'true');
  await expect(current(page).getByRole('heading', { name: 'Designed spaces' })).toBeVisible();
  await expect(current(page).getByRole('link', { name: /Book a consultation/ })).toHaveAttribute(
    'href',
    /\/en\/design#consult$/,
  );
  await hero.getByRole('button', { name: 'Previous scene' }).click();
  await expect(current(page)).toHaveAttribute('aria-label', first ?? '');

  await bars.last().click();
  await expect(current(page).getByRole('heading', { name: 'Panels at scale' })).toBeVisible();

  await hero.getByRole('button', { name: 'Pause the wall' }).click();
  await expect(hero.getByRole('button', { name: 'Play the wall' })).toBeVisible();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(8000);
  await expect(bars.last()).toHaveAttribute('aria-current', 'true');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('slide 1 (it never moves by itself here) shows the panels and links to a piece', async ({
    page,
  }) => {
    await page.goto('/en');
    const slide = current(page);
    await expect(slide.locator('p[aria-label="Wood Light"]')).toBeVisible();
    await expect(slide.getByRole('link', { name: /Explore the collection/ })).toHaveAttribute(
      'href',
      /\/en\/shop$/,
    );
    await expect(slide.locator('a[href*="/en/products/"]').first()).toBeVisible();
  });

  test('the hero never moves by itself', async ({ page }) => {
    await page.goto('/en');
    const first = await current(page).getAttribute('aria-label');
    await page.mouse.move(0, 0);
    await page.waitForTimeout(8000);
    await expect(current(page)).toHaveAttribute('aria-label', first ?? '');
  });
});
