/**
 * Schedule 라이프사이클 사용자 여정 E2E 테스트
 *
 * FAB → 일정 생성 → 캘린더에서 확인 → 상세 보기 → 편집/삭제까지의 전체 흐름을 검증한다.
 */
import { test, expect } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

const NOW_SEC = Math.floor(Date.now() / 1000)

// 오늘 날짜 (2026-04-11 기준, 테스트 환경의 실제 날짜 사용)
const today = new Date()
const todayYear = today.getFullYear()
const todayMonth = today.getMonth() + 1
const todayDay = today.getDate()
// YYYY-MM-DD 형식
const todayDateKey = `${todayYear}-${String(todayMonth).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}`

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)
})

function setupCommonMocks(page: Parameters<Parameters<typeof test>[1]>[0]) {
  return Promise.all([
    page.route('**/v1/tags/**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    }),
    page.route('**/v1/foremost**', async route => {
      await route.fulfill({ status: 404, body: '{}' })
    }),
    page.route('**/v1/holidays**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    }),
    page.route('**/v1/todos**', async route => {
      const method = route.request().method()
      if (method === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
      } else {
        await route.continue()
      }
    }),
  ])
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: FAB → Schedule → 폼 오버레이 가시성
// ─────────────────────────────────────────────────────────────────────────────
test('FAB 클릭 후 Schedule 선택 시 폼 오버레이가 이름 입력과 저장 버튼과 함께 표시된다', async ({ page }) => {
  // given
  await setupCommonMocks(page)
  await page.route('**/v1/schedules**', async route => {
    const method = route.request().method()
    if (method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    } else {
      await route.continue()
    }
  })

  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // when
  await page.getByTestId('create-event-button').click()
  await expect(page.getByRole('button', { name: 'Schedule', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Schedule', exact: true }).click()

  // then — 팝오버가 열리고 폼 요소 확인
  await expect(page.getByTestId('event-form-backdrop')).toBeVisible()
  await expect(page.getByPlaceholder('이벤트 이름 추가')).toBeVisible()
  await expect(page.getByRole('button', { name: '저장' })).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: 일정 생성 후 메인으로 돌아와 캘린더에서 확인
// ─────────────────────────────────────────────────────────────────────────────
test('일정 이름과 시간을 입력하고 저장하면 해당 날짜를 클릭 시 DayEventList에 표시된다', async ({ page }) => {
  const scheduleId = 'journey-schedule-001'
  const schedule = {
    uuid: scheduleId,
    name: '여정 테스트 일정',
    event_tag_id: null,
    event_time: { time_type: 'at', timestamp: NOW_SEC },
    repeating: null,
  }

  // given
  await setupCommonMocks(page)
  await page.route('**/v1/schedules**', async route => {
    const url = route.request().url()
    const method = route.request().method()

    if (url.includes('/schedule') && method === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(schedule) })
      return
    }
    if (method === 'GET') {
      // 캘린더 범위 조회 — 오늘 날짜에 일정 포함
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([schedule]) })
    } else {
      await route.continue()
    }
  })

  // when — 메인에서 FAB → Schedule → 팝오버에서 이름 입력 후 저장
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  await page.getByTestId('create-event-button').click()
  await page.getByRole('button', { name: 'Schedule', exact: true }).click()
  await expect(page.getByTestId('event-form-backdrop')).toBeVisible()

  await page.getByPlaceholder('이벤트 이름 추가').fill('여정 테스트 일정')
  await page.getByRole('button', { name: '저장' }).click()

  // then — 저장 후 팝오버가 닫힌다
  await expect(page.getByTestId('event-form-backdrop')).not.toBeVisible()

  // 오늘 날짜 셀 클릭 → DayEventList가 표시된다
  const todayCell = page.locator('[data-testid="day-cell"][data-today]').first()
  await todayCell.click()

  // then — DayEventList에 일정 이름이 보인다
  await expect(page.getByText('여정 테스트 일정').first()).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: DayEventList에서 일정 클릭 → 이벤트 상세 오버레이
// ─────────────────────────────────────────────────────────────────────────────
test('DayEventList에서 일정을 클릭하면 이벤트 상세 오버레이가 열리고 이름이 표시된다', async ({ page }) => {
  const scheduleId = 'journey-schedule-detail'
  const schedule = {
    uuid: scheduleId,
    name: '상세 보기 일정',
    event_tag_id: null,
    event_time: { time_type: 'at', timestamp: NOW_SEC },
    repeating: null,
  }

  // given
  await setupCommonMocks(page)
  await page.route('**/v1/schedules**', async route => {
    const url = route.request().url()
    const method = route.request().method()
    if (method !== 'GET') { await route.continue(); return }
    if (url.includes(`/schedule/${scheduleId}`)) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(schedule) })
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([schedule]) })
    }
  })
  await page.route('**/v1/event_details/**', async route => {
    await route.fulfill({ status: 404, body: '{}' })
  })

  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // 초기 상태: selectedDate=오늘이므로 오늘 클릭하면 토글로 패널이 닫힌다
  // 따라서 다른 날짜를 먼저 클릭하여 오늘 선택을 해제한 후, 다시 오늘을 클릭한다
  const otherCell = page.locator('[data-testid="day-cell"]:not([data-today])').filter({ hasText: '15' }).first()
  await otherCell.click()
  const todayCell = page.locator('[data-testid="day-cell"][data-today]').first()
  await todayCell.click()

  // RightPanel의 DayEventList에 일정이 표시될 때까지 대기
  // RightPanel은 border-l 클래스를 가진 div
  const rightPanel = page.locator('.border-l.border-border-calendar.shadow-lg')
  await expect(rightPanel.getByText('상세 보기 일정')).toBeVisible()
  // DayEventList 안의 일정 카드(div)를 클릭하면 상세 페이지로 이동
  await rightPanel.getByText('상세 보기 일정').click()

  // then — 상세 페이지로 이동
  await expect(page).toHaveURL(new RegExp(`/events/${scheduleId}`))
  await expect(page.getByRole('heading', { name: '상세 보기 일정' })).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 4: 이벤트 상세 → 편집 → 삭제 → 메인으로 복귀
// ─────────────────────────────────────────────────────────────────────────────
test('이벤트 상세에서 편집 버튼을 클릭하면 편집 폼으로 이동하고, 삭제하면 메인 페이지로 돌아온다', async ({ page }) => {
  const scheduleId = 'journey-schedule-delete'
  const schedule = {
    uuid: scheduleId,
    name: '삭제할 일정',
    event_tag_id: null,
    event_time: { time_type: 'at', timestamp: NOW_SEC },
    repeating: null,
  }

  // given
  await setupCommonMocks(page)
  await page.route('**/v1/schedules**', async route => {
    const url = route.request().url()
    const method = route.request().method()

    if (url.includes(`/schedule/${scheduleId}`) && method === 'DELETE') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) })
      return
    }
    if (method !== 'GET') { await route.continue(); return }
    if (url.includes(`/schedule/${scheduleId}`)) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(schedule) })
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    }
  })
  await page.route('**/v1/event_details/**', async route => {
    await route.fulfill({ status: 404, body: '{}' })
  })

  // when — 상세 페이지 직접 이동
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto(`/events/${scheduleId}?type=schedule`)
  await expect(page.getByRole('heading', { name: '삭제할 일정' })).toBeVisible()

  // 편집 버튼 클릭
  await page.getByRole('button', { name: '편집' }).click()
  await expect(page).toHaveURL(new RegExp(`/schedules/${scheduleId}/edit`))
  await expect(page.getByRole('heading', { name: 'Schedule 수정' })).toBeVisible()

  // 삭제 버튼 클릭 → 확인 다이얼로그 → 삭제 확인
  await page.getByRole('button', { name: '삭제' }).click()
  // ConfirmDialog 표시됨
  await expect(page.getByRole('button', { name: '삭제' }).last()).toBeVisible()
  await page.getByRole('button', { name: '삭제' }).last().click()

  // then — 메인 페이지로 돌아간다
  await expect(page).not.toHaveURL(/\/schedules\/.*\/edit/)
})
