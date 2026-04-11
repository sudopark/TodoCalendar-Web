import { test, expect } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

const MOCK_TODO_EVENT = {
  uuid: 'foremost-todo-uuid',
  name: '중요한 할 일',
  event_tag_id: null,
  event_time: null,
  is_current: true,
}

const MOCK_FOREMOST_WITH_EVENT = {
  event_id: 'foremost-todo-uuid',
  is_todo: true,
  event: MOCK_TODO_EVENT,
}

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)
})

test('GET /v1/foremost/event 가 이벤트를 반환하면 메인 페이지에 배너가 표시된다', async ({ page }) => {
  // given — foremost API가 이벤트를 반환하도록 모킹
  await page.route('**/v1/foremost/event', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_FOREMOST_WITH_EVENT),
      })
    } else {
      await route.continue()
    }
  })

  // when — 메인 페이지로 이동
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // then — ForemostEventBanner가 표시된다
  await expect(page.getByTestId('foremost-banner')).toBeVisible()
})

test('Foremost 배너에 이벤트 이름이 표시된다', async ({ page }) => {
  // given — foremost API가 이름이 있는 이벤트를 반환
  await page.route('**/v1/foremost/event', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_FOREMOST_WITH_EVENT),
      })
    } else {
      await route.continue()
    }
  })

  // when
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // then — 이벤트 이름이 배너에 보인다
  await expect(page.getByTestId('foremost-banner')).toContainText('중요한 할 일')
})

test('GET /v1/foremost/event 가 404를 반환하면 배너가 표시되지 않는다', async ({ page }) => {
  // given — foremost API가 404 (등록된 foremost 없음)
  await page.route('**/v1/foremost/event', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 404, body: '' })
    } else {
      await route.continue()
    }
  })

  // when
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // then — 배너가 없다
  await expect(page.getByTestId('foremost-banner')).not.toBeVisible()
})

test('GET /v1/foremost/event 가 event: null 을 반환하면 배너가 표시되지 않는다', async ({ page }) => {
  // given — event 필드가 null인 foremost 응답
  await page.route('**/v1/foremost/event', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ event_id: 'some-id', is_todo: true, event: null }),
      })
    } else {
      await route.continue()
    }
  })

  // when
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // then — event가 없으므로 배너가 렌더되지 않는다
  await expect(page.getByTestId('foremost-banner')).not.toBeVisible()
})
