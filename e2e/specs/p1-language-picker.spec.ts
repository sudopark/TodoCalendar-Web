import { test, expect } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

// 언어 선택 진입점은 설정 페이지가 아니라 툴바·로그인 화면의 LanguagePicker 다 (#200).

test.describe('메인 툴바 언어 선택', () => {
  test.beforeEach(async ({ context }) => {
    await setupAuthContext(context)
  })

  test('툴바에서 English 를 고르면 월 표기와 설정 화면 문구가 영어로 바뀐다', async ({ page }) => {
    // given — 한국어로 그려진 메인 화면
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('toolbar-month')).toHaveText(/월$/)

    // when — 지구본 트리거에서 English 선택
    await page.getByRole('button', { name: '언어', exact: true }).click()
    await page.getByRole('option', { name: 'English' }).click()

    // then — 월 표기가 영어 월 이름으로 바뀐다
    await expect(page.getByTestId('toolbar-month')).toHaveText(
      /January|February|March|April|May|June|July|August|September|October|November|December/,
    )

    // 다른 화면에도 선택이 적용된다
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  })

  test('검색으로 언어를 좁혀 고를 수 있고, 다시 한국어로 되돌릴 수 있다', async ({ page }) => {
    // given — English 로 바꿔둔 상태
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: '언어', exact: true }).click()
    await page.getByRole('option', { name: 'English' }).click()
    await expect(page.getByRole('button', { name: 'Language', exact: true })).toBeVisible()

    // when — 영문 명칭으로 검색해 한국어를 고른다
    await page.getByRole('button', { name: 'Language', exact: true }).click()
    await page.getByRole('searchbox').fill('korean')
    await expect(page.getByRole('option')).toHaveCount(1)
    await page.getByRole('option', { name: '한국어' }).click()

    // then — 한국어로 되돌아온다
    await expect(page.getByTestId('toolbar-month')).toHaveText(/월$/)
  })
})

test('로그인 화면에서도 언어를 바꿀 수 있다', async ({ page }) => {
  // given — 로그인 전 화면
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText('계속하려면 로그인하세요')).toBeVisible()

  // when — 현재 언어가 표기된 트리거에서 English 선택
  await page.getByRole('button', { name: /한국어/ }).click()
  await page.getByRole('option', { name: 'English' }).click()

  // then — 로그인 화면 문구가 영어로 바뀐다
  await expect(page.getByText('Please sign in to continue')).toBeVisible()
  await expect(page.getByRole('button', { name: /English/ })).toBeVisible()
})
