import { test, expect, type Route } from '@playwright/test'

const DOCS = '**/raw.githubusercontent.com/**'

async function stubDocs(page: import('@playwright/test').Page) {
  await page.route(DOCS, (route: Route) => {
    const url = route.request().url()
    const isKo = url.includes('/ko/')
    const isPrivacy = url.includes('privacy.md')
    const title = isPrivacy
      ? (isKo ? '개인정보처리방침' : 'Privacy Policy')
      : (isKo ? '이용약관' : 'Terms of Use')
    const body = isKo ? '한국어 본문 문단입니다.' : 'English body paragraph.'
    route.fulfill({
      status: 200,
      contentType: 'text/plain; charset=utf-8',
      body: `# ${title}\n\n${body}\n`,
    })
  })
}

test('미로그인 상태에서 /terms 직접 접근 → 로그인으로 튕기지 않고 약관 본문이 뜬다', async ({ page }) => {
  await stubDocs(page)

  await page.goto('/terms')

  await expect(page).toHaveURL(/\/terms\/(ko|en)$/)
  await expect(page.getByRole('heading', { level: 1, name: /이용약관|Terms of Use/ })).toBeVisible()
  await expect(page).not.toHaveURL(/\/login/)
})

test('미로그인 상태에서 /privacy/en 직접 접근 → 영문 방침 본문이 뜬다', async ({ page }) => {
  await stubDocs(page)

  await page.goto('/privacy/en')

  await expect(page.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeVisible()
  await expect(page.getByText('English body paragraph.')).toBeVisible()
})

test('문서 화면에서 언어 토글을 누르면 다른 언어 본문으로 바뀐다', async ({ page }) => {
  await stubDocs(page)

  await page.goto('/terms/en')
  await expect(page.getByText('English body paragraph.')).toBeVisible()

  await page.getByTestId('public-doc-lang-ko').click()

  await expect(page).toHaveURL(/\/terms\/ko$/)
  await expect(page.getByText('한국어 본문 문단입니다.')).toBeVisible()
})

test('로그인 화면 푸터의 약관 링크로 약관 화면에 갈 수 있다', async ({ page }) => {
  await stubDocs(page)

  await page.goto('/login')
  await page.getByTestId('login-terms-link').click()

  await expect(page).toHaveURL(/\/terms/)
  await expect(page.getByRole('heading', { level: 1, name: /이용약관|Terms of Use/ })).toBeVisible()
})
