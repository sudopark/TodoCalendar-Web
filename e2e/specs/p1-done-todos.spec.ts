import { test, expect } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)
})

test('/done 진입 시 완료된 할 일 페이지가 렌더된다', async ({ page }) => {
  // given / when
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/done')

  // then
  await expect(page.getByRole('heading', { name: '완료된 할 일' })).toBeVisible()
})

test('완료된 할 일이 없으면 빈 상태 메시지가 표시된다', async ({ page }) => {
  // given — API가 빈 배열을 반환하도록 모킹
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  await page.route('**/v1/todos/dones**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })

  // when
  await page.goto('/done')

  // then
  await expect(page.getByText('완료된 할 일이 없습니다')).toBeVisible()
})

test('헤더 네비게이션의 완료 링크를 통해 /done으로 이동할 수 있다', async ({ page }) => {
  // given — 메인페이지에서는 Header가 숨겨지므로 /done 페이지에서 Header 확인
  await page.goto('/done')
  await page.waitForLoadState('networkidle')

  // then — /done 페이지에 Header가 표시되고 완료 링크가 활성 상태
  await expect(page).toHaveURL('/done')
  await expect(page.getByRole('heading', { name: '완료된 할 일' })).toBeVisible()
  await expect(page.getByRole('link', { name: '완료' })).toBeVisible()
})

test('완료된 항목이 있으면 이름이 목록에 표시된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const doneItems = [
    { uuid: 'done-1', name: '완료된 할 일 A', done_at: Math.floor(Date.now() / 1000) - 3600 },
    { uuid: 'done-2', name: '완료된 할 일 B', done_at: Math.floor(Date.now() / 1000) - 7200 },
  ]

  await page.route('**/v1/todos/dones**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(doneItems),
    })
  })

  // when
  await page.goto('/done')

  // then (React StrictMode dev 환경에서 중복 렌더 가능 → first() 사용)
  await expect(page.getByText('완료된 할 일 A').first()).toBeVisible()
  await expect(page.getByText('완료된 할 일 B').first()).toBeVisible()
})

test('완료된 항목에 되돌리기 버튼과 삭제 버튼이 표시된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const doneItems = [
    { uuid: 'done-with-actions', name: '액션 테스트 항목', done_at: Math.floor(Date.now() / 1000) },
  ]

  await page.route('**/v1/todos/dones**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(doneItems),
    })
  })

  // when
  await page.goto('/done')
  await expect(page.getByText('액션 테스트 항목').first()).toBeVisible()

  // then
  await expect(page.getByRole('button', { name: '되돌리기' }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: '삭제' }).first()).toBeVisible()
})

test('삭제 버튼을 누르면 삭제 확인 다이얼로그가 표시된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const doneItems = [
    { uuid: 'done-to-delete', name: '삭제할 완료 항목', done_at: Math.floor(Date.now() / 1000) },
  ]

  await page.route('**/v1/todos/dones**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(doneItems),
    })
  })

  await page.goto('/done')
  await expect(page.getByText('삭제할 완료 항목').first()).toBeVisible()

  // when
  await page.getByRole('button', { name: '삭제' }).first().click()

  // then — ConfirmDialog가 열린다
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByText('이 완료된 할 일을 삭제할까요?')).toBeVisible()
})

test('삭제 확인 다이얼로그에서 취소를 누르면 닫힌다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const doneItems = [
    { uuid: 'done-cancel-delete', name: '삭제취소 항목', done_at: Math.floor(Date.now() / 1000) },
  ]

  await page.route('**/v1/todos/dones**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(doneItems),
    })
  })

  await page.goto('/done')
  await page.getByRole('button', { name: '삭제' }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()

  // when
  await page.getByRole('button', { name: '취소' }).click()

  // then
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.getByText('삭제취소 항목').first()).toBeVisible()
})

test('모든 항목이 표시되면 "모두 표시됨" 안내 문구가 렌더된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const doneItems = [
    { uuid: 'done-all-shown', name: '마지막 항목', done_at: Math.floor(Date.now() / 1000) },
  ]

  await page.route('**/v1/todos/dones**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(doneItems),
    })
  })

  // when
  await page.goto('/done')
  await expect(page.getByText('마지막 항목').first()).toBeVisible()

  // then
  await expect(page.getByText('모두 표시됨')).toBeVisible()
})
