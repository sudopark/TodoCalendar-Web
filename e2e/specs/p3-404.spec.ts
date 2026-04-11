import { test, expect } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)
})

test('존재하지 않는 경로로 이동 시 404 텍스트가 표시된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // when
  await page.goto('/nonexistent-page')

  // then
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible()
})

test('404 페이지에서 홈으로 가기 링크가 표시된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // when
  await page.goto('/nonexistent-page')
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible()

  // then — "홈으로 돌아가기" 링크가 표시된다
  await expect(page.getByRole('link', { name: '홈으로 돌아가기' })).toBeVisible()
})

test('홈으로 가기 링크 클릭 시 루트 경로로 이동한다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/nonexistent-page')
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible()

  // when
  await page.getByRole('link', { name: '홈으로 돌아가기' }).click()

  // then
  await expect(page).toHaveURL('/')
})

test('404 페이지에서 "페이지를 찾을 수 없습니다" 메시지가 표시된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // when
  await page.goto('/nonexistent-page')

  // then
  await expect(page.getByText('페이지를 찾을 수 없습니다')).toBeVisible()
})
