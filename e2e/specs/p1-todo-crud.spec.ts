import { test, expect } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)
})

test('새 Todo 폼 진입 시 이름 입력과 저장 버튼이 표시된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // when
  await page.goto('/todos/new')

  // then
  await expect(page.getByRole('heading', { name: '새 Todo' })).toBeVisible()
  await expect(page.getByLabel('이름')).toBeVisible()
  await expect(page.getByRole('button', { name: '저장' })).toBeVisible()
  await expect(page.getByRole('button', { name: '취소' })).toBeVisible()
})

test('Todo 이름을 입력하고 저장하면 이전 페이지로 돌아간다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/todos/new')
  await expect(page.getByLabel('이름')).toBeVisible()

  // when
  await page.getByLabel('이름').fill('E2E 테스트 할 일')
  await page.getByRole('button', { name: '저장' }).click()

  // then — 저장 후 폼 페이지를 벗어난다 (메인 또는 히스토리 백)
  await expect(page).not.toHaveURL('/todos/new')
})

test('이름 없이 저장하면 폼이 그대로 유지된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/todos/new')

  // when — 이름을 입력하지 않고 저장
  await page.getByRole('button', { name: '저장' }).click()

  // then — 폼이 떠있어야 한다
  await expect(page).toHaveURL(/\/todos\/new/)
  await expect(page.getByRole('heading', { name: '새 Todo' })).toBeVisible()
})

test('취소 버튼을 누르면 이전 페이지로 돌아간다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/todos/new')

  // when
  await page.getByRole('button', { name: '취소' }).click()

  // then
  await expect(page).not.toHaveURL('/todos/new')
})

test('Todo 수정 폼 진입 시 "Todo 수정" 제목이 표시된다', async ({ page }) => {
  // given — 먼저 Todo 하나 생성
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.route('**/v1/todos/todo', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          uuid: 'test-todo-id-edit',
          name: 'E2E 수정용 Todo',
          is_current: true,
        }),
      })
    } else {
      await route.continue()
    }
  })

  await page.route('**/v1/todos/todo/test-todo-id-edit', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          uuid: 'test-todo-id-edit',
          name: 'E2E 수정용 Todo',
          is_current: true,
        }),
      })
    } else {
      await route.continue()
    }
  })

  // when
  await page.goto('/todos/test-todo-id-edit/edit')

  // then
  await expect(page.getByRole('heading', { name: 'Todo 수정' })).toBeVisible()
  await expect(page.getByLabel('이름')).toHaveValue('E2E 수정용 Todo')
  await expect(page.getByRole('button', { name: '삭제' })).toBeVisible()
})

test('수정 폼에서 삭제 버튼 누르면 확인 다이얼로그가 표시된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  await page.route('**/v1/todos/todo/todo-to-delete', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          uuid: 'todo-to-delete',
          name: '삭제할 할 일',
          is_current: true,
        }),
      })
    } else {
      await route.continue()
    }
  })

  await page.goto('/todos/todo-to-delete/edit')
  await expect(page.getByRole('heading', { name: 'Todo 수정' })).toBeVisible()

  // when
  await page.getByRole('button', { name: '삭제' }).click()

  // then — ConfirmDialog가 열린다
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByText(/삭제할 할 일/)).toBeVisible()
})

test('삭제 다이얼로그에서 취소를 누르면 다이얼로그가 닫힌다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  await page.route('**/v1/todos/todo/todo-cancel-delete', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        uuid: 'todo-cancel-delete',
        name: '취소 테스트 Todo',
        is_current: true,
      }),
    })
  })

  await page.goto('/todos/todo-cancel-delete/edit')
  await page.getByRole('button', { name: '삭제' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()

  // when — 다이얼로그 내부의 취소 버튼 클릭 (폼 헤더의 취소 버튼과 구분)
  await page.getByRole('dialog').getByRole('button', { name: '취소' }).click()

  // then
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.getByRole('heading', { name: 'Todo 수정' })).toBeVisible()
})

test('삭제 다이얼로그에서 확인하면 API를 호출하고 이전 페이지로 돌아간다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  await page.route('**/v1/todos/todo/todo-confirm-delete', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          uuid: 'todo-confirm-delete',
          name: '확인 삭제 Todo',
          is_current: true,
        }),
      })
    } else if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok' }),
      })
    } else {
      await route.continue()
    }
  })

  await page.goto('/todos/todo-confirm-delete/edit')
  await page.getByRole('button', { name: '삭제' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()

  // when — 확인 버튼 클릭 (ConfirmDialog에서 confirmLabel이 "삭제")
  await page.getByRole('dialog').getByRole('button', { name: '삭제' }).click()

  // then — 폼 페이지를 벗어난다
  await expect(page).not.toHaveURL(/\/todos\/todo-confirm-delete\/edit/)
})
