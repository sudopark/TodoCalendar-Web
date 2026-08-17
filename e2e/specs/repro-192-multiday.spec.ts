import { test, expect } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

// #192 재현: iOS 가 만든 태그 color_hex 는 8자리(#RRGGBBAA, alpha 포함)로 온다.
// 멀티데이 allday 일정(7/31~8/14, KST)이 8자리 태그 색을 쓰면 EventBar 의 `${color}88` 가
// 무효 hex 가 돼 배경이 투명해진다 — span 영역은 차지하나 색이 안 칠해지는 증상.
const KST = 32400
const ps = Math.floor(new Date('2026-07-31T00:00:00+09:00').getTime() / 1000)
const pe = Math.floor(new Date('2026-08-14T23:59:59+09:00').getTime() / 1000)
const INVEST_TAG = { uuid: 'tag-invest', name: '투자', color_hex: '#1976D2FF' } // 8자리(iOS)
const MULTI_DAY = {
  uuid: 'dummy-multiday-allday',
  name: '멀티데이 테스트 일정',
  event_tag_id: INVEST_TAG.uuid,
  event_time: { time_type: 'allday', period_start: ps, period_end: pe, seconds_from_gmt: KST },
  notification_options: [],
  exclude_repeatings: [],
}

test.beforeEach(async ({ page, context }) => {
  await page.clock.install({ time: new Date('2026-08-10T09:00:00+09:00') })
  await setupAuthContext(context)
  await page.route('**/v2/tags/all', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([INVEST_TAG]) }))
  await page.route('**/v2/tags/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route('**/v2/foremost**', r => r.fulfill({ status: 404, body: '{}' }))
  await page.route('**/v2/holidays**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route('**/v2/todos**', async r => {
    if (r.request().method() === 'GET') await r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    else await r.continue()
  })
  await page.route('**/v2/schedules**', async r => {
    if (r.request().method() === 'GET') await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([MULTI_DAY]) })
    else await r.continue()
  })
})

test('8자리 hex 태그 멀티데이 allday 가 연속 span + 채워진 배경으로 표시된다', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const bars = page.locator('[data-testid="event-bar"]').filter({ hasText: '멀티데이 테스트' })
  const count = await bars.count()
  expect(count).toBeGreaterThan(0)

  const cellWidth = (await page.locator('[data-testid="day-cell"]').first().boundingBox())!.width
  let hasSpan = false
  let allFilled = true
  for (let i = 0; i < count; i++) {
    const bar = bars.nth(i)
    const box = await bar.boundingBox()
    if (box && box.width > cellWidth * 1.5) hasSpan = true
    const bg = await bar.evaluate(el => getComputedStyle(el).backgroundColor)
    // 투명/미지정이면 'rgba(0, 0, 0, 0)' 또는 빈 값 → 버그
    if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') allFilled = false
  }

  expect(hasSpan).toBe(true)      // 영역(span) 차지
  expect(allFilled).toBe(true)    // 배경 채워짐 (투명 회귀 차단)
})
