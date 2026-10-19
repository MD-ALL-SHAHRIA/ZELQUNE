import { expect, type Page, test } from '@playwright/test';
import { fillCheckout, uniquePhone, uniqueTrxId } from './helpers';

/**
 * Screenshots of every storefront page, mobile (390x844) and desktop (1440x900), /en and /bn,
 * into frontend/screenshots/ (gitignored). Run: pnpm screenshots (needs the backend running).
 * One real order and one quote are created through the gateway so the track pages show results.
 */
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const VIEWPORTS = { mobile: { width: 390, height: 844 }, desktop: { width: 1440, height: 900 } };
const LANGS = ['en', 'bn'] as const;
const phone = uniquePhone();
let orderCode = '';
let quoteCode = '';

test.describe.configure({ mode: 'serial' });
// Full-page captures: show scroll-revealed sections in their final state.
test.use({ reducedMotion: 'reduce' });

test.beforeAll(async ({ request }) => {
  const product = await (await request.get(`${API}/v1/catalog/products/alo-arch-panel?p=b`)).json();
  const variantId: string = product.variants[0].id;
  const { cartToken } = await (await request.post(`${API}/v1/carts`, { data: { p: 'b' } })).json();
  await request.put(`${API}/v1/carts/current/items/${variantId}`, {
    headers: { 'x-cart-token': cartToken },
    data: { qty: 1 },
  });
  const placed = await request.post(`${API}/v1/checkout`, {
    headers: {
      'x-cart-token': cartToken,
      'idempotency-key': `shots-${Date.now()}`,
      'cf-turnstile-response': 'dev-pass',
    },
    data: {
      customer: { name: 'Screenshot Demo', phone },
      address: { district: 'dhaka', area: 'Dhanmondi', line: 'House 7, Road 4, Dhanmondi' },
      paymentMethod: 'BKASH_MANUAL',
      trxId: uniqueTrxId(),
    },
  });
  expect(placed.ok()).toBeTruthy();
  orderCode = (await placed.json()).orderCode;
  const quote = await request.post(`${API}/v1/quote-requests`, {
    headers: { 'cf-turnstile-response': 'dev-pass' },
    data: {
      organizationName: 'Demo Interiors Ltd',
      contactName: 'Nadia Rahman',
      phone,
      items: [{ productSlug: 'alo-arch-panel', description: 'Alo-Arch Panel: walnut', qty: 30 }],
    },
  });
  expect(quote.ok()).toBeTruthy();
  quoteCode = (await quote.json()).quoteCode;
});

async function shot(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
}

for (const [device, viewport] of Object.entries(VIEWPORTS)) {
  for (const lang of LANGS) {
    test(`${device} ${lang}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const prefix = `${device}-${lang}`;
      const simple: [string, string][] = [
        ['01-home', ''],
        ['02-shop', '/shop'],
        ['03-category', '/category/lighting'],
        ['04-product', '/products/alo-arch-panel?p=b'],
        ['10-bulk', '/bulk'],
        ['13-faq', '/faq'],
        ['14-terms', '/terms'],
        ['15-returns', '/returns'],
        ['16-privacy', '/privacy'],
        ['18-story', '/story'],
        ['19-design', '/design'],
        ['20-design-restaurant', '/design/restaurant-cafe'],
        ['21-category-shelves', '/category/shelves'],
        ['22-product-wave-shelf', '/products/wave-shelf'],
        ['17-not-found', '/no-such-page'],
      ];
      for (const [name, path] of simple) {
        await page.goto(`/${lang}${path}`);
        await shot(page, `${prefix}-${name}`);
      }

      // Product with a delivery estimate, then the cart drawer.
      await page.goto(`/${lang}/products/alo-arch-panel`);
      await page.locator('#estimate-district').selectOption('chattogram');
      await expect(page.getByTestId('delivery-estimate')).toContainText('৳');
      await shot(page, `${prefix}-05-product-estimate`);
      await page
        .getByRole('button', { name: lang === 'en' ? 'Add to cart' : 'কার্টে যোগ করুন' })
        .click();
      await expect(page.getByTestId('cart-line')).toBeVisible();
      await page.screenshot({ path: `screenshots/${prefix}-06-cart-drawer.png` });

      // Checkout, filled in up to the payment step (not submitted).
      await page.goto(`/${lang}/checkout`);
      await fillCheckout(page, {
        name: 'Screenshot Demo',
        phone,
        district: 'dhaka',
        area: 'Dhanmondi',
        line: 'House 7, Road 4, Dhanmondi',
      });
      await expect(page.getByTestId('total')).toContainText('৳');
      await shot(page, `${prefix}-07-checkout`);

      await page.goto(`/${lang}/order/${orderCode}`);
      await shot(page, `${prefix}-08-order-placed`);

      await page.goto(`/${lang}/track?code=${orderCode}`);
      await page.locator('#t-phone').fill(phone);
      await page.locator('form button[type="submit"]').click();
      await expect(page.getByTestId('order-status')).toBeVisible();
      await shot(page, `${prefix}-09-track`);

      await page.goto(`/${lang}/bulk/track?code=${quoteCode}`);
      await page.locator('#q-phone').fill(phone);
      await page.locator('form button[type="submit"]').click();
      await expect(page.getByTestId('quote-status')).toBeVisible();
      await shot(page, `${prefix}-12-quote-track`);
    });
  }
}
