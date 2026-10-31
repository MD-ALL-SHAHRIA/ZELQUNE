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
