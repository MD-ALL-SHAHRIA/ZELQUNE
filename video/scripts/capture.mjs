// Captures the real storefront UI for the promo video. Run with the dev stack and storefront up:
//   node video/scripts/capture.mjs [baseUrl]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:3100';
const OUT = new URL('../assets/screens/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const shots = [
  ['home', '/en', 0],
  ['home-daynight', '/en', 'text=A vase by day'],
  ['home-steps', '/en', 'text=How pre-order works'],
  ['shop', '/en/shop', 0],
  ['shop-grid', '/en/shop', 'text=products'],
  ['product', '/en/products/alo-arch-panel', 0],
  ['design', '/en/design', 0],
  ['track', '/en/track', 0],
];
const sizes = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };

const browser = await chromium.launch();
for (const [size, viewport] of Object.entries(sizes)) {
  const ctx = await browser.newContext({
    viewport, deviceScaleFactor: 2, isMobile: size === 'mobile',
    recordVideo: { dir: OUT + 'rec-' + size, size: viewport },
  });
  const page = await ctx.newPage();
  for (const [name, path, target] of shots) {
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    const accept = page.getByRole('button', { name: /accept/i }).first();
    if (await accept.isVisible().catch(() => false)) await accept.click();
    if (target) {
      await page.locator(target).first().scrollIntoViewIfNeeded().catch(() => {});
      await page.evaluate(() => window.scrollBy(0, -80));
    }
    // Hide the Next.js dev indicator so it never shows in the video.
    await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}${name}-${size}.png` });
  }
  // Real product cards, cut from the shop grid, for the cards that pop out in the video.
  if (size === 'desktop') {
    await page.goto(BASE + '/en/shop', { waitUntil: 'networkidle' });
    await page.addStyleTag({
      content: 'nextjs-portal,a[href*="wa.me"],a[href*="whatsapp"]{display:none!important}',
    });
    const cards = page.locator('li:has(a[href^="/en/products/"]), article:has(a[href^="/en/products/"])');
    const n = Math.min(await cards.count(), 3);
    for (let i = 0; i < n; i++) {
      await cards.nth(i).scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
      await cards.nth(i).screenshot({ path: `${OUT}card-${i + 1}.png` });
    }
  }
  // Slow scroll through the home page for a motion reference.
  await page.goto(BASE + '/en', { waitUntil: 'networkidle' });
  for (let i = 0; i < 30; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(80); }
  await ctx.close();
}
await browser.close();
console.log('saved to', OUT);
