import { defineConfig } from '@playwright/test'

/**
 * 환경변수로 e2e 실행 환경을 오버라이드한다 — 모두 미설정 시 기본 5173 / retain-on-failure 동작.
 *
 * - PLAYWRIGHT_DEV_PORT (기본 5173): webServer 가 띄우는 vite dev 서버 포트. 메인 워크트리의
 *   dev 서버와 충돌 없이 격리 worktree 에서 e2e 를 돌릴 때(예: 5174) 활용.
 * - PLAYWRIGHT_BASE_URL (기본 http://localhost:${PORT}): 테스트 page.goto 의 baseURL. 보통
 *   설정하지 않고 PORT 만 바꾼다. 외부 deploy URL 을 가리키면 로컬 webServer 와 어긋나니
 *   CI 에서 의도치 않게 설정되지 않도록 주의.
 * - PLAYWRIGHT_VIDEO (기본 retain-on-failure): playwright use.video 옵션. CLAUDE.md 가이드의
 *   "playwright --video on 후 test-results/.webm 영상 검토" 흐름은 PLAYWRIGHT_VIDEO=on 으로 사용.
 */
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
