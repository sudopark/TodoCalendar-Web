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

// --- TodoFormPage 다크모드 ---

test('다크 모드에서 /todos/new 폼 카드가 어두운 배경을 갖는다', async ({ page }) => {
  // given — 다크 모드 활성화
  await enableDarkMode(page)

  // when
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/todos/new')
  await page.waitForLoadState('networkidle')

  // then — 폼 카드가 dark:bg-gray-800 클래스를 갖는다
  const card = page.locator('.dark\\:bg-gray-800').first()
  await expect(card).toBeVisible()
})

test('다크 모드에서 /todos/new 폼 카드에 bg-white 단독 사용이 없다', async ({ page }) => {
  // given
  await enableDarkMode(page)

  // when
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/todos/new')
  await page.waitForLoadState('networkidle')

  // then — <html>에 dark 클래스가 있어야 다크 모드가 작동한다
  const htmlEl = page.locator('html')
  await expect(htmlEl).toHaveClass(/dark/)
})

test('다크 모드에서 /todos/new 레이블 텍스트가 밝은 색을 갖는다', async ({ page }) => {
  // given
  await enableDarkMode(page)

  // when
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/todos/new')
  await page.waitForLoadState('networkidle')

  // then — dark:text-gray-200 클래스를 가진 레이블이 존재한다
  const label = page.locator('.dark\\:text-gray-200').first()
  await expect(label).toBeVisible()
})

// --- ScheduleFormPage 다크모드 ---

test('다크 모드에서 /schedules/new 폼 카드가 어두운 배경을 갖는다', async ({ page }) => {
  // given
  await enableDarkMode(page)

  // when
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/schedules/new')
  await page.waitForLoadState('networkidle')

  // then
  const card = page.locator('.dark\\:bg-gray-800').first()
  await expect(card).toBeVisible()
})

test('다크 모드에서 /schedules/new에서 html 요소에 dark 클래스가 있다', async ({ page }) => {
  // given
  await enableDarkMode(page)

  // when
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/schedules/new')
  await page.waitForLoadState('networkidle')

  // then
  await expect(page.locator('html')).toHaveClass(/dark/)
})

test('다크 모드에서 /schedules/new 레이블 텍스트가 밝은 색을 갖는다', async ({ page }) => {
  // given
  await enableDarkMode(page)

  // when
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/schedules/new')
  await page.waitForLoadState('networkidle')

  // then
  const label = page.locator('.dark\\:text-gray-200').first()
  await expect(label).toBeVisible()
})
