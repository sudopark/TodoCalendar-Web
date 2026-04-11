/**
 * P3 i18n gaps spec
 *
 * 이 스펙은 영어 모드에서 한국어가 여전히 노출되는 알려진 i18n 미적용 구간을 검증한다.
 * TodoFormPage, ScheduleFormPage, EventTimePicker 컴포넌트의 레이블/버튼이
 * i18n 키 대신 하드코딩된 한국어 문자열을 사용하고 있어 FAIL이 예상된다.
 */
import { test, expect } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)
})

async function setEnglishLanguage(page: Parameters<Parameters<typeof test>[1]>[0]) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  // i18n은 localStorage의 'language' 키로 언어를 결정한다
  await page.evaluate(() => localStorage.setItem('language', 'en'))
}

// --- TodoFormPage i18n gaps ---

test('[KNOWN FAIL] 영어 모드에서 /todos/new에 한국어 "이름" 레이블이 남아있다', async ({ page }) => {
  // given — 영어 모드 설정
  await setEnglishLanguage(page)

  // when
  await page.goto('/todos/new')
  await page.waitForLoadState('networkidle')

  // then — 한국어 "이름"이 보이지 않아야 한다 (현재는 보임 → FAIL)
  await expect(page.getByText('이름')).not.toBeVisible()
})

test('[KNOWN FAIL] 영어 모드에서 /todos/new에 한국어 "저장" 버튼이 남아있다', async ({ page }) => {
  // given
  await setEnglishLanguage(page)

  // when
  await page.goto('/todos/new')
  await page.waitForLoadState('networkidle')

  // then — 한국어 "저장"이 보이지 않아야 한다 (현재는 보임 → FAIL)
  await expect(page.getByRole('button', { name: '저장' })).not.toBeVisible()
})

test('[KNOWN FAIL] 영어 모드에서 /todos/new에 한국어 "취소" 버튼이 남아있다', async ({ page }) => {
  // given
  await setEnglishLanguage(page)

  // when
  await page.goto('/todos/new')
  await page.waitForLoadState('networkidle')

  // then — 한국어 "취소"가 보이지 않아야 한다 (현재는 보임 → FAIL)
  await expect(page.getByRole('button', { name: '취소' })).not.toBeVisible()
})

// --- EventTimePicker i18n gaps ---

test('[KNOWN FAIL] 영어 모드에서 EventTimePicker에 한국어 "시간 없음" 옵션이 남아있다', async ({ page }) => {
  // given
  await setEnglishLanguage(page)

  // when
  await page.goto('/todos/new')
  await page.waitForLoadState('networkidle')

  // then — 한국어 "시간 없음"이 보이지 않아야 한다 (현재는 보임 → FAIL)
  await expect(page.getByText('시간 없음')).not.toBeVisible()
})

test('[KNOWN FAIL] 영어 모드에서 EventTimePicker에 한국어 "특정 시각" 옵션이 남아있다', async ({ page }) => {
  // given
  await setEnglishLanguage(page)

  // when
  await page.goto('/todos/new')
  await page.waitForLoadState('networkidle')

  // then — 한국어 "특정 시각"이 보이지 않아야 한다 (현재는 보임 → FAIL)
  await expect(page.getByText('특정 시각')).not.toBeVisible()
})

// --- ScheduleFormPage i18n gaps ---

test('[KNOWN FAIL] 영어 모드에서 /schedules/new에 한국어 "이름" 레이블이 남아있다', async ({ page }) => {
  // given
  await setEnglishLanguage(page)

  // when
  await page.goto('/schedules/new')
  await page.waitForLoadState('networkidle')

  // then — 한국어 "이름"이 보이지 않아야 한다 (현재는 보임 → FAIL)
  await expect(page.getByText('이름')).not.toBeVisible()
})
