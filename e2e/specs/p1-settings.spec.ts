import { test, expect } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)
})

test('/settings 진입 시 설정 페이지 제목이 표시된다', async ({ page }) => {
  // given / when
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/settings')

  // then
  await expect(page.getByRole('heading', { name: '설정' })).toBeVisible()
})

test('테마 섹션에 시스템/라이트/다크 버튼이 모두 표시된다', async ({ page }) => {
  // given / when
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/settings')

  // then
  await expect(page.getByRole('button', { name: '시스템' })).toBeVisible()
  await expect(page.getByRole('button', { name: '라이트' })).toBeVisible()
  await expect(page.getByRole('button', { name: '다크' })).toBeVisible()
})

test('테마 버튼을 클릭하면 해당 버튼이 활성화 스타일을 갖는다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/settings')

  // when
  await page.getByRole('button', { name: '라이트' }).click()

  // then — 라이트 버튼이 blue-500 배경을 갖는다
  await expect(page.getByRole('button', { name: '라이트' })).toHaveClass(/bg-blue-500/)
})

test('언어 섹션에 한국어와 English 옵션이 존재한다', async ({ page }) => {
  // given / when
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/settings')

  // then
  const langSelect = page.locator('select').filter({ hasText: '한국어' })
  await expect(langSelect).toBeVisible()
  await expect(langSelect.locator('option[value="ko"]')).toHaveText('한국어')
  await expect(langSelect.locator('option[value="en"]')).toHaveText('English')
})

test('언어를 English로 변경하면 UI 텍스트가 영어로 바뀐다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/settings')
  await expect(page.getByRole('heading', { name: '설정' })).toBeVisible()

  // when
  const langSelect = page.locator('select').filter({ hasText: '한국어' })
  await langSelect.selectOption('en')

  // then
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'System' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Log Out' })).toBeVisible()
})

test('언어를 English로 변경 후 다시 한국어로 되돌릴 수 있다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/settings')

  const langSelect = page.locator('select').filter({ hasText: '한국어' })
  await langSelect.selectOption('en')
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

  // when
  const langSelectEn = page.locator('select').filter({ hasText: 'English' })
  await langSelectEn.selectOption('ko')

  // then
  await expect(page.getByRole('heading', { name: '설정' })).toBeVisible()
})

test('계정 섹션에 로그아웃 버튼이 표시된다', async ({ page }) => {
  // given / when
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/settings')

  // then
  await expect(page.getByRole('button', { name: '로그아웃' })).toBeVisible()
})

test('위험 구역 섹션에 계정 삭제 버튼이 표시된다', async ({ page }) => {
  // given / when
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/settings')

  // then
  await expect(page.getByText('위험 구역')).toBeVisible()
  await expect(page.getByRole('button', { name: '계정 삭제' })).toBeVisible()
})

test('캘린더 외형 섹션에 행 높이와 글꼴 크기 슬라이더가 표시된다', async ({ page }) => {
  // given / when
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/settings')

  // then
  await expect(page.getByText('캘린더 외형')).toBeVisible()
  await expect(page.getByText('행 높이')).toBeVisible()
  await expect(page.getByText('글꼴 크기')).toBeVisible()

  // range 입력 2개가 존재한다
  const sliders = page.locator('input[type="range"]')
  await expect(sliders).toHaveCount(2)
})

test('기본값 복원 버튼이 표시된다', async ({ page }) => {
  // given / when
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/settings')

  // then
  await expect(page.getByRole('button', { name: '기본값 복원' })).toBeVisible()
})

test('공휴일 국가 섹션의 select에 여러 국가가 포함된다', async ({ page }) => {
  // given / when
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/settings')

  // then — 공휴일 국가 섹션 아래의 select
  await expect(page.getByText('공휴일 국가')).toBeVisible()
  const countrySelect = page.locator('section').filter({ hasText: '공휴일 국가' }).locator('select')
  await expect(countrySelect.locator('option[value="ko:south_korea"]')).toHaveText('한국')
  await expect(countrySelect.locator('option[value="en:united_states"]')).toHaveText('미국')
})

test('알림 섹션이 표시된다', async ({ page }) => {
  // given / when
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/settings')

  // then — 알림 섹션 제목(h2)이 정확히 표시된다
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
