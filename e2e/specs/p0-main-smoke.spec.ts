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
  await expect(page.getByRole('button', { name: 'Previous month', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next month', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '설정' })).toBeVisible()
})

test('캘린더에 현재 월 타이틀이 표시된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // then: TopToolbar 의 월 타이틀은 year/month 두 개의 span 으로 분리되어 렌더된다 (디폴트 언어 ko 기준)
  await expect(page.getByTestId('toolbar-year')).toHaveText('2026')
  await expect(page.getByTestId('toolbar-month')).toHaveText('4월')
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

  // then: RightEventPanel 내 CreateEventButton
  await expect(page.getByTestId('create-event-button')).toBeVisible()
})

test('오늘 날짜(11일)에 파란 원 하이라이트가 표시된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // then: 오늘 셀은 data-today 속성을 가진다
  const todayCell = page.locator('[data-testid="day-cell"][data-today]')
  await expect(todayCell).toBeVisible()
})
