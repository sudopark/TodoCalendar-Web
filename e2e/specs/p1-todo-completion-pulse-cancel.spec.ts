import { test, expect, type Page } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

const SAMPLE_TODO = {
  uuid: 'pulse-todo',
  name: '펄스 회귀 todo',
  is_current: true,
  event_time: null,
}

async function setupBaseRoutes(page: Page) {
  await page.route('**/v2/todos**', async route => {
    const method = route.request().method()
    const url = route.request().url()
    if (method === 'GET' && url.includes('uncompleted')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
      return
    }
    if (method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([SAMPLE_TODO]) })
      return
    }
    await route.continue()
  })
  await page.route('**/v2/schedules**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })
  await page.route('**/v2/tags**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })
  await page.route('**/v2/setting/event/tag/default/color', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ default: '#aaaaaa', holiday: '#bbbbbb' }) })
  })
  await page.route('**/v2/foremost**', async route => {
    await route.fulfill({ status: 404, body: '{}' })
  })
  await page.route('**/v2/holidays**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })
}

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)
})

test('완료 버튼 클릭 시 채움 + 펄스 상태가 노출되고, 응답 도착 후 todo 가 done 으로 이동한다', async ({ page }) => {
  await setupBaseRoutes(page)
  // complete API 응답을 800ms 지연시켜 펄스 상태를 관찰 가능하게 함
  await page.route('**/v2/todos/todo/pulse-todo/complete', async route => {
    await new Promise(r => setTimeout(r, 800))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ uuid: 'done-id', done_at: Date.now(), origin: { ...SAMPLE_TODO } }),
    })
  })

  await page.goto('/')
  const btn = page.getByRole('button', { name: SAMPLE_TODO.name })
  await expect(btn).toBeVisible()
  await btn.click()

  // 처리중 — 채움 + 펄스 상태가 표시된다
  await expect(btn).toHaveAttribute('data-completing', 'true')

  // 응답 도착 후 → 캐시에서 제거되어 목록에서 사라진다
  await expect(page.getByText(SAMPLE_TODO.name)).toBeHidden({ timeout: 5000 })
})

test('펄스 상태에서 동일 버튼을 재클릭하면 complete API 가 abort 되어 todo 가 목록에 남는다', async ({ page }) => {
  await setupBaseRoutes(page)
  // complete API 응답을 충분히 지연시켜 사용자의 abort 가 응답보다 먼저 도착하게 함
  await page.route('**/v2/todos/todo/pulse-todo/complete', async route => {
    await new Promise(r => setTimeout(r, 5000))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ uuid: 'done', done_at: Date.now(), origin: { ...SAMPLE_TODO } }),
    })
  })

  await page.goto('/')
  const btn = page.getByRole('button', { name: SAMPLE_TODO.name })
  await expect(btn).toBeVisible()
  await btn.click()
  await expect(btn).toHaveAttribute('data-completing', 'true')

  // 재클릭 — fetch abort
  await btn.click()
  await expect(btn).toHaveAttribute('data-completing', 'false')

  // todo 가 그대로 목록에 남아있다
  await expect(page.getByText(SAMPLE_TODO.name)).toBeVisible()
})
