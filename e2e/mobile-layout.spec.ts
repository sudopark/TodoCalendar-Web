import { test, expect, devices, type Route, type Page } from '@playwright/test'
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

// 본 spec 은 viewport-aware UI flow(드로어/시트/스택/라우트) 검증이 목적이고 backend 통합은
// unit/integration 영역이다. dev server origin 의 /v1·/v2 만 mock — emulator URL
// (localhost:9099/identitytoolkit/...) 까지 가로채면 SDK sign-in/lookup 이 깨진다.
async function mockBackendApi(page: Page) {
  await page.route('http://localhost:5173/v1/accounts/info', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ uid: 'qa-test-uid', email: 'qa-test@example.com' }),
    }),
  )
  await page.route('http://localhost:5173/v1/**', (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  )
  await page.route('http://localhost:5173/v2/**', (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  )
}

/**
 * 모바일 viewport 에서 Playwright 의 mouse-simulation click 은 mousedown→mouseup 사이에
 * drawer slide-in / popover open 같은 layout 변경이 끼어들면 mouseup 좌표가 다른 element 로
 * 떨어져 의도치 않은 추가 click 이 발화한다 (예: 햄버거 click 후 panel 이 햄버거 자리로 슬라이드
 * 인 → mouseup 이 panel 의 첫 button 인 Create 를 hit → 메뉴 backdrop 등장 → 외부 backdrop
 * click 을 가로챔). native HTMLElement.click() 은 단일 atomic event 라 이 race 가 없다.
 */
async function nativeClick(page: Page, selector: string) {
  const result = await page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement | null
    if (!el) return `NOT_FOUND: ${sel}`
    const r = el.getBoundingClientRect()
    el.click()
    return `OK: ${el.tagName} bbox(${r.x},${r.y},${r.width}x${r.height})`
  }, selector)
  console.log('[nativeClick]', result)
}

test('모바일: 햄버거 → 드로어 → 닫기, 날짜 탭 → RightPanel, 새 이벤트 → 라우트 진입', async ({
  context,
  page,
}) => {
  await setupAuthContext(context)
  await mockBackendApi(page)
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // 메인 화면 진입
  await expect(page.getByTestId('main-flex')).toBeVisible()

  // 1) 햄버거 → 드로어 열림 — dispatchEvent 패턴 (React onClick 호환)
  await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="사이드바 토글"]') as HTMLElement
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
  })
  await expect(page.getByTestId('drawer-backdrop')).toBeVisible()

  // 2) 백드롭 클릭 → 드로어 닫힘
  await nativeClick(page, '[data-testid="drawer-backdrop"]')
  await expect(page.getByTestId('drawer-backdrop')).toBeHidden()

  // 3) 오늘 날짜 셀 탭 → RightPanel h1 노출
  await nativeClick(page, '[data-testid="day-cell"][data-today]')
  await expect(page.locator('h1').first()).toBeVisible()

  // 4) "+ Create" 버튼 → 메뉴 → Todo 선택 → /todos/new 라우트 진입
  await nativeClick(page, '[data-testid="create-event-button"]')
  await page.getByRole('menuitem', { name: /todo/i }).click()
  await expect(page).toHaveURL(/\/todos\/new/)
})
