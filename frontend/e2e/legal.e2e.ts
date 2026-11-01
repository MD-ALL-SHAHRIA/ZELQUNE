import { expect, test } from '@playwright/test';

test('policy pages have a date, headed sections and work in both languages', async ({ page }) => {
  for (const [path, title] of [
    ['/en/privacy', 'Privacy Policy'],
    ['/en/terms', 'Terms and Conditions'],
    ['/en/returns', 'Returns, Refunds and Cancellations'],
    ['/bn/privacy', 'গোপনীয়তা নীতি'],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(page.getByText(/Last updated|সর্বশেষ হালনাগাদ/)).toBeVisible();
    expect(await page.getByRole('heading', { level: 2 }).count()).toBeGreaterThan(3);
  }
});

test('forms say what the details are for and link the privacy policy', async ({ page }) => {
  await page.goto('/en/track');
  const notice = page.getByText('are used only to find your order');
  await expect(notice).toBeVisible();
  await notice.getByRole('link', { name: 'Privacy Policy' }).click();
  await expect(page).toHaveURL(/\/en\/privacy$/);
});

test('privacy request: validates inline, then confirms with a code and next steps', async ({
  page,
}) => {
  await page.goto('/en/privacy-request');
  await page.getByLabel('Correct my data').check();
  await page.getByRole('button', { name: 'Send request' }).click();
  await expect(page.getByText("That mobile number doesn't look right")).toBeVisible();
  await expect(page.getByText('Tell us what should be corrected.')).toBeVisible();
  await expect(page.locator('#pr-phone')).toBeFocused();

  await page.locator('#pr-phone').fill('01712345678');
  await page.getByLabel('What should be corrected?').fill('My name is spelt wrong');
  await expect(page.getByRole('link', { name: 'Privacy Policy' }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Send request' }).click();
  const code = page.getByTestId('privacy-code');
  await expect(code).toHaveText(/^PR-[A-Z0-9]{6}$/);
  await expect(page.getByText('Nothing is shown, changed or deleted before that.')).toBeVisible();

  await page.getByLabel('Request code (PR-XXXXXX)').fill((await code.textContent()) ?? '');
  await page.locator('#prt-phone').fill('01712345678');
  await page.getByRole('button', { name: 'Check status' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Received' })).toBeVisible();
});
