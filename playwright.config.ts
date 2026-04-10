import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: 'http://localhost:5175',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'unauthenticated',
      testMatch: /.*unauth.*\.spec\.ts/,
    },
    {
      name: 'authenticated',
      testMatch: /^(?!.*unauth).*\.spec\.ts$/,
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 5175,
    reuseExistingServer: !process.env.CI,
  },
})
