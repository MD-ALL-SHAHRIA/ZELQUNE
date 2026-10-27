import { expect, test } from '@playwright/test';
import { uniquePhone } from './helpers';

/** Construction path: page -> start a project -> request code -> track shows type and floors. */
test('a landowner requests a construction call and checks it', async ({ page }) => {
  const phone = uniquePhone();
  await page.goto('/en/construction');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'From the ground up to the last light',
  );
  await expect(page.getByRole('heading', { name: 'What we build' })).toBeVisible();
  // The scroll journey through the six stages ("From land to living").
  await expect(page.getByRole('region', { name: 'From land to living' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Plan & design' })).toBeAttached();
  // The projects section says work is coming, never invented projects.
  await expect(
    page.getByText('Our first construction projects will be shown here soon.'),
  ).toBeVisible();

  await page.getByRole('link', { name: /Start your project/ }).click();
  await expect(page).toHaveURL(/#start$/);

  // Validation runs before anything is sent.
  await page.locator('#b-floors').fill('80');
  await page.getByRole('button', { name: 'Request a call' }).click();
  await expect(page.locator('#b-name')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#b-floors')).toHaveAttribute('aria-invalid', 'true');

  await page.locator('#b-name').fill('Nasrin Akter');
  await page.locator('#b-phone').fill(phone);
  await page.locator('#b-type').selectOption('OTHER');
  await page.locator('#b-floors').fill('6');
  await page.locator('#b-size').fill('2880');
  await page.locator('#b-district').selectOption('dhaka');
  await page.locator('#b-budget').selectOption('CRORE_1_TO_3');
  await page.locator('#b-notes').fill('Six-storey apartment building on 4 katha in Mirpur');
  await page.getByRole('button', { name: 'Request a call' }).click();

  const code = (await page.getByTestId('build-code').textContent())?.trim() ?? '';
  expect(code).toMatch(/^QT-[A-Z0-9]{6}$/);

  await page.getByRole('main').getByRole('link', { name: 'Check your quote' }).click();
  await expect(page).toHaveURL(new RegExp(`/en/bulk/track\\?code=${code}$`));
  await page.locator('#q-phone').fill(phone);
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(page.getByTestId('quote-status')).toHaveText('New (being priced)');
  await expect(page.getByText('Construction request')).toBeVisible();
  await expect(page.getByTestId('quote-building')).toHaveText('Apartment building');
  await expect(page.getByTestId('quote-floors')).toHaveText('6 floors');
});

test('the Bangla construction page renders without sideways scroll', async ({ page }) => {
  await page.goto('/bn/construction');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ভিত থেকে শেষ আলোটা পর্যন্ত');
  await expect(page.locator('#b-type')).toHaveValue('HOME');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
