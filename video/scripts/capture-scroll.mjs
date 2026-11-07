// Records real scrolling of the public site as image sequences (one frame per ~16 CSS px), so
// scroll-driven sections animate exactly as a visitor sees them. Each sequence starts at the view
// the video already shows for that beat, then scrolls down.
//   node scripts/capture-scroll.mjs [baseUrl]  ->  assets/scroll/<name>-<device>/NNNN.jpg + index.json
// The frames are large and regenerable, so assets/scroll/ is git-ignored.
import { chromium } from 'playwright';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:3100';
const OUT = new URL('../assets/scroll/', import.meta.url).pathname;
const STEP = 16;

/** start: CSS px, or text to scroll to (like capture.mjs does); dist: CSS px to scroll. */
const SEQS = {
  reveal: { path: '/en', start: { desktop: 0, mobile: 0 }, dist: { desktop: 1200, mobile: 1500 } },
  find: { path: '/en/shop', start: { desktop: 330, mobile: 0 }, dist: { desktop: 900, mobile: 1000 } },
  moods: { path: '/en/products/alo-arch-panel', night: true, start: { desktop: 0, mobile: 0 }, dist: { desktop: 700, mobile: 900 } },
  reserve: { path: '/en', start: { desktop: 'How pre-order works', mobile: 'How pre-order works' }, dist: { desktop: 600, mobile: 700 } },
  deliver: { path: '/en/track', start: { desktop: 0, mobile: 0 }, dist: { desktop: 700, mobile: 800 } },
  design: { path: '/en/design', start: { desktop: 0, mobile: 0 }, dist: { desktop: 1500, mobile: 1500 } },
  construction: { path: '/en/construction', start: { desktop: 0, mobile: 0 }, dist: { desktop: 1500, mobile: 1500 } },
  bulk: { path: '/en/bulk', start: { desktop: 0, mobile: 0 }, dist: { desktop: 1200, mobile: 1200 } },
};
const SIZES = {
  desktop: { viewport: { width: 1440, height: 900 }, dpr: 1 },
  mobile: { viewport: { width: 390, height: 844 }, dpr: 2 },
};
const HIDE = 'nextjs-portal,a[href*="wa.me"],a[href*="whatsapp"]{display:none!important}';

const index = {};
const browser = await chromium.launch();
for (const [size, cfg] of Object.entries(SIZES)) {
  const ctx = await browser.newContext({ viewport: cfg.viewport, deviceScaleFactor: cfg.dpr, isMobile: size === 'mobile' });
  const page = await ctx.newPage();
  for (const [name, s] of Object.entries(SEQS)) {
    await page.goto(BASE + s.path, { waitUntil: 'networkidle' });
    await page.evaluate((n) => (n ? localStorage.setItem('zq-theme', 'dark') : localStorage.removeItem('zq-theme')), !!s.night);
    await page.reload({ waitUntil: 'networkidle' });
    const accept = page.getByRole('button', { name: /accept/i }).first();
    if (await accept.isVisible().catch(() => false)) await accept.click();
    await page.addStyleTag({ content: HIDE + 'html{scroll-behavior:auto!important}' });
    let start = s.start[size];
    if (typeof start === 'string') {
      await page.locator(`text=${start}`).first().scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, -80));
      start = await page.evaluate(() => window.scrollY);
    }
    // Walk down to the start so scroll-driven sections are in their real state.
    for (let y = 0; y <= start; y += 300) { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(60); }
    await page.evaluate((v) => window.scrollTo(0, v), start);
    await page.waitForTimeout(1500);
    const dir = `${OUT}${name}-${size}/`;
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    const n = Math.ceil(s.dist[size] / STEP) + 1;
    for (let i = 0; i < n; i++) {
      await page.evaluate((v) => window.scrollTo(0, v), start + (s.dist[size] * i) / (n - 1));
      await page.waitForTimeout(i === 0 ? 400 : 70);
      await page.screenshot({ path: `${dir}${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 88 });
    }
    index[`${name}-${size}`] = n;
    console.log(name, size, n, 'frames');
  }
  await ctx.close();
}
await browser.close();
writeFileSync(OUT + 'index.json', JSON.stringify(index, null, 1) + '\n');
