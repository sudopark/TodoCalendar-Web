import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)
})

// 새 4-layer 아키텍처(#66) 이후 태그 관리 UI 는 /settings/editEvent/tags 경로의 TagManagementPanel 로 통합됐다.
// 새 태그 생성은 패널 → "새 태그 추가" 버튼 → TagEditPanel(kind=create) 진입 → 이름 입력 → "저장" 흐름.
const TAG_MGMT_PATH = '/settings/editEvent/tags'

async function setupTagPanel(page: Page) {
  await page.route('**/v1/tags/all', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })
  await page.route('**/v1/setting/event/tag/default/color', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ default: '#4A90D9', holiday: '#ef4444' }) })
    } else {
      await route.continue()
    }
  })
}

async function triggerTagCreateError(page: Page, name: string) {
  await page.goto(TAG_MGMT_PATH)
  await page.waitForLoadState('networkidle')
  // 패널 → "새 태그 추가" → TagEditPanel(create) 진입
  await page.getByTestId('tag-management-panel').getByRole('button', { name: '새 태그 추가' }).click()
  await expect(page.getByRole('heading', { name: '새 태그' })).toBeVisible()

  await page.getByLabel('이름').fill(name)
  await page.getByRole('button', { name: '저장' }).click()
}

test('태그 생성 API가 500 에러를 반환하면 에러 토스트 알림이 표시된다', async ({ page }) => {
  // given — 태그 생성 API를 500으로 모킹
  await setupTagPanel(page)
  await page.route('**/v1/tags/tag', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Internal Server Error' }) })
    } else {
      await route.continue()
    }
  })

  // when
  await triggerTagCreateError(page, '에러 태그')

  // then — 에러 토스트가 나타난다 (tag.create_failed = "태그 생성에 실패했습니다")
  await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 })
  await expect(page.getByRole('alert').first()).toContainText(/태그|실패|오류|error/i)
})

test('API 에러 토스트는 일정 시간 뒤 자동으로 사라진다', async ({ page }) => {
  // given
  await setupTagPanel(page)
  await page.route('**/v1/tags/tag', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Internal Server Error' }) })
    } else {
      await route.continue()
    }
  })

  // when
  await triggerTagCreateError(page, '사라질 태그')
  await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 })

  // then — auto-dismiss 후 사라진다
  await expect(page.getByRole('alert')).not.toBeVisible({ timeout: 5000 })
})

test('에러 토스트를 클릭하면 즉시 사라진다', async ({ page }) => {
  // given
  await setupTagPanel(page)
  await page.route('**/v1/tags/tag', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'error' }) })
    } else {
      await route.continue()
    }
  })

  await triggerTagCreateError(page, '클릭 제거 태그')
  await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 })

  // when
  await page.getByRole('alert').first().click()

  // then — 즉시 사라진다
  await expect(page.getByRole('alert')).not.toBeVisible()
})
