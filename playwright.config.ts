import { defineConfig } from '@playwright/test'

const PORT = Number(process.env.PLAYWRIGHT_DEV_PORT ?? 5173)
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: BASE_URL,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    // PLAYWRIGHT_VIDEO=on 으로 모든 케이스에 대해 .webm 영상을 남긴다.
    // CLAUDE.md 의 "playwright --video on 후 test-results .webm 영상 검토" 흐름을 위함.
    video: (process.env.PLAYWRIGHT_VIDEO ?? 'retain-on-failure') as 'on' | 'off' | 'retain-on-failure' | 'on-first-retry',
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
    command: `npm run dev -- --port ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
  },
})
