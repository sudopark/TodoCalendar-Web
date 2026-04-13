import { test, expect } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)
})

test("'n' 키로 팝오버를 열면 배경에 메인 페이지 캘린더가 유지된다", async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // when — 키보드로 팝오버 열기
  await page.locator('body').press('n')

  // then — 팝오버가 표시된다
  await expect(page.getByTestId('event-form-backdrop')).toBeVisible()
  await expect(page.getByRole('button', { name: '저장' })).toBeVisible()
  // 배경 메인 페이지의 캘린더가 여전히 보인다
  await expect(page.getByTestId('day-cell').first()).toBeVisible()
})

test("FAB 클릭 후 Todo 선택 시 배경에 메인 페이지 캘린더가 유지된다", async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // when — FAB 클릭 후 Todo 선택
  await page.getByTestId('create-event-button').click()
  await expect(page.getByRole('button', { name: 'Todo', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Todo', exact: true }).click()

  // then — 팝오버가 열린다
  await expect(page.getByTestId('event-form-backdrop')).toBeVisible()
  await expect(page.getByRole('button', { name: '저장' })).toBeVisible()
  // 배경에 캘린더가 여전히 렌더되어 있다
  await expect(page.getByTestId('day-cell').first()).toBeVisible()
})

test("FAB 클릭 후 Schedule 선택 시 배경에 메인 페이지 캘린더가 유지된다", async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // when — FAB 클릭 후 Schedule 선택
  await page.getByTestId('create-event-button').click()
  await expect(page.getByRole('button', { name: 'Schedule', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Schedule', exact: true }).click()

  // then — 팝오버가 열린다
  await expect(page.getByTestId('event-form-backdrop')).toBeVisible()
  await expect(page.getByRole('button', { name: '저장' })).toBeVisible()
  // 배경에 캘린더가 여전히 렌더되어 있다
  await expect(page.getByTestId('day-cell').first()).toBeVisible()
})
