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

  // when: 미니캘린더에서 10일 클릭 (오늘은 11일이므로 선택 가능한 이전 날짜)
  // 미니캘린더는 사이드바 내부에서 grid grid-cols-7 구조를 사용
  const miniCalendarCells = sidebar.locator('.grid.grid-cols-7 > div')
  // 헤더(7개 요일 셀) 이후의 날짜 셀에서 "10" 텍스트를 가진 현재 월 날짜를 찾는다
  const targetCell = miniCalendarCells.filter({ hasText: '10' }).first()
  await targetCell.click()

  // then: 메인 달력의 day-cell 중 ring-2 클래스를 가진 셀이 나타난다
  await expect(page.locator('.ring-2.ring-brand-dark')).toBeVisible()
})
