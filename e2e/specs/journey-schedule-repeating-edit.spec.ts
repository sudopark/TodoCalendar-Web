/**
 * 회귀(#180): 반복 schedule 수정 흐름이 서버 schema 와 정합해야 한다.
 *
 * 진짜 RCA:
 * 1) 'this' scope — 서버 `exclude_schedule_occurrence` 는 body 가
 *    `{ exclude_repeatings: <occurrence timestamp number> }` (단일 number, epoch seconds).
 *    클라이언트가 `[<turn>]` (array of turn 번호) 로 보내고 있어 Firestore 가
 *    "Nested arrays are not allowed" 로 500 반환.
 * 2) 'future' scope — 서버 `update_schedule` 은 PATCH(partial) 인데
 *    클라이언트가 PUT 으로 호출. 서버가 full-replacement 로 해석해
 *    name/event_time 누락 400 반환.
 */
import { test, expect, FIXED_DATE } from '../helpers/fixedClock'
import { setupAuthContext } from '../helpers/auth'

void FIXED_DATE

const SCHEDULE_ID = 'sched-repeat-edit-180'
// 시리즈 시작 = 2026-04-08 09:00 KST (수요일)
const SERIES_START_TS = Math.floor(new Date('2026-04-08T09:00:00+09:00').getTime() / 1000)
// turn 2 인스턴스 = 2026-04-09 09:00 KST (목요일)
const TURN2_TS = Math.floor(new Date('2026-04-09T09:00:00+09:00').getTime() / 1000)

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)
})

interface RouteCapture {
  excludeRequest: { method: string; body: unknown } | null
  newScheduleRequest: { method: string; body: unknown } | null
  updateRequest: { method: string; body: unknown } | null
}

function setupSchedule(page: import('@playwright/test').Page, schedule: Record<string, unknown>): RouteCapture {
  const capture: RouteCapture = {
    excludeRequest: null,
    newScheduleRequest: null,
    updateRequest: null,
  }

  void page.route('**/v2/tags/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  void page.route('**/v2/foremost**', r => r.fulfill({ status: 404, body: '{}' }))
  void page.route('**/v2/holidays**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  void page.route('**/v2/todos**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  void page.route('**/v2/event_details/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))

  void page.route('**/v2/schedules**', async route => {
    const req = route.request()
    const url = req.url()
    const method = req.method()

    if (method === 'PATCH' && url.includes('/exclude')) {
      capture.excludeRequest = { method, body: JSON.parse(req.postData() || '{}') }
      const ts = (capture.excludeRequest.body as { exclude_repeatings?: number }).exclude_repeatings
      const updated = { ...schedule, exclude_repeatings: ts != null ? [ts] : [] }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(updated) })
      return
    }

    // PATCH (또는 PUT) /schedules/schedule/:id — update
    if ((method === 'PATCH' || method === 'PUT') && url.match(/\/schedule\/[^/]+$/)) {
      capture.updateRequest = { method, body: JSON.parse(req.postData() || '{}') }
      const updated = { ...schedule, ...(capture.updateRequest.body as object) }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(updated) })
      return
    }

    if (method === 'GET' && url.includes(`/schedule/${SCHEDULE_ID}`)) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(schedule) })
      return
    }

    if (method === 'POST') {
      capture.newScheduleRequest = { method, body: JSON.parse(req.postData() || '{}') }
      const created = { ...(capture.newScheduleRequest.body as object), uuid: 'sched-this-only-new' }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(created) })
      return
    }

    if (method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([schedule]) })
      return
    }

    await route.continue()
  })

  return capture
}

function makeDailySchedule() {
  return {
    uuid: SCHEDULE_ID,
    name: '데일리 회의',
    event_tag_id: null,
    event_time: { time_type: 'at', timestamp: SERIES_START_TS },
    repeating: {
      start: SERIES_START_TS,
      option: { optionType: 'every_day', interval: 1 },
    },
    notification_options: [],
  }
}

async function openSecondInstanceEdit(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const bars = page.getByTestId('event-bar')
  await expect(bars.nth(0)).toBeVisible()
  // 첫주 04-05~04-11 row 에 turn 1..4 chip 이 col asc 순서 (weekEventStackBuilder).
  await bars.nth(1).click() // turn 2 = 04-09

  await page.getByTestId('popover-edit-btn').click()
  await expect(page).toHaveURL(new RegExp(`/schedules/${SCHEDULE_ID}/edit`))
}

test('"이 이벤트만" 저장은 exclude_repeatings 를 클릭한 회차의 occurrence timestamp(단일 number) 로 PATCH 하고, 새 단건은 그 회차 시간으로 POST 한다', async ({ page }) => {
  // given
  const schedule = makeDailySchedule()
  const capture = setupSchedule(page, schedule)

  // when
  await openSecondInstanceEdit(page)
  await page.getByPlaceholder('이벤트 이름 추가').fill('데일리 회의 (이번만 변경)')
  await page.getByRole('button', { name: '저장' }).click()
  await expect(page.getByTestId('repeating-scope-dialog')).toBeVisible()
  await page.getByRole('button', { name: '이 이벤트만' }).click()

  await expect.poll(() => capture.excludeRequest, { timeout: 5_000 }).not.toBeNull()
  await expect.poll(() => capture.newScheduleRequest, { timeout: 5_000 }).not.toBeNull()

  // then — exclude payload 는 단일 number, 값은 클릭한 회차 timestamp
  expect(capture.excludeRequest!.method).toBe('PATCH')
  const excludeBody = capture.excludeRequest!.body as { exclude_repeatings?: unknown }
  expect(typeof excludeBody.exclude_repeatings).toBe('number')
  expect(excludeBody.exclude_repeatings).toBe(TURN2_TS)

  // and — 새 단건 schedule 의 event_time 도 같은 회차 시간
  const newBody = capture.newScheduleRequest!.body as { event_time?: { timestamp?: number } }
  expect(newBody.event_time?.timestamp).toBe(TURN2_TS)
})

test('"이 이벤트 및 이후 이벤트" 저장은 원본을 occurrence 직전에서 끊고(PATCH), 새 시리즈는 occurrence 시간에서 시작한다 (repeating.start 도 occurrence 로 rebase)', async ({ page }) => {
  // given
  const schedule = makeDailySchedule()
  const capture = setupSchedule(page, schedule)

  // when
  await openSecondInstanceEdit(page)
  await page.getByPlaceholder('이벤트 이름 추가').fill('데일리 회의 (이후 분리)')
  await page.getByRole('button', { name: '저장' }).click()
  await expect(page.getByTestId('repeating-scope-dialog')).toBeVisible()
  await page.getByRole('button', { name: '이 이벤트 및 이후 이벤트' }).click()

  await expect.poll(() => capture.updateRequest, { timeout: 5_000 }).not.toBeNull()
  await expect.poll(() => capture.newScheduleRequest, { timeout: 5_000 }).not.toBeNull()

  // then — origin update: PATCH(부분 갱신), repeating.end 가 occurrence 직전(TURN2_TS - 1)
  expect(capture.updateRequest!.method).toBe('PATCH')
  const updateBody = capture.updateRequest!.body as { repeating?: { end?: number } }
  expect(updateBody.repeating?.end).toBe(TURN2_TS - 1)

  // and — new series: event_time + repeating.start 모두 occurrence timestamp
  const newBody = capture.newScheduleRequest!.body as {
    event_time?: { timestamp?: number }
    repeating?: { start?: number }
  }
  expect(newBody.event_time?.timestamp).toBe(TURN2_TS)
  expect(newBody.repeating?.start).toBe(TURN2_TS)
})
