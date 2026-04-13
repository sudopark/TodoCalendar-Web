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
test('Todo 팝오버에서 백드롭을 클릭하면 팝오버가 닫히고 메인 페이지가 표시된다', async ({ page }) => {
  // given
  await setupBasicMocks(page)
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // when — FAB → Todo
  await page.getByTestId('create-event-button').click()
  await page.getByRole('button', { name: 'Todo', exact: true }).click()
  await expect(page.getByTestId('event-form-backdrop')).toBeVisible()
  await expect(page.getByRole('button', { name: '저장' })).toBeVisible()

  // 백드롭 클릭 — 카드에 가려지지 않는 좌상단 모서리를 클릭
  await page.getByTestId('event-form-backdrop').click({ position: { x: 10, y: 10 } })

  // then — 팝오버가 닫히고 메인 페이지가 표시되어야 한다
  await expect(page.getByTestId('event-form-backdrop')).not.toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: FAB → Todo 폼 → 어두운 백드롭 클릭 → 오버레이 닫힘
// ─────────────────────────────────────────────────────────────────────────────
test('Schedule 팝오버에서 백드롭을 클릭하면 팝오버가 닫히고 메인 페이지로 돌아간다', async ({ page }) => {
  // given
  await setupBasicMocks(page)
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // when — FAB → Schedule
  await page.getByTestId('create-event-button').click()
  await page.getByRole('button', { name: 'Schedule', exact: true }).click()
  await expect(page.getByTestId('event-form-backdrop')).toBeVisible()

  // 백드롭 영역 클릭 — 카드에 가려지지 않는 좌상단 모서리를 클릭
  await page.getByTestId('event-form-backdrop').click({ position: { x: 10, y: 10 } })

  // then — 팝오버가 닫힌다
  await expect(page.getByTestId('event-form-backdrop')).not.toBeVisible()
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
