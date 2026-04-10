import { test, expect } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)
})

test('다음 달 버튼(›) 클릭 시 월 타이틀이 변경된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const initialTitle = await page.getByRole('heading', { name: /April 2026/ }).textContent()

  // when
  await page.getByRole('button', { name: 'Next month' }).click()

  // then
  await expect(page.getByRole('heading', { name: /May 2026/ })).toBeVisible()
})

test('이전 달 버튼(‹) 클릭 시 월 타이틀이 원래대로 돌아온다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Next month' }).click()
  await expect(page.getByRole('heading', { name: /May 2026/ })).toBeVisible()

  // when
  await page.getByRole('button', { name: 'Previous month' }).click()

  // then
  await expect(page.getByRole('heading', { name: /April 2026/ })).toBeVisible()
})

test('날짜 셀 클릭 시 해당 셀이 선택 표시(ring-2)된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // when: 오늘이 아닌 날짜 셀을 클릭 (10일 — 오늘은 11일)
  const targetCell = page.getByTestId('day-cell').filter({
    has: page.locator('div', { hasText: '10' }).and(page.locator('.text-gray-900, .text-red-500')),
  }).first()
  await targetCell.click()

  // then: ring-2 클래스가 적용된 셀이 생겨야 함
  await expect(page.locator('.ring-2.ring-blue-400')).toBeVisible()
})

test('FAB(+) 버튼 클릭 시 TypeSelectorPopup에 Todo와 Schedule 옵션이 표시된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // when
  await page.getByRole('button', { name: '새 이벤트 추가' }).click()

  // then
  await expect(page.getByRole('button', { name: 'Todo', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Schedule', exact: true })).toBeVisible()
})

test('팝업에서 Todo 클릭 시 /todos/new 페이지로 이동한다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: '새 이벤트 추가' }).click()
  await expect(page.getByRole('button', { name: 'Todo', exact: true })).toBeVisible()

  // when
  await page.getByRole('button', { name: 'Todo', exact: true }).click()

  // then
  await expect(page).toHaveURL(/\/todos\/new/)
})

test('팝업에서 Schedule 클릭 시 /schedules/new 페이지로 이동한다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: '새 이벤트 추가' }).click()
  await expect(page.getByRole('button', { name: 'Schedule', exact: true })).toBeVisible()

  // when
  await page.getByRole('button', { name: 'Schedule', exact: true }).click()

  // then
  await expect(page).toHaveURL(/\/schedules\/new/)
})
