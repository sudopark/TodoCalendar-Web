import { test, expect } from '@playwright/test'

test('로그인 페이지에 타이틀 "TodoCalendar"와 서브타이틀이 표시된다', async ({ page }) => {
  // given / when
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  // then
  await expect(page.getByRole('heading', { name: 'TodoCalendar' })).toBeVisible()
  await expect(page.getByText('계속하려면 로그인하세요')).toBeVisible()
})

test('로그인 페이지에 Google 로그인 버튼이 표시된다', async ({ page }) => {
  // given / when
  await page.goto('/login')

  // then
  await expect(page.getByRole('button', { name: /Google/ })).toBeVisible()
})

test('로그인 페이지에 Apple 로그인 버튼이 표시된다', async ({ page }) => {
  // given / when
  await page.goto('/login')

  // then
  await expect(page.getByRole('button', { name: /Apple/ })).toBeVisible()
})

test('미인증 상태에서 / 방문 시 /login 으로 리다이렉트된다', async ({ page }) => {
  // given / when
  await page.goto('/')

  // then
  await expect(page).toHaveURL(/\/login/)
})

test('미인증 상태에서 /todos/new 방문 시 /login 으로 리다이렉트된다', async ({ page }) => {
  // given / when
  await page.goto('/todos/new')

  // then
  await expect(page).toHaveURL(/\/login/)
})

test('미인증 상태에서 /settings 방문 시 /login 으로 리다이렉트된다', async ({ page }) => {
  // given / when
  await page.goto('/settings')

  // then
  await expect(page).toHaveURL(/\/login/)
})
