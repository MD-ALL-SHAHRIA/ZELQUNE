import { expect, test, type Page } from '@playwright/test';

/** Cookie consent: nothing optional before a choice; the choice can be changed at any time. */
test.use({ storageState: { cookies: [], origins: [] } });

const cookieNames = async (page: Page) => (await page.context().cookies()).map((c) => c.name);

/** Collect analytics beacons (POST /v1/events) while `run` executes. */
async function beaconsDuring(page: Page, run: () => Promise<void>) {
  const seen: string[] = [];
  const on = (r: { url: () => string; method: () => string }) => {
    if (r.method() === 'POST' && r.url().includes('/v1/events')) seen.push(r.url());
  };
  page.on('request', on);
  await run();
  await page.waitForTimeout(1500);
  page.off('request', on);
  return seen;
}

test('no analytics before a choice; Reject all keeps it off; settings can turn it on and off', async ({
  page,
}) => {
  const banner = page.getByRole('region', { name: 'Cookies on Zelqune' });
  const before = await beaconsDuring(page, async () => {
    await page.goto('/en/products/alo-arch-panel?utm_source=facebook');
    await expect(banner).toBeVisible();
  });
  expect(before).toEqual([]);
  expect(await cookieNames(page)).not.toContain('zq_sid');
  expect(await cookieNames(page)).not.toContain('zq_utm');

  // Reject all: the banner goes, nothing optional is set, and it stays that way.
  await banner.getByRole('button', { name: 'Reject all' }).click();
  await expect(banner).toBeHidden();
  const rejected = await beaconsDuring(page, async () => {
    await page.goto('/en/products/alo-arch-panel');
  });
  expect(rejected).toEqual([]);
  expect(await cookieNames(page)).not.toContain('zq_sid');
  await expect(banner).toBeHidden();

  // Cookie settings (footer): turn analytics on.
  await page.getByRole('button', { name: 'Cookie settings' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Cookie settings' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('switch', { name: 'Necessary' })).toBeDisabled();
  await dialog.getByRole('switch', { name: 'Analytics' }).check();
  await expect(dialog.getByRole('switch', { name: 'Marketing' })).not.toBeChecked();
  await dialog.getByRole('button', { name: 'Save my choices' }).click();
  await expect(dialog).toBeHidden();
  expect(await cookieNames(page)).toContain('zq_sid');
  const accepted = await beaconsDuring(page, async () => {
    await page.goto('/en/products/alo-arch-panel');
  });
  expect(accepted.length).toBeGreaterThan(0);

  // Withdraw: the analytics cookie is deleted at once.
  await page.getByRole('button', { name: 'Cookie settings' }).first().click();
  await page
    .getByRole('dialog', { name: 'Cookie settings' })
    .getByRole('button', { name: 'Reject all' })
    .click();
  expect(await cookieNames(page)).not.toContain('zq_sid');
});

test('keyboard: the banner is reachable, Customize opens a dialog that Esc closes', async ({
  page,
}) => {
  await page.goto('/en');
  const banner = page.getByRole('region', { name: 'Cookies on Zelqune' });
  await expect(banner).toBeVisible();
  let reached = false;
  for (let i = 0; i < 6 && !reached; i++) {
    await page.keyboard.press('Tab');
    reached = await banner.evaluate((el) => el.contains(document.activeElement));
  }
  expect(reached).toBe(true);
  await banner.getByRole('button', { name: 'Customize' }).focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Cookie settings' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('the Cookie Policy lists the cookies and offers the settings', async ({ page }) => {
  await page.goto('/bn/cookies');
  await expect(page.getByRole('heading', { level: 1, name: 'কুকি নীতি' })).toBeVisible();
  for (const name of ['zq_cart', 'zq_consent', 'zq_sid', 'zq_utm']) {
    await expect(page.getByRole('rowheader', { name })).toBeVisible();
  }
  await expect(page.getByRole('button', { name: 'কুকি সেটিংস' }).first()).toBeVisible();
});
