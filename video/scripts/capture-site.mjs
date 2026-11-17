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
  mobile: { viewport: { width: 390, height: 844 }, dpr: 3, maxH: 4000 }, // 12000 px: browsers cannot draw much taller images
};
// Viewport shots at a real scroll position (for scroll-driven sections that a full-page capture
// renders blank), plus real interaction states. Element boxes are in viewport CSS px.
const VIEWS = {
  'home-top': { path: '/en' },
  'home-menu': { path: '/en', menu: true },
  'home-steps': { path: '/en', scrollTo: 'How pre-order works' },
  'home-values': { path: '/en', scrollTo: 'Made slowly, by hand' },
  'construction-build': { path: '/en/construction', scrollTo: 'What we build' },
  'story-top': { path: '/en/story' },
  'design-top': { path: '/en/design' },
  'construction-top': { path: '/en/construction' },
  'bulk-top': { path: '/en/bulk' },
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

  for (const [name, v] of Object.entries(VIEWS)) {
    await page.goto(BASE + v.path, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: HIDE });
    if (v.scrollTo) {
      const y = await page.evaluate(async (t) => {
        const el = [...document.querySelectorAll('h1,h2,h3,p,span,div')].find((e) => e.childElementCount === 0 && e.textContent.trim().startsWith(t));
        return el ? el.getBoundingClientRect().top + scrollY : 0;
      }, v.scrollTo);
      // Walk there so scroll-driven sections play in, then settle.
      for (let s = 0; s < y - 110; s += 500) { await page.evaluate((q) => window.scrollTo(0, q), s); await page.waitForTimeout(100); }
      await page.evaluate((q) => window.scrollTo(0, q), Math.max(0, y - 110));
    }
    let menuButton = null;
    if (v.menu) {
      const btn = page.locator('header').getByRole('button', { name: /menu/i }).first();
      const b = await btn.boundingBox();
      menuButton = b && { text: 'menu', x: b.x, y: b.y, w: b.width, h: b.height };
      await btn.click();
    }
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `${OUT}${name}-${size}.png` });
    const els = await page.evaluate(() => {
      const box = (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
      const vis = (b) => b.w > 8 && b.h > 8 && b.y > -b.h && b.y < innerHeight;
      const text = (el) => (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 80);
      const pick = (sel) => [...document.querySelectorAll(sel)].map((el) => ({ text: text(el), ...box(el) })).filter(vis).slice(0, 40);
      return {
        headings: pick('h1, h2, h3'), buttons: pick('a[href], button'), cards: pick('li:has(a[href*="/products/"]), article'),
        forms: pick('form'), inputs: pick('input:not([type=hidden]), textarea'), images: pick('img').filter((b) => b.w > 120),
        sections: pick('section'), nav: pick('nav a, [role=dialog] a, aside a'),
        // Short leaf text labels (step titles, captions) that are not headings.
        texts: [...document.querySelectorAll('p, span, div, a, li')]
          .filter((e) => e.childElementCount === 0 && e.textContent.trim().length > 2 && e.textContent.trim().length < 60)
          .map((el) => ({ text: text(el), ...box(el) })).filter(vis).slice(0, 120),
      };
    });
    if (menuButton) els.buttons.unshift(menuButton);
    (manifest[name] ??= {})[size] = { file: `${name}-${size}.png`, width: cfg.viewport.width, height: cfg.viewport.height, dpr: cfg.dpr, ...els };
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
