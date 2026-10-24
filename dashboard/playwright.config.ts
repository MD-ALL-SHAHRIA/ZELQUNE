import { defineConfig, devices } from '@playwright/test';

/**
 * Runs against a running dashboard (`pnpm dev`, port 3200) and dev stack. Admin credentials come
 * from E2E_ADMIN_PHONE / E2E_ADMIN_PASSWORD (the owner seeded from infra/.env); the tests skip
 * when they are not set. Mind the gateway's login limit (5 per 15 min per IP).
 */
export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  workers: 1,
  use: { baseURL: process.env.BASE_URL ?? 'http://localhost:3200', trace: 'retain-on-failure' },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }],
});
