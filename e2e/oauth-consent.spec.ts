import { test, expect, type Route } from '@playwright/test'
import { setupAuthContext } from './helpers/auth'

const VALID_CHALLENGE = 'valid-challenge-abc123def456'

const consentInfoOk = {
  client_name: 'Claude Desktop',
  redirect_uri_origin: 'https://claude.ai',
  scope: 'read:calendar write:calendar',
  resource: 'https://mcp.todo-calendar.com/mcp',
  expires_at: Date.now() + 600_000,
}

test.describe('OAuth consent — authenticated', () => {
  test.beforeEach(async ({ context, page }) => {
    // 1. Firebase auth (test user via emulator)
    await setupAuthContext(context)

    // 2. AuthGuard 의 /v2/accounts/info ping 통과
    await page.route('**/v2/accounts/info', (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ uid: 'qa-test-uid', email: 'qa-test@example.com' }),
      }),
    )

    // 3. AS callback POST 차단 — 실제 AS 는 303 으로 리다이렉트하지만 e2e 는 발사 사실만 검증
    await page.route('**/v1/oauth/consent/callback', (route: Route) =>
      route.fulfill({ status: 200, contentType: 'text/plain', body: 'callback received' }),
    )
  })

  test('정상 fetch → 화면 렌더 → 허용 클릭 → AS callback POST 발사', async ({ page }) => {
    await page.route(`**/v1/oauth/consent/${VALID_CHALLENGE}`, (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(consentInfoOk),
      }),
    )

    const callbackPromise = page.waitForRequest(
      req => req.url().includes('/v1/oauth/consent/callback') && req.method() === 'POST',
    )

    await page.goto(`/oauth/consent?challenge=${VALID_CHALLENGE}`)

    await expect(page.getByText('Claude Desktop')).toBeVisible()
    await expect(page.getByText('https://claude.ai')).toBeVisible()
    await expect(page.getByText(/캘린더 데이터 조회/)).toBeVisible()
    await expect(page.getByText(/캘린더 작성·수정·삭제/)).toBeVisible()

    await page.getByRole('button', { name: /허용|Allow/ }).click()

    const callbackReq = await callbackPromise
    const body = callbackReq.postData() ?? ''
    expect(body).toContain(`challenge=${VALID_CHALLENGE}`)
    expect(body).toContain('allow=true')
    expect(body).toContain('id_token=')
  })

  test('fetch 404 → /oauth/consent/error?reason=invalid_challenge 안내', async ({ page }) => {
    await page.route(`**/v1/oauth/consent/${VALID_CHALLENGE}`, (route: Route) =>
      route.fulfill({ status: 404, body: '' }),
    )

    await page.goto(`/oauth/consent?challenge=${VALID_CHALLENGE}`)

    await expect(page).toHaveURL(/\/oauth\/consent\/error\?reason=invalid_challenge/)
    await expect(page.getByText(/이미 처리됐거나 만료된/)).toBeVisible()
  })

  test('직접 /oauth/consent/error?reason=invalid_challenge 진입 → 매핑 메시지', async ({ page }) => {
    await page.goto('/oauth/consent/error?reason=invalid_challenge')
    await expect(page.getByText(/이미 처리됐거나 만료된/)).toBeVisible()
  })

  test('whitelist 외 reason → fallback 메시지 (raw 노출 X)', async ({ page }) => {
    await page.goto('/oauth/consent/error?reason=raw_unexpected')
    await expect(page.getByText(/오류가 발생했어요/)).toBeVisible()
    await expect(page.getByText('raw_unexpected')).toHaveCount(0)
  })

  test('Deny 클릭 시 allow=false 로 callback POST 발사', async ({ page }) => {
    await page.route(`**/v1/oauth/consent/${VALID_CHALLENGE}`, (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(consentInfoOk),
      }),
    )

    const callbackPromise = page.waitForRequest(
      req => req.url().includes('/v1/oauth/consent/callback') && req.method() === 'POST',
    )

    await page.goto(`/oauth/consent?challenge=${VALID_CHALLENGE}`)
    await expect(page.getByText('Claude Desktop')).toBeVisible()

    await page.getByRole('button', { name: /거부|Deny/ }).click()

    const callbackReq = await callbackPromise
    const body = callbackReq.postData() ?? ''
    expect(body).toContain('allow=false')
  })
})
