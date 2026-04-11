/**
 * 캘린더 이벤트 표시 사용자 여정 E2E 테스트
 *
 * 특정 날짜에 이벤트 → 캘린더 셀 표시 → DayEventList 표시 → 빈 날짜 → 월 이동 흐름을 검증한다.
 */
import { test, expect } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)
})

// 오늘 기준으로 타임스탬프 계산
const today = new Date()
today.setHours(12, 0, 0, 0)
const todayTimestamp = Math.floor(today.getTime() / 1000)

// 오늘 날짜
const todayYear = today.getFullYear()
const todayMonth = today.getMonth() + 1
const todayDay = today.getDate()

// 내일 날짜 (다음 달 이동 시 테스트용)
const tomorrow = new Date(today)
tomorrow.setDate(tomorrow.getDate() + 1)
const tomorrowTimestamp = Math.floor(tomorrow.getTime() / 1000)

async function setupCommonMocks(
  page: Parameters<Parameters<typeof test>[1]>[0],
  schedulesList: object[] = [],
  todosList: object[] = [],
) {
  await page.route('**/v1/tags/**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })
  await page.route('**/v1/foremost**', async route => {
    await route.fulfill({ status: 404, body: '{}' })
  })
  await page.route('**/v1/holidays**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })
  await page.route('**/v1/todos**', async route => {
    const method = route.request().method()
    if (method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(todosList) })
    } else {
      await route.continue()
    }
  })
  await page.route('**/v1/schedules**', async route => {
    const url = route.request().url()
    const method = route.request().method()
    if (method === 'GET' && url.includes('lower=') && url.includes('upper=')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(schedulesList) })
    } else if (method !== 'GET') {
      await route.continue()
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: 특정 날짜 이벤트 → 캘린더 셀에 색상 점 표시
// ─────────────────────────────────────────────────────────────────────────────
test('특정 날짜에 이벤트가 있으면 캘린더 셀에 색상 인디케이터가 표시된다', async ({ page }) => {
  const schedule = {
    uuid: 'cal-event-001',
    name: '캘린더 표시 일정',
    event_tag_id: null,
    event_time: { time_type: 'at', timestamp: todayTimestamp },
    repeating: null,
  }

  // given
  await setupCommonMocks(page, [schedule], [])

  // when
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // then — 오늘 날짜 셀 (data-testid="day-cell")에서 모바일 dots 또는 데스크톱 컬러바가 표시
  // 모바일: data-testid="event-dots"
  // 데스크톱: 색상 바 div
  // 뷰포트에 따라 다를 수 있으므로 둘 중 하나가 있으면 됨
  const todayCellWithEvents = page.locator('[data-testid="day-cell"]').filter({
    has: page.locator('.bg-blue-500'), // today의 날짜 숫자는 bg-blue-500
  }).first()

  await expect(todayCellWithEvents).toBeVisible()

  // 이벤트가 있으므로 mobile dots 또는 데스크톱 컬러바가 있어야 함
  const hasMobileDots = await todayCellWithEvents.locator('[data-testid="event-dots"]').count()
  const hasDesktopBars = await todayCellWithEvents.locator('.hidden.md\\:block').count()

  expect(hasMobileDots + hasDesktopBars).toBeGreaterThan(0)
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: 이벤트 있는 날짜 클릭 → DayEventList에 이벤트 표시
// ─────────────────────────────────────────────────────────────────────────────
test('이벤트가 있는 날짜를 클릭하면 DayEventList에 해당 이벤트가 표시된다', async ({ page }) => {
  const schedule = {
    uuid: 'cal-event-day-list',
    name: '날짜 클릭 테스트 일정',
    event_tag_id: null,
    event_time: { time_type: 'at', timestamp: todayTimestamp },
    repeating: null,
  }

  // given
  await setupCommonMocks(page, [schedule], [])

  // when
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // 오늘 날짜 셀 클릭
  const todayCell = page.locator('[data-testid="day-cell"]').filter({
    has: page.locator('.bg-blue-500'),
  }).first()
  await todayCell.click()

  // then — DayEventList에 일정 이름이 표시된다 (section > ul 내)
  const dayEventSection = page.locator('section').last()
  await expect(dayEventSection.getByText('날짜 클릭 테스트 일정')).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: 이벤트 없는 날짜 클릭 → "이벤트가 없습니다" 메시지
// ─────────────────────────────────────────────────────────────────────────────
test('이벤트가 없는 날짜를 클릭하면 "이벤트가 없습니다" 메시지가 표시된다', async ({ page }) => {
  // given — 이벤트 없음
  await setupCommonMocks(page, [], [])

  // when
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // 오늘 날짜 셀 클릭
  const todayCell = page.locator('[data-testid="day-cell"]').filter({
    has: page.locator('.bg-blue-500'),
  }).first()
  await todayCell.click()

  // then — 이벤트 없음 메시지 표시
  await expect(page.getByText('이벤트가 없습니다')).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 4: 다음 달로 이동 → 해당 월 이벤트 fetch
// ─────────────────────────────────────────────────────────────────────────────
test('다음 달로 이동하면 해당 월 범위로 이벤트 fetch 요청이 발생한다', async ({ page }) => {
  // 다음 달 이벤트
  const nextMonthDate = new Date(today)
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1)
  nextMonthDate.setDate(1)
  nextMonthDate.setHours(12, 0, 0, 0)
  const nextMonthTimestamp = Math.floor(nextMonthDate.getTime() / 1000)

  const nextMonthSchedule = {
    uuid: 'next-month-event-001',
    name: '다음 달 일정',
    event_tag_id: null,
    event_time: { time_type: 'at', timestamp: nextMonthTimestamp },
    repeating: null,
  }

  // given — 현재 달은 빈 목록, 다음 달은 일정 포함
  await page.route('**/v1/tags/**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })
  await page.route('**/v1/foremost**', async route => {
    await route.fulfill({ status: 404, body: '{}' })
  })
  await page.route('**/v1/holidays**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })
  await page.route('**/v1/todos**', async route => {
    const method = route.request().method()
    if (method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    } else {
      await route.continue()
    }
  })

  let fetchedNextMonth = false
  await page.route('**/v1/schedules**', async route => {
    const url = route.request().url()
    const method = route.request().method()
    if (method !== 'GET') { await route.continue(); return }

    if (url.includes('lower=') && url.includes('upper=')) {
      const urlObj = new URL(url)
      const lower = Number(urlObj.searchParams.get('lower'))
      // lower가 다음 달 범위인지 확인
      if (lower > nextMonthTimestamp - 40 * 24 * 3600) {
        fetchedNextMonth = true
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([nextMonthSchedule]) })
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
      }
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    }
  })

  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // when — CalendarHeader에서 다음 달 버튼 클릭
  const nextBtn = page.getByRole('button', { name: 'Next month' })
  await nextBtn.click()
  await page.waitForTimeout(500) // 비동기 fetch 완료 대기

  // then — 다음 달 범위로 fetch가 발생했어야 한다
  expect(fetchedNextMonth).toBe(true)
})
