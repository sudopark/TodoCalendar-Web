import { test, expect } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)
})

// 새 4-layer 아키텍처(#66) 이후 SettingsPage 는 좌측 메뉴 + /settings/:categoryId 분기 구조로 변경됐다.
// 카테고리별 섹션은 해당 카테고리 라우트에서만 렌더된다.

test('/settings 진입 시 메뉴 헤더에 "설정" 타이틀이 표시된다', async ({ page }) => {
  await page.goto('/settings')
  await page.waitForLoadState('networkidle')

  await expect(page.getByRole('heading', { name: '설정' })).toBeVisible()
})

test('외형 카테고리에 시스템/라이트/다크 테마 버튼이 모두 표시된다', async ({ page }) => {
  await page.goto('/settings/appearance')
  await page.waitForLoadState('networkidle')

  await expect(page.getByRole('button', { name: '시스템' })).toBeVisible()
  await expect(page.getByRole('button', { name: '라이트' })).toBeVisible()
  await expect(page.getByRole('button', { name: '다크' })).toBeVisible()
})

test('테마 버튼을 클릭하면 해당 버튼이 활성화 스타일을 갖는다', async ({ page }) => {
  // given
  await page.goto('/settings/appearance')
  await page.waitForLoadState('networkidle')

  // when
  await page.getByRole('button', { name: '라이트' }).click()

  // then — 선택된 테마는 어두운 배경(#1f1f1f) + 흰 글자 스타일이 적용된다
  await expect(page.getByRole('button', { name: '라이트' })).toHaveClass(/bg-\[#1f1f1f\]/)
})

test('언어 카테고리에 한국어와 English 옵션이 존재한다', async ({ page }) => {
  await page.goto('/settings/language')
  await page.waitForLoadState('networkidle')

  const langSelect = page.locator('select').filter({ hasText: '한국어' })
  await expect(langSelect).toBeVisible()
  await expect(langSelect.locator('option[value="ko"]')).toHaveText('한국어')
  await expect(langSelect.locator('option[value="en"]')).toHaveText('English')
})

test('언어를 English로 변경하면 메뉴 헤더와 로그아웃 버튼 텍스트가 영어로 바뀐다', async ({ page }) => {
  // given
  await page.goto('/settings/language')
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: '설정' })).toBeVisible()

  // when
  const langSelect = page.locator('select').filter({ hasText: '한국어' })
  await langSelect.selectOption('en')

  // then — 메뉴 헤더가 영어로 갱신
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

  // 계정 카테고리에서 로그아웃 버튼이 영어로 표기되는지 확인
  await page.goto('/settings/account')
  await expect(page.getByRole('button', { name: 'Log Out' })).toBeVisible()
})

test('언어를 English로 변경 후 다시 한국어로 되돌릴 수 있다', async ({ page }) => {
  // given
  await page.goto('/settings/language')
  await page.waitForLoadState('networkidle')

  const langSelect = page.locator('select').filter({ hasText: '한국어' })
  await langSelect.selectOption('en')
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

  // when
  const langSelectEn = page.locator('select').filter({ hasText: 'English' })
  await langSelectEn.selectOption('ko')

  // then
  await expect(page.getByRole('heading', { name: '설정' })).toBeVisible()
})

test('계정 카테고리에 로그아웃 버튼이 표시된다', async ({ page }) => {
  await page.goto('/settings/account')
  await page.waitForLoadState('networkidle')

  await expect(page.getByRole('button', { name: '로그아웃' })).toBeVisible()
})

test('계정 카테고리의 위험 구역 섹션에 계정 삭제 버튼이 표시된다', async ({ page }) => {
  await page.goto('/settings/account')
  await page.waitForLoadState('networkidle')

  await expect(page.getByText('위험 구역')).toBeVisible()
  await expect(page.getByRole('button', { name: '계정 삭제' })).toBeVisible()
})

test('외형 카테고리에 이벤트/리스트 글꼴 크기 슬라이더가 표시된다', async ({ page }) => {
  await page.goto('/settings/appearance')
  await page.waitForLoadState('networkidle')

  await expect(page.getByText('캘린더 외관')).toBeVisible()
  await expect(page.getByText('이벤트 글꼴 크기', { exact: true })).toBeVisible()
  await expect(page.getByText('리스트 글꼴 크기', { exact: true })).toBeVisible()

  // range 입력 2개(이벤트 / 리스트 가중치)가 존재한다
  const sliders = page.locator('input[type="range"]')
  await expect(sliders).toHaveCount(2)
})

test('외형 카테고리에 기본값 복원 버튼이 표시된다', async ({ page }) => {
  await page.goto('/settings/appearance')
  await page.waitForLoadState('networkidle')

  await expect(page.getByRole('button', { name: '기본값 복원' })).toBeVisible()
})

test('공휴일 카테고리에 검색 입력과 국가 리스트가 표시된다', async ({ page }) => {
  // 공휴일 국가 목록은 외부 gist URL에서 가져온다 — 해당 URL을 모킹하여 한국/미국 포함 응답 주입
  await page.route('**gist.githubusercontent.com**/**google_calendar_country', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { regionCode: 'KR', code: 'ko:south_korea', name: '한국' },
        { regionCode: 'US', code: 'en:united_states', name: '미국' },
      ]),
    })
  })

  await page.goto('/settings/holiday')
  await page.waitForLoadState('networkidle')

  // SettingsSection 헤더 + 검색 입력
  await expect(page.getByText('공휴일 국가')).toBeVisible()
  await expect(page.getByPlaceholder('국가 검색')).toBeVisible()

  // 국가 리스트 — CountryRow 버튼으로 렌더된다 (현재 선택 영역 + 리스트 양쪽에 노출)
  await expect(page.getByRole('button', { name: /한국/ }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /미국/ })).toBeVisible()
})

test('알림 카테고리 헤더가 표시된다', async ({ page }) => {
  await page.goto('/settings/notification')
  await page.waitForLoadState('networkidle')

  await expect(page.getByText('알림', { exact: true }).first()).toBeVisible()
})

test('메인페이지 TopToolbar 설정 버튼으로 설정 페이지에 진입할 수 있다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // when — TopToolbar의 설정 아이콘 버튼 클릭
  await page.getByRole('button', { name: '설정' }).click()

  // then
  await expect(page).toHaveURL('/settings')
  await expect(page.getByRole('heading', { name: '설정' })).toBeVisible()
})
