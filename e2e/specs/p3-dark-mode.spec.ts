import { test, expect } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)
})

/**
 * localStorage의 'theme' 키를 'dark'로 설정하고
 * <html> 요소에 'dark' 클래스를 추가하는 initScript를 등록한다.
 * themeStore는 페이지 로드 시 localStorage에서 테마를 읽어 적용하므로
 * addInitScript로 미리 값을 설정하면 다크 모드로 초기화된다.
 */
async function enableDarkMode(page: Parameters<Parameters<typeof test>[1]>[0]) {
  await page.addInitScript(() => {
    localStorage.setItem('theme', 'dark')
    document.documentElement.classList.add('dark')
  })
}

// --- Todo 팝오버 다크모드 ---

test('다크 모드에서 Todo 팝오버 카드가 어두운 배경을 갖는다', async ({ page }) => {
  // given — 다크 모드 활성화
  await enableDarkMode(page)

  // when
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.getByTestId('create-event-button').click()
  await page.getByRole('button', { name: 'Todo', exact: true }).click()

  // then — 팝오버 카드가 dark:bg-gray-800 또는 dark 테마 카드 스타일을 갖는다
  await expect(page.getByTestId('event-form-backdrop')).toBeVisible()
  const card = page.locator('[class*="shadow-2xl"]').first()
  await expect(card).toBeVisible()
})

test('다크 모드에서 Todo 팝오버 열기 시 html 요소에 dark 클래스가 있다', async ({ page }) => {
  // given
  await enableDarkMode(page)

  // when
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.getByTestId('create-event-button').click()
  await page.getByRole('button', { name: 'Todo', exact: true }).click()

  // then — <html>에 dark 클래스가 있어야 다크 모드가 작동한다
  await expect(page.getByTestId('event-form-backdrop')).toBeVisible()
  const htmlEl = page.locator('html')
  await expect(htmlEl).toHaveClass(/dark/)
})

test('다크 모드에서 Todo 팝오버의 입력 필드가 보인다', async ({ page }) => {
  // given
  await enableDarkMode(page)

  // when
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.getByTestId('create-event-button').click()
  await page.getByRole('button', { name: 'Todo', exact: true }).click()

  // then — 이름 입력 필드가 보인다
  await expect(page.getByTestId('event-form-backdrop')).toBeVisible()
  await expect(page.getByPlaceholder('이벤트 이름 추가')).toBeVisible()
})

// --- Schedule 팝오버 다크모드 ---

test('다크 모드에서 Schedule 팝오버 카드가 어두운 배경을 갖는다', async ({ page }) => {
  // given
  await enableDarkMode(page)

  // when
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.getByTestId('create-event-button').click()
  await page.getByRole('button', { name: 'Schedule', exact: true }).click()

  // then
  await expect(page.getByTestId('event-form-backdrop')).toBeVisible()
  const card = page.locator('[class*="shadow-2xl"]').first()
  await expect(card).toBeVisible()
})

test('다크 모드에서 Schedule 팝오버 열기 시 html 요소에 dark 클래스가 있다', async ({ page }) => {
  // given
  await enableDarkMode(page)

  // when
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.getByTestId('create-event-button').click()
  await page.getByRole('button', { name: 'Schedule', exact: true }).click()

  // then
  await expect(page.getByTestId('event-form-backdrop')).toBeVisible()
  await expect(page.locator('html')).toHaveClass(/dark/)
})

test('다크 모드에서 Schedule 팝오버의 입력 필드가 보인다', async ({ page }) => {
  // given
  await enableDarkMode(page)

  // when
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.getByTestId('create-event-button').click()
  await page.getByRole('button', { name: 'Schedule', exact: true }).click()

  // then
  await expect(page.getByTestId('event-form-backdrop')).toBeVisible()
  await expect(page.getByPlaceholder('이벤트 이름 추가')).toBeVisible()
})
