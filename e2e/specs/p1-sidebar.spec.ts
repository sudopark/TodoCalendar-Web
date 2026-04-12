import { test, expect } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)
})

async function setupRoutes(page: Parameters<Parameters<typeof test>[1]>[0]['page']) {
  await page.route('**/v1/todos**', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    } else {
      await route.continue()
    }
  })
  await page.route('**/v1/schedules**', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    } else {
      await route.continue()
    }
  })
  await page.route('**/v1/tags**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })
  await page.route('**/v1/foremost**', async route => {
    await route.fulfill({ status: 404, body: '{}' })
  })
  await page.route('**/v1/holidays**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })
}

test('사이드바 토글 버튼 클릭 시 사이드바가 숨겨진다', async ({ page }) => {
  // given
  await setupRoutes(page)
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // 초기 상태: 사이드바가 열려 있어야 한다 (w-64)
  const sidebar = page.locator('.hidden.md\\:flex.flex-col').first()
  await expect(sidebar).toHaveClass(/w-64/)

  // when
  await page.getByRole('button', { name: '사이드바 토글' }).click()

  // then: 사이드바가 w-0으로 전환되어 숨겨진다
  await expect(sidebar).toHaveClass(/w-0/)
})

test('사이드바 토글 버튼을 다시 클릭하면 사이드바가 다시 보인다', async ({ page }) => {
  // given
  await setupRoutes(page)
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const sidebar = page.locator('.hidden.md\\:flex.flex-col').first()
  await page.getByRole('button', { name: '사이드바 토글' }).click()
  await expect(sidebar).toHaveClass(/w-0/)

  // when
  await page.getByRole('button', { name: '사이드바 토글' }).click()

  // then: 사이드바가 다시 w-64로 전환된다
  await expect(sidebar).toHaveClass(/w-64/)
})

test('미니캘린더에서 날짜를 클릭하면 메인 달력의 해당 날짜가 선택된다', async ({ page }) => {
  // given
  await setupRoutes(page)
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // 사이드바가 열려 있고 미니캘린더가 표시되는 상태
  const sidebar = page.locator('.hidden.md\\:flex.flex-col').first()
  await expect(sidebar).toHaveClass(/w-64/)

  // when: 미니캘린더에서 10일 클릭 (오늘이 아닌 날짜)
  // 미니캘린더는 shadcn Calendar (react-day-picker) 컴포넌트를 사용
  // 날짜 버튼의 accessible name은 "Friday, April 10th, 2026" 같은 전체 날짜 형식
  const targetCell = sidebar.getByRole('button', { name: /April 10/ })
  await targetCell.click()

  // then: 메인 달력의 day-cell 중 data-selected 속성을 가진 셀이 나타난다
  await expect(page.locator('[data-testid="day-cell"][data-selected]')).toBeVisible()
})
