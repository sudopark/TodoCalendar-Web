import { test, expect } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)
})

test('다음 달 버튼(›) 클릭 시 월 타이틀이 변경된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const initialTitle = await page.getByText(/April 2026/).first().textContent()

  // when
  await page.getByRole('button', { name: 'Next month', exact: true }).click()

  // then
  await expect(page.getByText(/May 2026/).first()).toBeVisible()
})

test('이전 달 버튼(‹) 클릭 시 월 타이틀이 원래대로 돌아온다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Next month', exact: true }).click()
  await expect(page.getByText(/May 2026/).first()).toBeVisible()

  // when
  await page.getByRole('button', { name: 'Previous month', exact: true }).click()

  // then
  await expect(page.getByText(/April 2026/).first()).toBeVisible()
})

test('날짜 셀 클릭 시 해당 셀이 선택 표시(ring-2)된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // when: 오늘이 아닌 날짜 셀을 클릭 (현재 월의 날짜 중 오늘이 아닌 셀)
  // 왼쪽 상단 날짜(1~3일)를 사용하여 RightPanel에 가려지지 않도록 한다
  const targetCell = page.locator('[data-testid="day-cell"]:not([data-today])').filter({
    hasText: '1',
  }).first()
  await targetCell.click()

  // then: 선택된 셀에 data-selected 속성이 적용되어야 함
  await expect(page.locator('[data-testid="day-cell"][data-selected]')).toBeVisible()
})

test('FAB(+) 버튼 클릭 시 TypeSelectorPopup에 Todo와 Schedule 옵션이 표시된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // when
  await page.getByTestId('create-event-button').click()

  // then
  await expect(page.getByRole('button', { name: 'Todo', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Schedule', exact: true })).toBeVisible()
})

test('팝업에서 Todo 클릭 시 이벤트 생성 팝오버가 열린다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.getByTestId('create-event-button').click()
  await expect(page.getByRole('button', { name: 'Todo', exact: true })).toBeVisible()

  // when
  await page.getByRole('button', { name: 'Todo', exact: true }).click()

  // then — 팝오버가 열리고 저장 버튼이 표시된다
  await expect(page.getByTestId('event-form-backdrop')).toBeVisible()
  await expect(page.getByRole('button', { name: '저장' })).toBeVisible()
})

test('팝업에서 Schedule 클릭 시 이벤트 생성 팝오버가 열린다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.getByTestId('create-event-button').click()
  await expect(page.getByRole('button', { name: 'Schedule', exact: true })).toBeVisible()

  // when
  await page.getByRole('button', { name: 'Schedule', exact: true }).click()

  // then — 팝오버가 열리고 저장 버튼이 표시된다
  await expect(page.getByTestId('event-form-backdrop')).toBeVisible()
  await expect(page.getByRole('button', { name: '저장' })).toBeVisible()
})
