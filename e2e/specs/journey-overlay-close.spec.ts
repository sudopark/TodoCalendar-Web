/**
 * 오버레이 닫기 사용자 여정 E2E 테스트
 *
 * 각 오버레이(폼/태그관리)를 닫는 방법(취소 버튼, 백드롭, X 버튼)을 검증한다.
 */
import { test, expect } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)
})

async function setupBasicMocks(page: Parameters<Parameters<typeof test>[1]>[0]) {
  await page.route('**/v1/tags/**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })
  await page.route('**/v1/foremost**', async route => {
    await route.fulfill({ status: 404, body: '{}' })
  })
  await page.route('**/v1/holidays**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })
  await page.route('**/v1/todos**', async route => {
    const method = route.request().method()
    if (method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    } else {
      await route.continue()
    }
  })
  await page.route('**/v1/schedules**', async route => {
    const method = route.request().method()
    if (method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    } else {
      await route.continue()
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: FAB → Todo 폼 → 취소 버튼 → 오버레이 닫힘, 메인 페이지, URL은 /
// ─────────────────────────────────────────────────────────────────────────────
test('Todo 폼에서 취소 버튼을 클릭하면 오버레이가 닫히고 메인 페이지가 표시된다', async ({ page }) => {
  // given
  await setupBasicMocks(page)
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // when — FAB → Todo
  await page.getByRole('button', { name: '새 이벤트 추가' }).click()
  await page.getByRole('button', { name: 'Todo', exact: true }).click()
  await expect(page).toHaveURL(/\/todos\/new/)
  await expect(page.getByRole('heading', { name: '새 Todo' })).toBeVisible()

  // 취소 버튼 클릭
  await page.getByRole('button', { name: '취소' }).click()

  // then — 오버레이가 닫히고 메인 페이지가 표시되어야 한다
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: '새 Todo' })).not.toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: FAB → Todo 폼 → 어두운 백드롭 클릭 → 오버레이 닫힘
// ─────────────────────────────────────────────────────────────────────────────
test('Todo 폼 뒤의 백드롭을 클릭하면 오버레이가 닫히고 메인 페이지로 돌아간다', async ({ page }) => {
  // given
  await setupBasicMocks(page)
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // when — FAB → Todo (background state로 오버레이 렌더)
  await page.getByRole('button', { name: '새 이벤트 추가' }).click()
  await page.getByRole('button', { name: 'Todo', exact: true }).click()
  await expect(page).toHaveURL(/\/todos\/new/)

  // 백드롭 영역 클릭 — data-testid로 백드롭 div를 정확히 타겟
  await page.getByTestId('overlay-backdrop').click()

  // then — 오버레이가 닫히고 메인 페이지 URL로 복귀한다
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: '새 Todo' })).not.toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: /tags 오버레이 → 닫기 버튼 → 메인으로 복귀
// ─────────────────────────────────────────────────────────────────────────────
test('/tags 오버레이에서 닫기 버튼을 클릭하면 메인 페이지로 돌아간다', async ({ page }) => {
  // given
  await setupBasicMocks(page)
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // when — /tags로 이동 (오버레이로)
  await page.goto('/tags')
  await expect(page.getByRole('heading', { name: '태그 관리' })).toBeVisible()

  // 닫기 버튼 클릭 (TagManagementPage의 "닫기" 버튼)
  await page.getByRole('button', { name: '닫기' }).click()

  // then — 메인 페이지로 돌아간다
  await expect(page.getByRole('heading', { name: '태그 관리' })).not.toBeVisible()
})
