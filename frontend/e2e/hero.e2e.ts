import { expect, test } from '@playwright/test';

/** The cinematic hero: room scenes with our pieces, arrows, bars and a pause button. */

test.use({ viewport: { width: 1280, height: 800 } });

test('arrows and bars change the scene; pause holds it', async ({ page }) => {
  await page.goto('/en');
  const hero = page.locator('section.hero-root');
  const caption = hero.locator('.scene-caption');
  const bars = hero.getByRole('button', { name: /^Show / });
  await expect(bars.first()).toHaveAttribute('aria-current', 'true');
  const first = (await caption.textContent())?.trim() ?? '';

  await hero.getByRole('button', { name: 'Next scene' }).click();
  await expect(caption).not.toHaveText(first);
  await expect(bars.nth(1)).toHaveAttribute('aria-current', 'true');
  await hero.getByRole('button', { name: 'Previous scene' }).click();
  await expect(caption).toHaveText(first);

  const target = bars.last();
  const name = ((await target.getAttribute('aria-label')) ?? '').replace(/^Show /, '');
  await target.click();
  await expect(caption).toHaveText(name);
  await expect(hero.getByRole('link', { name: 'View piece' })).toHaveAttribute(
    'href',
    /\/en\/products\//,
  );

  await hero.getByRole('button', { name: 'Pause the wall' }).click();
  await expect(hero.getByRole('button', { name: 'Play the wall' })).toBeVisible();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(7000);
  await expect(caption).toHaveText(name);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the hero never moves by itself', async ({ page }) => {
    await page.goto('/en');
    const caption = page.locator('section.hero-root .scene-caption');
    const first = (await caption.textContent())?.trim() ?? '';
    await page.mouse.move(0, 0);
    await page.waitForTimeout(7500);
    await expect(caption).toHaveText(first);
  });
});
