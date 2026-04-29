import { test, expect } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

// Today is 2026-04-11, so current month is April 2026
const APRIL_HOLIDAYS = [
  { summary: '어린이날', start: { date: '2026-05-05' }, end: { date: '2026-05-06' } },
  // Put a holiday in April to test current month rendering
  { summary: '식목일', start: { date: '2026-04-05' }, end: { date: '2026-04-06' } },
]

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)
})

test('GET /v1/holiday 가 공휴일을 반환하면 해당 날짜가 캘린더에 빨간색으로 표시된다', async ({ page }) => {
  // given — 공휴일 API가 4월 5일을 공휴일로 반환
  await page.route('**/v1/holiday**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: APRIL_HOLIDAYS }),
    })
  })

  // when
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // then — 4월 5일 날짜 숫자가 강조 색상(text-red-400) 텍스트 클래스를 갖는다
  // 새 MainCalendarGrid 는 holiday/일요일/토요일 강조에 text-red-400 을 사용
  const holidayCell = page.getByTestId('day-cell').filter({
    has: page.locator('div.text-red-400', { hasText: '5' }),
  }).first()
  await expect(holidayCell).toBeVisible()
})

test('공휴일 날짜 셀에 title 속성으로 공휴일 이름이 설정된다', async ({ page }) => {
  // given — 공휴일 API 모킹
  await page.route('**/v1/holiday**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: APRIL_HOLIDAYS }),
    })
  })

  // when
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // then — 4월 5일 셀의 title 속성에 공휴일 이름이 포함된다
  const holidayCell = page.getByTestId('day-cell').filter({
    has: page.locator('div', { hasText: '5' }),
  }).first()
  // title 속성에 공휴일 이름이 있어야 함
  await expect(holidayCell).toHaveAttribute('title', /식목일/)
})

test('GET /v1/holiday 가 빈 목록을 반환하면 일요일을 제외한 날짜는 빨간색이 아니다', async ({ page }) => {
  // given — 공휴일 없음
  await page.route('**/v1/holiday**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [] }),
    })
  })

  // when
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // then — 4월 13일(월요일)은 빨간색 텍스트가 아니다
  // 13일 셀이 존재하되, text-red-500 클래스가 없어야 한다
  const mondayCell = page.getByTestId('day-cell').filter({
    hasText: '13',
  }).first()
  await expect(mondayCell).toBeVisible()
  // text-red-500 클래스가 날짜 숫자 div에 없어야 한다
  const dateDiv = mondayCell.locator('div').first()
  await expect(dateDiv).not.toHaveClass(/text-red-500/)
})
