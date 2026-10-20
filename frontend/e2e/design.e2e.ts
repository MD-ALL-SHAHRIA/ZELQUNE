import { expect, test } from '@playwright/test';
import { uniquePhone } from './helpers';

/** Interior design path: menu -> sector page -> consultation request -> track shows the space. */
test('a café owner books an interior design consultation and checks it', async ({ page }) => {
  const phone = uniquePhone();
  await page.goto('/en');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('dialog').getByRole('link', { name: 'Interior Design' }).click();
  await expect(page).toHaveURL(/\/en\/design$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Spaces designed around wood and light',
  );

  await page
    .getByRole('link', { name: /Restaurant & Café/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/en\/design\/restaurant-cafe$/);
  // The sector page preselects its space type.
  await expect(page.locator('#c-space')).toHaveValue('RESTAURANT_CAFE');

  await page.locator('#c-name').fill('Rafiq Hasan');
  await page.locator('#c-phone').fill(phone);
  await page.locator('#c-size').fill('1800');
  await page.locator('#c-district').selectOption('dhaka');
  await page.locator('#c-budget').selectOption('LAKH_5_TO_15');
  await page.locator('#c-notes').fill('New café in Dhanmondi, opening in March');
  await page.getByRole('button', { name: 'Request consultation' }).click();

  const code = (await page.getByTestId('consult-code').textContent())?.trim() ?? '';
  expect(code).toMatch(/^QT-[A-Z0-9]{6}$/);

  await page.getByRole('main').getByRole('link', { name: 'Check your quote' }).click();
  await page.locator('#q-phone').fill(phone);
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(page.getByTestId('quote-status')).toHaveText('New (being priced)');
  await expect(page.getByTestId('quote-space')).toHaveText('Space: Restaurant & Café');
});

test('the Bangla design page and its sectors render', async ({ page }) => {
  await page.goto('/bn/design');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('কাঠ আর আলো ঘিরে সাজানো জায়গা');
  await page.goto('/bn/design/home');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('বাসা');
  await expect(page.locator('#c-space')).toHaveValue('HOME');
});
