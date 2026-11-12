import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

/**
 * Browser-Tests in Handybreite gegen den fertigen Build. Feeds und Vorschaubilder beantwortet
 * e2e/fixtures.ts mit festen Daten, deshalb genügt der statische Vorschau-Server ohne Functions.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: 'list',
  use: {
    // Gerätewerte eines iPhones, aber in Chromium: Das ist der Browser, der hier installiert wird.
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
