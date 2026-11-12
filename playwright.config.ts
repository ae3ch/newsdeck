import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

/**
 * Browser tests at phone width against the production build. e2e/fixtures.ts answers feeds and
 * preview images with fixed data, so the static preview server is enough, without the worker.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: 'list',
  use: {
    // Device values of an iPhone, but in Chromium: that is the browser installed here.
    ...devices['iPhone 13'],
    browserName: 'chromium',
    baseURL: `http://127.0.0.1:${PORT}`,
    serviceWorkers: 'block',
  },
  webServer: {
    command: `npm run build && npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
});
