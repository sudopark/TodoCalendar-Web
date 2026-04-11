import { test, expect } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)
})

test('빠른 입력에 이름을 입력하고 Enter를 누르면 Current Todo가 생성된다', async ({ page }) => {
  // given
  await page.route('**/v1/todos**', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    } else {
      await route.continue()
    }
  })
  await page.route('**/v1/schedules**', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    } else {
      await route.continue()
    }
  })
  await page.route('**/v1/tags**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })
  await page.route('**/v1/foremost**', async route => {
    await route.fulfill({ status: 404, body: '{}' })
  })
  await page.route('**/v1/holidays**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })

  // create todo API: 새로 생성된 Current Todo 반환
  await page.route('**/v1/todos/todo', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          uuid: 'quick-todo-id',
          name: '빠른 입력 테스트',
          is_current: true,
        }),
      })
    } else {
      await route.continue()
    }
  })

  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // when: QuickTodoInput에 텍스트를 입력하고 Enter
  const input = page.getByPlaceholder('할 일 추가...')
  await expect(input).toBeVisible()
  await input.fill('빠른 입력 테스트')
  await input.press('Enter')

  // then: Current Todo 목록에 새로운 항목이 나타난다
  await expect(page.getByText('빠른 입력 테스트')).toBeVisible()
  // 입력 필드가 초기화된다
  await expect(input).toHaveValue('')
})
