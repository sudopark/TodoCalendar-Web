import { test, expect } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)
})

test('/schedules/new 진입 시 "새 Schedule" 제목이 표시된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // when
  await page.goto('/schedules/new')

  // then
  await expect(page.getByRole('heading', { name: '새 Schedule' })).toBeVisible()
})

test('새 Schedule 폼에 이름 입력, 저장/취소 버튼이 표시된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // when
  await page.goto('/schedules/new')

  // then
  await expect(page.getByLabel('이름')).toBeVisible()
  await expect(page.getByRole('button', { name: '저장' })).toBeVisible()
  await expect(page.getByRole('button', { name: '취소' })).toBeVisible()
})

test('새 Schedule 폼에 EventTimePicker(시간 선택)가 표시된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // when
  await page.goto('/schedules/new')

  // then — Schedule은 required=true이므로 "시간 없음" 옵션 없이 "특정 시각" 라디오가 기본 선택됨
  await expect(page.getByText('특정 시각')).toBeVisible()
  // 날짜/시각 datetime-local 입력 필드가 존재한다
  await expect(page.getByRole('textbox', { name: '시각' })).toBeVisible()
})

test('이름을 입력하고 저장하면 이전 페이지로 돌아간다', async ({ page }) => {
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

  await page.goto('/schedules/new')
  await expect(page.getByLabel('이름')).toBeVisible()

  // when
  await page.getByLabel('이름').fill('E2E 테스트 일정')
  await page.getByRole('button', { name: '저장' }).click()

  // then — 저장 후 폼 페이지를 벗어난다
  await expect(page).not.toHaveURL('/schedules/new')
})

test('이름 없이 저장하면 폼이 그대로 유지된다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/schedules/new')

  // when — 이름을 입력하지 않고 저장
  await page.getByRole('button', { name: '저장' }).click()

  // then — 폼이 떠있어야 한다
  await expect(page).toHaveURL(/\/schedules\/new/)
  await expect(page.getByRole('heading', { name: '새 Schedule' })).toBeVisible()
})

test('취소 버튼을 누르면 이전 페이지로 돌아간다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/schedules/new')

  // when
  await page.getByRole('button', { name: '취소' }).click()

  // then
  await expect(page).not.toHaveURL('/schedules/new')
})
