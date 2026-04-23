import { test, expect } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)
})

test('Schedule 팝오버에서 이름 입력과 저장 버튼이 표시된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // when — FAB → Schedule 선택으로 팝오버 열기
  await page.getByTestId('create-event-button').click()
  await page.getByRole('button', { name: 'Schedule', exact: true }).click()

  // then
  await expect(page.getByTestId('event-form-backdrop')).toBeVisible()
  await expect(page.getByPlaceholder('이벤트 이름 추가')).toBeVisible()
  await expect(page.getByRole('button', { name: '저장' })).toBeVisible()
})

test('이름을 입력하고 저장하면 팝오버가 닫힌다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  await page.route('**/v1/schedules/schedule', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          uuid: 'new-schedule-id',
          name: 'E2E 테스트 일정',
          event_time: { time_type: 'at', timestamp: Math.floor(Date.now() / 1000) },
        }),
      })
    } else {
      await route.continue()
    }
  })

  await page.getByTestId('create-event-button').click()
  await page.getByRole('button', { name: 'Schedule', exact: true }).click()
  await expect(page.getByTestId('event-form-backdrop')).toBeVisible()

  // when
  await page.getByPlaceholder('이벤트 이름 추가').fill('E2E 테스트 일정')
  await page.getByRole('button', { name: '저장' }).click()

  // then — 저장 후 팝오버가 닫힌다
  await expect(page.getByTestId('event-form-backdrop')).not.toBeVisible()
})

test('이름 없이 저장 버튼은 비활성화된다 (Schedule)', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.getByTestId('create-event-button').click()
  await page.getByRole('button', { name: 'Schedule', exact: true }).click()
  await expect(page.getByTestId('event-form-backdrop')).toBeVisible()

  // then — 이름이 비어있으면 저장 버튼이 비활성화 상태이다
  await expect(page.getByRole('button', { name: '저장' })).toBeDisabled()
})

test('X 버튼 클릭 시 Schedule 팝오버가 닫힌다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.getByTestId('create-event-button').click()
  await page.getByRole('button', { name: 'Schedule', exact: true }).click()
  await expect(page.getByTestId('event-form-backdrop')).toBeVisible()

  // when — 이름 미입력 상태 → X 클릭 시 컨펌 없이 즉시 닫힘
  await page.getByTestId('event-form-close-btn').click()

  // then
  await expect(page.getByTestId('event-form-backdrop')).not.toBeVisible()
})
