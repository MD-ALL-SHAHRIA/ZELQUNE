// Captures the real storefront UI for the promo video. Run with the dev stack and storefront up:
//   node video/scripts/capture.mjs [baseUrl]
// Saves 2x screenshots (day and the real night theme), product cards, scroll recordings and
// targets.json: where the clicked controls really sit, as 0–1 fractions of the viewport.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:3100';
const OUT = new URL('../assets/screens/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const HIDE = 'nextjs-portal,a[href*="wa.me"],a[href*="whatsapp"]{display:none!important}';
const sizes = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };
const targets = {};

const browser = await chromium.launch();
for (const [size, viewport] of Object.entries(sizes)) {
  const ctx = await browser.newContext({
    viewport, deviceScaleFactor: 2, isMobile: size === 'mobile',
    recordVideo: { dir: OUT + 'rec-' + size, size: viewport },
  });
  const page = await ctx.newPage();
  const t = (targets[size] = {});

  const open = async (path, { night = false, scrollTo, scrollBy = 0 } = {}) => {
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await page.evaluate((n) => {
      if (n) localStorage.setItem('zq-theme', 'dark');
      else localStorage.removeItem('zq-theme');
    }, night);
    await page.reload({ waitUntil: 'networkidle' });
    const accept = page.getByRole('button', { name: /accept/i }).first();
    if (await accept.isVisible().catch(() => false)) await accept.click();
    await page.addStyleTag({ content: HIDE });
    if (scrollTo) {
      await page.locator(scrollTo).first().scrollIntoViewIfNeeded().catch(() => {});
      await page.evaluate(() => window.scrollBy(0, -80));
    }
    if (scrollBy) await page.evaluate((y) => window.scrollBy(0, y), scrollBy);
    await page.waitForTimeout(1500);
  };
  const shot = (name) => page.screenshot({ path: `${OUT}${name}-${size}.png` });
  // Centre of an element as a fraction of the viewport.
  const where = async (locator) => {
    const b = await locator.first().boundingBox().catch(() => null);
    if (!b) return null;
    return {
      x: (b.x + b.width / 2) / viewport.width, y: (b.y + b.height / 2) / viewport.height,
      w: b.width / viewport.width, h: b.height / viewport.height, left: b.x / viewport.width,
    };
  };

  for (const night of [false, true]) {
    const sfx = night ? '-night' : '';
    await open('/en', { night });
    await shot('home' + sfx);
    await open('/en/products/alo-arch-panel', { night });
    await shot('product' + sfx);
    if (!night) t.themeToggle = await where(page.getByRole('button', { name: /switch to dark mode/i }));
    if (!night) t.preorder = await where(page.getByRole('button', { name: /pre-order now/i }));
  }

  // Desktop: scroll so the product grid shares the view with the shop heading.
  await open('/en/shop', { scrollBy: size === 'desktop' ? 330 : 0 });
  await shot('shop');
  t.firstCard = await where(page.locator('a[href^="/en/products/"]'));

  for (const svc of ['design', 'construction', 'bulk']) {
    await open('/en/' + svc);
    await shot(svc);
  }

  await open('/en', { scrollTo: 'text=How pre-order works' });
  await shot('home-steps');

  await open('/en/track');
  await shot('track');
  const boxes = page.getByRole('textbox');
  t.orderInput = await where(boxes.nth(0));
  t.trackButton = await where(page.getByRole('button', { name: /^track$/i }));
  await boxes.nth(0).fill('ZQ-4K7P2M');
  await boxes.nth(1).fill('01712 345678');
  await page.waitForTimeout(400);
  await shot('track-filled');

  // Real product cards, cut from the shop grid, for the cards that pop out in the video.
  if (size === 'desktop') {
    await open('/en/shop');
    await page.addStyleTag({ content: 'a[href*="wa.me"],a[href*="whatsapp"]{display:none!important}' });
    const cards = page.locator('li:has(a[href^="/en/products/"]), article:has(a[href^="/en/products/"])');
    const n = Math.min(await cards.count(), 3);
    for (let i = 0; i < n; i++) {
      await cards.nth(i).scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
      await cards.nth(i).screenshot({ path: `${OUT}card-${i + 1}.png` });
    }
  }
  // Slow scroll through the home page for a motion reference.
  await open('/en');
  for (let i = 0; i < 30; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(80); }
  await ctx.close();
}
await browser.close();
writeFileSync(OUT + 'targets.json', JSON.stringify(targets, null, 2) + '\n');
console.log('saved to', OUT);
