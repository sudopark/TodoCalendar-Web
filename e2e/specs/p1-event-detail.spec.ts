import { test, expect } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)
})

const TODO_FIXTURE = {
  uuid: 'test-id',
  name: 'E2E 테스트 할 일',
  is_current: true,
  event_time: { time_type: 'at', timestamp: 1744290000 },
}

const SCHEDULE_FIXTURE = {
  uuid: 'test-id',
  name: 'E2E 테스트 일정',
  event_time: { time_type: 'at', timestamp: 1744290000 },
}

function mockTodoApi(page: Parameters<Parameters<typeof test>[1]>[0]) {
  return page.route('**/v1/todos/todo/test-id', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(TODO_FIXTURE),
    })
  })
}

function mockScheduleApi(page: Parameters<Parameters<typeof test>[1]>[0]) {
  return page.route('**/v1/schedules/schedule/test-id', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(SCHEDULE_FIXTURE),
    })
  })
}

test('Todo 이벤트 상세 페이지에 이벤트 이름이 표시된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await mockTodoApi(page)

  // when
  await page.goto('/events/test-id?type=todo')
  await expect(page.getByRole('heading', { name: 'E2E 테스트 할 일' })).toBeVisible()
})

test('Todo 이벤트 상세 페이지에 편집 버튼이 표시된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await mockTodoApi(page)

  // when
  await page.goto('/events/test-id?type=todo')
  await expect(page.getByRole('heading', { name: 'E2E 테스트 할 일' })).toBeVisible()

  // then
  await expect(page.getByRole('button', { name: '편집' }).first()).toBeVisible()
})

test('Todo 이벤트 상세 페이지에 핀/언핀 버튼이 표시된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await mockTodoApi(page)

  // when
  await page.goto('/events/test-id?type=todo')
  await expect(page.getByRole('heading', { name: 'E2E 테스트 할 일' })).toBeVisible()

  // then — "고정 설정" 또는 "고정 해제" 버튼이 표시된다
  const pinButton = page.getByRole('button', { name: /고정/ })
  await expect(pinButton).toBeVisible()
})

test('뒤로 버튼을 누르면 이전 페이지로 돌아간다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await mockTodoApi(page)
  await page.goto('/events/test-id?type=todo')
  await expect(page.getByRole('heading', { name: 'E2E 테스트 할 일' })).toBeVisible()

  // when
  await page.getByRole('button', { name: /← 뒤로/ }).click()

  // then
  await expect(page).not.toHaveURL(/\/events\/test-id/)
})

test('Schedule 이벤트 상세 페이지에 이벤트 이름이 표시된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await mockScheduleApi(page)

  // when
  await page.goto('/events/test-id?type=schedule')

  // then
  await expect(page.getByRole('heading', { name: 'E2E 테스트 일정' })).toBeVisible()
})

test('Schedule 이벤트 상세 페이지에 편집 버튼이 표시된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await mockScheduleApi(page)

  // when
  await page.goto('/events/test-id?type=schedule')
  await expect(page.getByRole('heading', { name: 'E2E 테스트 일정' })).toBeVisible()

  // then
  await expect(page.getByRole('button', { name: '편집' }).first()).toBeVisible()
})
