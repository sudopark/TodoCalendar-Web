import { test, expect } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)
})

test('태그 생성 API가 500 에러를 반환하면 에러 토스트 알림이 표시된다', async ({ page }) => {
  // given — 태그 생성 API를 500으로 모킹, 태그 목록은 빈 배열 반환
  await page.route('**/v1/tags/all', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })
  await page.route('**/v1/tags/tag', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Internal Server Error' }) })
    } else {
      await route.continue()
    }
  })

  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/tags')
  await expect(page.getByRole('heading', { name: '태그 관리' })).toBeVisible()

  // when — 태그 이름을 입력하고 추가 버튼 클릭
  await page.getByPlaceholder('새 태그 이름').fill('에러 태그')
  await page.getByRole('button', { name: '추가' }).click()

  // then — 에러 토스트 알림이 나타난다
  await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 })
  await expect(page.getByRole('alert').first()).toContainText(/태그|실패|오류|error/i)
})

test('API 에러 토스트는 일정 시간 뒤 자동으로 사라진다', async ({ page }) => {
  // given — 태그 생성 API를 500으로 모킹
  await page.route('**/v1/tags/all', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })
  await page.route('**/v1/tags/tag', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Internal Server Error' }) })
    } else {
      await route.continue()
    }
  })

  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/tags')
  await expect(page.getByRole('heading', { name: '태그 관리' })).toBeVisible()

  // when — 에러를 유발해 토스트가 표시되게 한다
  await page.getByPlaceholder('새 태그 이름').fill('사라질 태그')
  await page.getByRole('button', { name: '추가' }).click()
  await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 })

  // then — 3초 뒤 토스트가 사라진다 (3000ms auto-dismiss + 여유 시간)
  await expect(page.getByRole('alert')).not.toBeVisible({ timeout: 5000 })
})

test('에러 토스트를 클릭하면 즉시 사라진다', async ({ page }) => {
  // given — 태그 생성 API를 500으로 모킹
  await page.route('**/v1/tags/all', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })
  await page.route('**/v1/tags/tag', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'error' }) })
    } else {
      await route.continue()
    }
  })

  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/tags')
  await expect(page.getByRole('heading', { name: '태그 관리' })).toBeVisible()

  await page.getByPlaceholder('새 태그 이름').fill('클릭 제거 태그')
  await page.getByRole('button', { name: '추가' }).click()
  await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 })

  // when — 토스트를 클릭
  await page.getByRole('alert').first().click()

  // then — 즉시 사라진다
  await expect(page.getByRole('alert')).not.toBeVisible()
})
