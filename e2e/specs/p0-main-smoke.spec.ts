import { test, expect } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)
})

test('인증 후 / 방문 시 로그인 페이지로 리다이렉트되지 않는다', async ({ page }) => {
  // given: beforeEach에서 인증 컨텍스트 주입됨
  // when
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // then
  await expect(page).not.toHaveURL(/\/login/)
  await expect(page).toHaveURL('/')
})

test('헤더에 캘린더, 완료, 설정 네비게이션 링크가 표시된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // then
  await expect(page.getByRole('link', { name: '캘린더' })).toBeVisible()
  await expect(page.getByRole('link', { name: '완료' })).toBeVisible()
  await expect(page.getByRole('link', { name: '설정' })).toBeVisible()
})

test('캘린더에 현재 월 타이틀이 표시된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // then: formatMonthTitle은 'en-US' 로케일로 "April 2026" 형태를 반환
  await expect(page.getByRole('heading', { name: /April 2026/ })).toBeVisible()
})

test('캘린더에 요일 헤더(Sun-Sat)가 표시된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // then
  for (const day of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']) {
    await expect(page.getByText(day, { exact: true }).first()).toBeVisible()
  }
})

test('캘린더에 날짜 셀들이 표시된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // then: data-testid="day-cell" 셀이 여러 개 존재해야 한다
  const dayCells = page.getByTestId('day-cell')
  await expect(dayCells.first()).toBeVisible()
  const count = await dayCells.count()
  expect(count).toBeGreaterThanOrEqual(28)
})

test('FAB(+) 버튼이 우측 하단에 표시된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // then: aria-label="새 이벤트 추가" 버튼
  await expect(page.getByRole('button', { name: '새 이벤트 추가' })).toBeVisible()
})

test('오늘 날짜(11일)에 파란 원 하이라이트가 표시된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // then: 오늘(11) 셀은 bg-blue-500 클래스를 가진 내부 div를 포함
  const todayCell = page.locator('[data-testid="day-cell"]').filter({
    has: page.locator('.bg-blue-500'),
  })
  await expect(todayCell).toBeVisible()
  await expect(todayCell.locator('.bg-blue-500')).toContainText('11')
})
