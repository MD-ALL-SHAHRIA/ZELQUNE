import { expect, test } from '@playwright/test';

/** The hero gallery of walls: bars choose a wall, a waiting wall comes forward, pause holds. */

test('the wall shows a piece, the bars switch pieces and pause holds the wall', async ({
  page,
}) => {
  await page.goto('/en');
  const hero = page.locator('section.hero-wall-root');
  const caption = hero.locator('.wall-caption');
  const first = (await caption.textContent())?.trim() ?? '';
  expect(first).not.toBe('');

  const bars = hero.getByRole('button', { name: /^Show / });
  await expect(bars.first()).toHaveAttribute('aria-current', 'true');
  const target = bars.nth(2);
  const name = ((await target.getAttribute('aria-label')) ?? '').replace(/^Show /, '');
  await target.click();
  await expect(caption).toHaveText(name);
  await expect(target).toHaveAttribute('aria-current', 'true');

  await hero.getByRole('button', { name: 'Pause the wall' }).click();
  await expect(hero.getByRole('button', { name: 'Play the wall' })).toBeVisible();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(5500);
  await expect(caption).toHaveText(name);
});

test('clicking a waiting wall brings it to the front instead of leaving the page', async ({
  page,
}) => {
  await page.goto('/en');
  const hero = page.locator('section.hero-wall-root');
  const waiting = hero.locator('.gallery-wall-back a').first();
  await waiting.waitFor();
  const name = (await waiting.getAttribute('aria-label')) ?? '';
  await waiting.click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(hero.locator('.wall-caption')).toHaveText(name);
  await expect(hero.locator('.gallery-wall-front a')).toHaveAttribute('aria-label', name);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the wall never moves by itself', async ({ page }) => {
    await page.goto('/en');
    const caption = page.locator('section.hero-wall-root .wall-caption');
    const first = (await caption.textContent())?.trim() ?? '';
    await page.mouse.move(0, 0);
    await page.waitForTimeout(6000);
    await expect(caption).toHaveText(first);
  });
});
