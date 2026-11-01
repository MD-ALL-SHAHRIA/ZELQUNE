import { expect, test, type Page } from '@playwright/test';

const MAILPIT = 'http://localhost:8025';

/** The newest email to `to` in Mailpit (the dev and CI inbox), as plain text. */
async function lastEmailText(page: Page, to: string): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const res = await page.request.get(
      `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`,
    );
    const list = (await res.json()) as { messages?: { ID: string }[] };
    const id = list.messages?.[0]?.ID;
    if (id) {
      const msg = (await (await page.request.get(`${MAILPIT}/api/v1/message/${id}`)).json()) as {
        Text: string;
      };
      return msg.Text;
    }
    await page.waitForTimeout(250);
  }
  throw new Error(`no email to ${to}`);
}

test('account: register, confirm by email, portal, sign out, sign in again', async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;
  const phone = `017${String(Date.now()).slice(-8)}`;
  const password = 'walnut lamp by the window';

  // Signed-out visitors are sent to sign in, then brought back.
  await page.goto('/en/account');
  await expect(page).toHaveURL(/\/en\/account\/login\?next=/);
  await page.getByRole('link', { name: 'Create an account' }).click();

  // Inline validation names the exact field and how to fix it.
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Enter your full name.')).toBeVisible();
  await expect(page.getByLabel('Full name')).toBeFocused();

  await page.getByLabel('Full name').fill('E2E Customer');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mobile number').fill(phone);
  await page.locator('#rg-password').fill(password);
  await expect(page.getByText('Strong')).toBeVisible();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();

  // Not usable until the email is confirmed.
  await page.goto('/en/account/login');
  await page.getByLabel('Email').fill(email);
  await page.locator('#li-password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Confirm your email first.')).toBeVisible();

  const link = /(http\S+\/account\/verify#token=[\w-]+)/.exec(
    await lastEmailText(page, email),
  )?.[1];
  expect(link).toBeTruthy();
  await page.goto(link!);
  await expect(page.getByRole('heading', { name: 'Email confirmed' })).toBeVisible();
  // The token is wiped from the address bar.
  await expect(page).not.toHaveURL(/token=/);
  await page.getByRole('link', { name: 'Go to my account' }).click();
  await expect(page.getByText('Hello, E2E Customer')).toBeVisible();
  await expect(page.getByText('This device')).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).first().click();
  await expect(page).toHaveURL(/\/en$/);

  await page.goto('/en/account/login');
  await page.getByLabel('Email').fill(email);
  await page.locator('#li-password').fill('not my password at all');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Wrong email or password.')).toBeVisible();
  await page.locator('#li-password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Hello, E2E Customer')).toBeVisible();
});

test('forgot password: the same answer for any email', async ({ page }) => {
  await page.goto('/en/account/forgot-password');
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Email').fill('nobody-here@example.com');
  await page.getByRole('button', { name: 'Send link' }).click();
  await expect(page.getByText('If an account uses nobody-here@example.com')).toBeVisible();
});
