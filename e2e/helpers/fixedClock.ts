/**
 * 시간 의존 e2e spec 용 fixture — `Date.now()` / `setTimeout` 등을 고정 시점으로 install 한다.
 *
 * 사용:
 *   import { test, expect } from '../helpers/fixedClock'
 *
 * 이렇게 import 한 spec 의 모든 test 는 시작 시점부터 FIXED_DATE 로 동작한다.
 * 캘린더가 4월을 보여주는 것을 전제로 작성된 spec ("4월" 하드코드, April 10, 식목일 등) 의
 * 회귀를 막기 위한 안전망. server-side 시간은 영향 받지 않으므로 client-only display 의존 spec 에만 사용.
 */
import { test as base, expect } from '@playwright/test'

export const FIXED_DATE = new Date('2026-04-11T09:00:00+09:00')
// spec 의 `new Date()` 도 같은 시점으로 — page.clock 은 브라우저 시간만 고정하고 Node 프로세스(=playwright runner) 시간은 그대로다.
export const FIXED_TODAY_TIMESTAMP = Math.floor(new Date('2026-04-11T12:00:00+09:00').getTime() / 1000)

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.clock.install({ time: FIXED_DATE })
    await use(page)
  },
})

export { expect }
