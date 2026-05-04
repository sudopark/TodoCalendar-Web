import { test, expect, devices } from '@playwright/test'
import { setupAuthContext } from './helpers/auth'

// iPhone 13 viewport(390×844) + 터치 에뮬레이션. WebKit이 설치된 환경에서는
// `...devices['iPhone 13']` 그대로 사용하면 defaultBrowserType이 webkit으로 설정된다.
// 현재 환경에서는 chromium만 설치되어 있으므로 viewport/touch 설정만 추출해 사용.
test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent: devices['iPhone 13'].userAgent,
})

test('모바일: 햄버거 → 드로어 → 닫기, 날짜 탭 → RightPanel, 새 이벤트 → 라우트 진입', async ({
  context,
  page,
}) => {
  await setupAuthContext(context)
  await page.goto('/')

  // 메인 화면 진입 확인
  await expect(page.getByTestId('main-flex')).toBeVisible()

  // 1) 햄버거 버튼 → 드로어 열림
  // aria-label: t('main.toggle_sidebar', '사이드바 토글') — fallback '사이드바 토글'
  await page.getByRole('button', { name: /사이드바 토글|toggle sidebar/i }).click()
  await expect(page.getByTestId('drawer-backdrop')).toBeVisible()

  // 2) 백드롭 클릭 → 드로어 닫힘
  await page.getByTestId('drawer-backdrop').click()
  await expect(page.getByTestId('drawer-backdrop')).toBeHidden()

  // 3) 오늘 날짜 셀 탭 → RightPanel h1 노출
  await page.locator('[data-testid="day-cell"][data-today]').first().click()
  await expect(page.locator('h1').first()).toBeVisible()

  // 4) "+ Create" 버튼 클릭 → 메뉴 노출 → Todo 선택 → /todos/new 라우트 진입
  await page.getByTestId('create-event-button').click()
  await page.getByRole('menuitem', { name: /todo/i }).click()
  await expect(page).toHaveURL(/\/todos\/new/)
})
