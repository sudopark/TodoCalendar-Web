import { test, expect } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)
})

test("'n' 키로 /todos/new 오버레이를 열면 배경에 메인 페이지 캘린더가 유지된다", async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // when — 키보드로 오버레이 열기 (background state 포함)
  await page.locator('body').press('n')
  await expect(page).toHaveURL(/\/todos\/new/)

  // then — 오버레이 폼이 표시된다
  await expect(page.getByRole('heading', { name: '새 Todo' })).toBeVisible()
  // 배경 메인 페이지의 캘린더가 여전히 보인다
  await expect(page.getByTestId('day-cell').first()).toBeVisible()
})

test("FAB 클릭 후 Todo 선택 시 배경에 메인 페이지 캘린더가 유지된다", async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // when — FAB 클릭 후 Todo 선택
  await page.getByRole('button', { name: '새 이벤트' }).click()
  await expect(page.getByRole('button', { name: 'Todo', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Todo', exact: true }).click()

  // then — /todos/new 오버레이가 열린다
  await expect(page).toHaveURL(/\/todos\/new/)
  await expect(page.getByRole('heading', { name: '새 Todo' })).toBeVisible()
  // 배경에 캘린더가 여전히 렌더되어 있다
  await expect(page.getByTestId('day-cell').first()).toBeVisible()
})

test("FAB 클릭 후 Schedule 선택 시 배경에 메인 페이지 캘린더가 유지된다", async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // when — FAB 클릭 후 Schedule 선택
  await page.getByRole('button', { name: '새 이벤트' }).click()
  await expect(page.getByRole('button', { name: 'Schedule', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Schedule', exact: true }).click()

  // then — /schedules/new 오버레이가 열린다
  await expect(page).toHaveURL(/\/schedules\/new/)
  await expect(page.getByRole('heading', { name: '새 Schedule' })).toBeVisible()
  // 배경에 캘린더가 여전히 렌더되어 있다
  await expect(page.getByTestId('day-cell').first()).toBeVisible()
})
