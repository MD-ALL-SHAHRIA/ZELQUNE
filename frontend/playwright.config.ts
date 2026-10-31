import { defineConfig, devices } from '@playwright/test';

/**
 * E2E against the real backend (Docker stack from ../infra, seeded with `pnpm seed`).
 * The storefront is started here unless BASE_URL points at a running one.
 */
const port = 3100;
const baseURL = process.env.BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    // Tests start with a saved cookie choice (analytics yes, marketing no) so the consent banner
    // never covers what they click; e2e/consent.e2e.ts starts empty, like a first visit.
    storageState: {
      cookies: [
        {
          name: 'zq_consent',
          value: 'v1.a1.m0',
          domain: new URL(baseURL).hostname,
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
      ],
      origins: [],
    },
  },
  projects: [
    {
      name: 'mobile',
      testMatch: /.*\.e2e\.ts/,
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
    },
    { name: 'screenshots', testMatch: /screenshots\.shot\.ts/ },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: `pnpm build && pnpm start`,
        url: `${baseURL}/en`,
        timeout: 240_000,
        reuseExistingServer: !process.env.CI,
        env: { ALLOW_TEST_TURNSTILE: 'true' },
      },
});
