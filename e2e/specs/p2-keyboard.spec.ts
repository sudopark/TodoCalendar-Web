import { test, expect } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)
})

test("메인 페이지에서 'n' 키를 누르면 새 Todo 폼 오버레이가 열린다", async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // when — body에 포커스 후 'n' 키 입력
  await page.locator('body').press('n')

  // then — URL이 /todos/new로 변경되고 오버레이가 열린다
  await expect(page).toHaveURL(/\/todos\/new/)
  await expect(page.getByRole('heading', { name: '새 Todo' })).toBeVisible()
})

test("새 Todo 오버레이가 열린 상태에서 취소 버튼을 누르면 메인 페이지로 돌아간다", async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.locator('body').press('n')
  await expect(page).toHaveURL(/\/todos\/new/)
  await expect(page.getByRole('heading', { name: '새 Todo' })).toBeVisible()

  // when — 취소 버튼 클릭
  await page.getByRole('button', { name: '취소' }).click()

  // then — 오버레이가 닫히고 이전 페이지로 돌아간다
  await expect(page).not.toHaveURL(/\/todos\/new/)
})

test("입력 필드에 포커스 시 'n' 키는 폼 열기를 트리거하지 않는다", async ({ page }) => {
  // given — 새 Todo 폼 오버레이를 직접 열어서 이름 입력 필드에 포커스
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/todos/new')
  await expect(page.getByLabel('이름')).toBeVisible()

  // when — 이름 입력 필드에 'n' 키 입력
  await page.getByLabel('이름').press('n')

  // then — 여전히 /todos/new 상태 (중첩 폼이 열리지 않는다)
  await expect(page).toHaveURL(/\/todos\/new/)
  await expect(page.getByRole('heading', { name: '새 Todo' })).toBeVisible()
})
