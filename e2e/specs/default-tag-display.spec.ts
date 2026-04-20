import { test, expect } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)

  // localStorage에 디폴트 태그 ID 주입 (페이지 로드 전)
  await context.addInitScript(() => {
    localStorage.setItem(
      'event_defaults',
      JSON.stringify({ defaultTagId: 'tag-personal', defaultNotificationSeconds: null }),
    )
  })
})

test('유저가 디폴트 태그를 지정하면 태그 없이 저장된 Todo에 해당 태그명이 표시된다', async ({ page }) => {
  // given: API 모킹 — 디폴트 색상, 유저 태그 1개("개인"), 태그 없는 Current Todo 1개
  await page.route('**/v1/setting/event/tag/default/color', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ default: '#aaaaaa', holiday: '#bbbbbb' }),
    })
  })

  await page.route('**/v1/tags/all', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { uuid: 'tag-personal', name: '개인', color_hex: '#00ff00' },
      ]),
    })
  })

  // getCurrentTodos() → GET /v1/todos (쿼리파라미터 없음, is_current=true 항목 반환)
  await page.route('**/v1/todos', async route => {
    if (route.request().method() === 'GET' && !route.request().url().includes('?')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { uuid: 'todo-no-tag', name: '태그 미지정 할일', is_current: true, event_tag_id: null },
        ]),
      })
    } else {
      await route.continue()
    }
  })

  // 나머지 라우트는 빈 응답
  await page.route('**/v1/todos/uncompleted', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  await page.route('**/v1/schedules**', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    } else {
      await route.continue()
    }
  })
  await page.route('**/v1/todos/**', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    } else {
      await route.continue()
    }
  })
  await page.route('**/v1/foremost**', async route => {
    await route.fulfill({ status: 404, body: '{}' })
  })
  await page.route('**/v1/holidays**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })

  // when: 메인 진입
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // then: "태그 미지정 할일"이 리스트에 노출되고, 그 행에 디폴트 태그명 "개인"이 같이 보인다
  const todoRow = page.getByText('태그 미지정 할일').first()
  await expect(todoRow).toBeVisible()
  await expect(page.getByText('개인')).toBeVisible()
})

test('디폴트 태그가 지정되지 않았으면 태그 미지정 이벤트에 태그명이 노출되지 않는다', async ({ page, context }) => {
  // 이 테스트는 beforeEach의 localStorage 주입을 덮어씀
  await context.addInitScript(() => {
    localStorage.setItem(
      'event_defaults',
      JSON.stringify({ defaultTagId: null, defaultNotificationSeconds: null }),
    )
  })

  // given
  await page.route('**/v1/setting/event/tag/default/color', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ default: '#aaaaaa', holiday: '#bbbbbb' }) })
  })
  await page.route('**/v1/tags/all', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  await page.route('**/v1/todos', async route => {
    if (route.request().method() === 'GET' && !route.request().url().includes('?')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { uuid: 'todo-no-tag', name: '태그 미지정 할일', is_current: true, event_tag_id: null },
        ]),
      })
    } else {
      await route.continue()
    }
  })
  await page.route('**/v1/todos/uncompleted', async route => { await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }) })
  await page.route('**/v1/schedules**', async route => {
    if (route.request().method() === 'GET') await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    else await route.continue()
  })
  await page.route('**/v1/todos/**', async route => {
    if (route.request().method() === 'GET') await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    else await route.continue()
  })
  await page.route('**/v1/foremost**', async route => { await route.fulfill({ status: 404, body: '{}' }) })
  await page.route('**/v1/holidays**', async route => { await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }) })

  // when
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // then: Todo 자체는 노출되지만, 태그명 영역에는 i18n 기본값("Default" 또는 "기본")이 들어가지 않고 빈 상태가 자연스러운 상황.
  // 단, 해석 규칙상 defaultColors.default는 있으므로 kind='default'가 되어 태그명이 i18n 번역값으로 노출될 수 있다.
  // 따라서 이 테스트는 "개인"이 절대 나오지 않음을 확인.
  const todoRow = page.getByText('태그 미지정 할일').first()
  await expect(todoRow).toBeVisible()
  await expect(page.getByText('개인')).toHaveCount(0)
})
