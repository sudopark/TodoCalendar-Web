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

test('TopToolbar에 사이드바 토글, 오늘 버튼, 월 네비게이션, 설정 버튼이 표시된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // then: Header는 메인 페이지에서 숨겨지고 TopToolbar가 대신 표시된다
  await expect(page.getByRole('button', { name: '사이드바 토글' })).toBeVisible()
  await expect(page.getByRole('button', { name: '오늘' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Previous month' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next month' })).toBeVisible()
  await expect(page.getByRole('button', { name: '설정' })).toBeVisible()
})

test('캘린더에 현재 월 타이틀이 표시된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // then: formatMonthTitle은 'en-US' 로케일로 "April 2026" 형태를 반환
  // TopToolbar의 월 타이틀은 heading이 아닌 span으로 렌더된다
  await expect(page.getByText(/April 2026/)).toBeVisible()
})

test('캘린더에 요일 헤더가 표시된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // then: 기본 언어(ko) 기준 요일 헤더
  for (const day of ['일', '월', '화', '수', '목', '금', '토']) {
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

test('CreateEventButton이 RightEventPanel에 표시된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // then: FAB 대신 RightEventPanel 내 CreateEventButton (텍스트: "새 이벤트")
  await expect(page.getByRole('button', { name: '새 이벤트' })).toBeVisible()
})

test('오늘 날짜(11일)에 파란 원 하이라이트가 표시된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // then: 오늘(11) 셀은 bg-blue-500 클래스를 가진 내부 div를 포함
  const todayCell = page.locator('[data-testid="day-cell"]').filter({
    has: page.locator('.bg-brand-dark'),
  })
  await expect(todayCell).toBeVisible()
  await expect(todayCell.locator('.bg-brand-dark')).toContainText('11')
})
