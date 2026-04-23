import { test, expect } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)
})

test("메인 페이지에서 'n' 키를 누르면 이벤트 생성 팝오버가 열린다", async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // when — body에 포커스 후 'n' 키 입력
  await page.locator('body').press('n')

  // then — 팝오버가 열린다
  await expect(page.getByTestId('event-form-backdrop')).toBeVisible()
  await expect(page.getByRole('button', { name: '저장' })).toBeVisible()
})

test("팝오버가 열린 상태에서 Escape 키를 누르면 팝오버가 닫힌다", async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.locator('body').press('n')
  await expect(page.getByTestId('event-form-backdrop')).toBeVisible()

  // when — 이름 미입력 상태에서 Escape 키 입력 → 컨펌 없이 즉시 닫힘
  await page.keyboard.press('Escape')

  // then — 팝오버가 닫힌다
  await expect(page.getByTestId('event-form-backdrop')).not.toBeVisible()
})

test("입력 필드에 포커스 시 'n' 키는 팝오버를 트리거하지 않는다", async ({ page }) => {
  // given — 팝오버를 열어서 이름 입력 필드에 포커스
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.locator('body').press('n')
  await expect(page.getByTestId('event-form-backdrop')).toBeVisible()
  const nameInput = page.getByPlaceholder('이벤트 이름 추가')
  await expect(nameInput).toBeVisible()

  // when — 이름 입력 필드에 'n' 키 입력
  await nameInput.press('n')

  // then — 팝오버가 여전히 열려 있다 (중첩 팝오버가 열리지 않는다)
  await expect(page.getByTestId('event-form-backdrop')).toBeVisible()
})
