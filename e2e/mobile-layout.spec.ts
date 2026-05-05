import { test, expect, devices, type Route } from '@playwright/test'
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

// E2E 의 본 spec 은 viewport-aware UI flow(드로어/시트/스택/라우트) 검증이 목적이고
// backend 통합은 unit/integration 영역이다. /v1·/v2 API 는 page.route 로 mock 해 격리.
async function mockApi(page: Parameters<typeof test>[1] extends never ? never : Parameters<NonNullable<Parameters<typeof test>[1]>>[0]['page']) {
  // accounts/info 만 의미 있는 응답을 줘야 AuthGuard 통과
  await page.route('**/v1/accounts/info', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ uid: 'qa-test-uid', email: 'qa-test@example.com' }),
    }),
  )
  // 나머지 prefetch 들은 빈 컬렉션으로 충분
  await page.route('**/v1/**', (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  )
  await page.route('**/v2/**', (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  )
}

test('모바일: 햄버거 → 드로어 → 닫기, 날짜 탭 → RightPanel, 새 이벤트 → 라우트 진입', async ({
  context,
  page,
}) => {
  await setupAuthContext(context)
  await mockApi(page)

  // setupAuthContext 의 addInitScript indexedDB write 가 비동기라 첫 page.goto 시점에
  // Firebase Auth SDK 가 user 를 복원하지 못할 수 있다 — 한 번 로드해 indexedDB 가 채워지길
  // 보장한 뒤 reload 로 정상 인증 흐름 트리거.
  await page.goto('/login')
  await page.waitForFunction(async () => {
    return new Promise<boolean>((resolve) => {
      const req = indexedDB.open('firebaseLocalStorageDb', 1)
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('firebaseLocalStorage', 'readonly')
        const store = tx.objectStore('firebaseLocalStorage')
        const all = store.getAllKeys()
        all.onsuccess = () => {
          const hasAuthUser = (all.result as IDBValidKey[]).some((k) =>
            String(k).startsWith('firebase:authUser:'),
          )
          db.close()
          resolve(hasAuthUser)
        }
      }
    })
  }, undefined, { timeout: 5000 })
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
