import { defineConfig, devices } from '@playwright/test';

const TI_URL = process.env.TI_URL || 'http://ti.helpdeskmsm.local';
const ELECTRIC_URL = process.env.ELECTRIC_URL || 'http://eletrica.helpdeskmsm.local';
const COMPRAS_URL = process.env.COMPRAS_URL || 'http://compras.helpdeskmsm.local';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: TI_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: true,
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'chromium-mobile',
      use: {
        ...devices['Pixel 5'],
      },
    },
  ],
  timeout: 60000,
});
