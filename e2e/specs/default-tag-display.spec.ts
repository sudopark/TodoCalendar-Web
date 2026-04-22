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

test('서버 디폴트 색상이 비어있어도 이벤트는 정상 렌더되고 앱 내장 기본 색상/이름이 노출된다', async ({ page, context }) => {
  // beforeEach의 localStorage를 덮어써 defaultTagId도 비움
  await context.addInitScript(() => {
    localStorage.setItem(
      'event_defaults',
      JSON.stringify({ defaultTagId: null, defaultNotificationSeconds: null }),
    )
  })

  // given: 서버가 defaultColors를 null로 반환 + 태그 목록도 빈
  await page.route('**/v1/setting/event/tag/default/color', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: 'null' })
  })
  await page.route('**/v1/tags/all', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  await page.route('**/v1/todos/current', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { uuid: 'todo-no-tag', name: '태그 미지정 할일', is_current: true, event_tag_id: null },
      ]),
    })
  })
  await page.route('**/v1/todos/uncompleted', async route => { await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }) })
  await page.route('**/v1/schedules**', async route => {
    if (route.request().method() === 'GET') await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    else await route.continue()
  })
  await page.route('**/v1/todos**', async route => {
    if (route.request().method() === 'GET') await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    else await route.continue()
  })
  await page.route('**/v1/foremost**', async route => { await route.fulfill({ status: 404, body: '{}' }) })
  await page.route('**/v1/holidays**', async route => { await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }) })

  // when
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // then: 이벤트가 노출되고, i18n 디폴트 태그명(영문/한글 중 하나)이 같이 보임
  await expect(page.getByText('태그 미지정 할일').first()).toBeVisible()
  // 디폴트 태그명: 프로젝트 번역에 따라 "Default" 또는 "기본" 중 하나는 반드시 노출됨
  const defaultLabelCount = await Promise.all([
    page.getByText('Default').count(),
    page.getByText('기본').count(),
  ])
  expect(defaultLabelCount.some(n => n > 0)).toBe(true)
})
