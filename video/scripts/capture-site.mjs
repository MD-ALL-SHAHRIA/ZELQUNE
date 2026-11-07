// Captures every public storefront page as a full-page screenshot (desktop 1440 @2x, mobile 390 @3x)
// and the real position of its headings, buttons, cards, forms and images (CSS px, page coordinates)
// into assets/site/pages.json. The video crops lift-outs straight from these full-page images, so
// zooms and glass cards always land on the real element. Public pages only: no account or admin UI.
//   node scripts/capture-site.mjs [baseUrl]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:3100';
const OUT = new URL('../assets/site/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const PAGES = {
  home: '/en', shop: '/en/shop', product: '/en/products/alo-arch-panel', design: '/en/design',
  construction: '/en/construction', bulk: '/en/bulk', story: '/en/story', faq: '/en/faq', track: '/en/track',
};
const SIZES = {
  desktop: { viewport: { width: 1440, height: 900 }, dpr: 2, maxH: 7800 },
  mobile: { viewport: { width: 390, height: 844 }, dpr: 3, maxH: 5400 },
};
const HIDE = 'nextjs-portal,a[href*="wa.me"],a[href*="whatsapp"]{display:none!important}';

const browser = await chromium.launch();
const manifest = {};
for (const [size, cfg] of Object.entries(SIZES)) {
  const ctx = await browser.newContext({ viewport: cfg.viewport, deviceScaleFactor: cfg.dpr, isMobile: size === 'mobile' });
  const page = await ctx.newPage();
  for (const [name, path] of Object.entries(PAGES)) {
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    const accept = page.getByRole('button', { name: /accept/i }).first();
    if (await accept.isVisible().catch(() => false)) await accept.click();
    await page.addStyleTag({ content: HIDE + '*{transition:none!important;animation-play-state:paused!important}' });
    // Scroll through once so lazy images and reveal-on-scroll sections load, then back to the top.
    const fullH = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < fullH; y += 600) { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(120); }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1200);
    const h = Math.min(fullH, cfg.maxH);
    const file = `${name}-${size}.png`;
    await page.screenshot({ path: OUT + file, fullPage: true, clip: { x: 0, y: 0, width: cfg.viewport.width, height: h } });

    // Real element boxes, in page CSS px.
    const els = await page.evaluate((maxH) => {
      const box = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; };
      const ok = (b) => b.w > 8 && b.h > 8 && b.y < maxH;
      const text = (el) => (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 80);
      const pick = (sel, limit = 40) => [...document.querySelectorAll(sel)]
        .filter((el) => getComputedStyle(el).visibility !== 'hidden')
        .map((el) => ({ text: text(el), ...box(el) })).filter(ok).slice(0, limit);
      return {
        headings: pick('h1, h2, h3'),
        buttons: pick('main a[class*="btn"], main button, main a[role="button"], main a[href]:not([href^="#"])', 60),
        cards: pick('li:has(a[href*="/products/"]), article', 24),
        forms: pick('form'),
        inputs: pick('main input:not([type=hidden]), main textarea, main select'),
        images: pick('main img', 30).filter((b) => b.w > 200),
        sections: pick('main > section, main > div > section', 30),
      };
    }, h);
    (manifest[name] ??= {})[size] = { file, width: cfg.viewport.width, height: h, dpr: cfg.dpr, ...els };
  }

  // Real interaction states for the prototype beat: the first shop card, hovered.
  if (size === 'desktop') {
    await page.goto(BASE + PAGES.shop, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: HIDE });
    const card = page.locator('li:has(a[href*="/products/"])').first();
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await card.screenshot({ path: OUT + 'shop-card-1.png' });
    await card.hover();
    await page.waitForTimeout(900);
    await card.screenshot({ path: OUT + 'shop-card-1-hover.png' });
  }
  await ctx.close();
}
await browser.close();
writeFileSync(OUT + 'pages.json', JSON.stringify(manifest, null, 1) + '\n');
console.log('pages:', Object.keys(manifest).join(', '));
