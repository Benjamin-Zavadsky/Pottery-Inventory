import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './__tests__/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    // channel: 'chromium' forces the full Chrome-for-Testing binary instead of
    // chromium-headless-shell — the headless-shell asset for some revisions
    // has been pruned from Microsoft's CDN while the full build remains.
    { name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chromium' } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'], channel: 'chromium' } },
  ],
  webServer: {
    // CI uses a production build+start — faster and more deterministic than
    // a cold `next dev` compile, which routinely blows past Playwright's
    // default 60s webServer timeout on a fresh runner with no build cache.
    command: process.env.CI ? 'npm run build && npm run start' : 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
