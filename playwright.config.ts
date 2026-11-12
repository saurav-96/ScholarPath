import { defineConfig, devices } from '@playwright/test';

const localChannel = process.env.CI ? undefined : 'chrome';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    channel: localChannel,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: localChannel },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], channel: localChannel },
    },
  ],
  webServer: {
    command:
      process.platform === 'win32'
        ? 'npm.cmd run preview -- --host 127.0.0.1 --port 4173'
        : 'npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
