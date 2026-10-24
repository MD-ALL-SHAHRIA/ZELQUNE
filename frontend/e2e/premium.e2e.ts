import { expect, test } from '@playwright/test';

/** Premium build: shop the room, the wall preview and the mobile sticky purchase bar. */

test('shop the room: a marker opens its piece and Esc closes it', async ({ page }) => {
  await page.goto('/en');
  const room = page.getByRole('region', { name: 'One room, lit by Zelqune' });
  const marker = room.locator('button[aria-expanded]').first();
  await marker.scrollIntoViewIfNeeded();
  await marker.click();
  await expect(marker).toHaveAttribute('aria-expanded', 'true');
  const card = page.locator(`#${await marker.getAttribute('aria-controls')}`);
  await expect(card.getByRole('link', { name: /View piece/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(marker).toHaveAttribute('aria-expanded', 'false');
  await expect(marker).toBeFocused();
});

test('see it on your wall: opens with a sample wall and the piece can be resized', async ({
  page,
}) => {
  await page.goto('/en/products/wave-shelf');
  await page.getByRole('button', { name: 'See it on your wall' }).click();
  const dialog = page.getByRole('dialog', { name: 'See it on your wall' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Try a sample wall' }).click();
  const size = dialog.getByRole('slider', { name: 'Size' });
  const before = await size.inputValue();
  await size.focus();
  await page.keyboard.press('ArrowRight');
  await expect(size).not.toHaveValue(before);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('the sticky purchase bar appears once the main button scrolls away', async ({ page }) => {
  await page.goto('/en/products/wave-shelf');
  await expect(page.locator('[data-sticky-bar]')).toHaveCount(0);
  await page.getByTestId('related-products').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-sticky-bar]')).toBeVisible();
});

test('no WhatsApp button without a configured number', async ({ page }) => {
  await page.goto('/bn');
  await expect(page.getByTestId('whatsapp-fab')).toHaveCount(0);
});
