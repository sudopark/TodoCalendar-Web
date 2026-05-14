import { test, expect, type Route } from '@playwright/test'

const VALID_CHALLENGE = 'valid-challenge-abc123def456'

test('미로그인 상태에서 /oauth/consent 진입 → /login 으로 redirect, AS fetch 없음', async ({ page }) => {
  // AS fetch 가 호출되면 안 됨 (auth 체크가 fetch 보다 먼저)
  let fetchedAs = false
  await page.route(`**/v1/oauth/consent/${VALID_CHALLENGE}`, (route: Route) => {
    fetchedAs = true
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{}',
    })
  })

  await page.goto(`/oauth/consent?challenge=${VALID_CHALLENGE}`)

  // 로그인 페이지로 이동
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole('button', { name: /Google/ })).toBeVisible()

  // AS fetch 안 했음
  expect(fetchedAs).toBe(false)
})

test('미로그인 상태에서 /oauth/consent/error 진입 → 인증 없이도 안내 표시', async ({ page }) => {
  // error page 는 AuthGuard 밖이므로 미로그인 상태에서도 접근 가능해야 함
  await page.goto('/oauth/consent/error?reason=invalid_challenge')
  await expect(page.getByText(/이미 처리됐거나 만료된/)).toBeVisible()
  // 로그인 페이지로 redirect 되지 않았는지 확인
  await expect(page).toHaveURL(/\/oauth\/consent\/error/)
})
