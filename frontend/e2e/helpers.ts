import { type Page } from '@playwright/test';

/** Unique 11-digit BD mobile and trxId per run, so reruns never collide. */
export function uniquePhone(): string {
  return `017${String(Date.now()).slice(-8)}`;
}
export function uniqueTrxId(): string {
  return `E2E${Date.now().toString(36).toUpperCase()}`.slice(0, 20);
}

export async function fillCheckout(
  page: Page,
  input: { name: string; phone: string; district: string; area: string; line: string },
) {
  await page.locator('#f-name').fill(input.name);
  await page.locator('#f-phone').fill(input.phone);
  await page.locator('#f-district').selectOption(input.district);
  await page.locator('#f-area').fill(input.area);
  await page.locator('#f-line').fill(input.line);
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const MAILPIT = 'http://localhost:8025';

/**
 * A real, confirmed customer account for this test (ADR 0021: orders and requests need one):
 * registers through the API, opens the confirmation link from Mailpit, and leaves the session
 * cookie in the browser context, so the storefront is signed in on the next page load.
 */
export async function signInCustomer(
  page: Page,
  name = 'E2E Shopper',
): Promise<{ email: string; phone: string }> {
  const email = `shopper-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
  const phone = uniquePhone();
  const reg = await page.request.post(`${API}/v1/auth/register`, {
    headers: { 'cf-turnstile-response': 'dev-pass' },
    data: { name, email, phone, password: 'walnut lamp by the window', lang: 'en' },
  });
  if (reg.status() !== 202) throw new Error(`register failed: ${reg.status()} ${await reg.text()}`);
  let token = '';
  for (let i = 0; i < 40 && !token; i++) {
    const found = (await (
      await page.request.get(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)
    ).json()) as { messages?: { ID: string }[] };
    const id = found.messages?.[0]?.ID;
    if (id) {
      const msg = (await (await page.request.get(`${MAILPIT}/api/v1/message/${id}`)).json()) as {
        Text: string;
      };
      token = /#token=([\w-]+)/.exec(msg.Text)?.[1] ?? '';
    }
    if (!token) await page.waitForTimeout(250);
  }
  if (!token) throw new Error(`no confirmation email for ${email}`);
  const verified = await page.request.post(`${API}/v1/auth/verify-email`, { data: { token } });
  if (!verified.ok()) throw new Error(`verify failed: ${verified.status()}`);
  return { email, phone };
}
