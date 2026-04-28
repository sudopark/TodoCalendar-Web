import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)
})

// 새 4-layer 아키텍처(#66) 이후 /tags 라우트는 /settings/editEvent/tags 로 redirect 되며
// 우측 서브 패널(TagManagementPanel) 형태로 통합됐다.
const TAG_MGMT_PATH = '/settings/editEvent/tags'

async function mockTagEndpoints(page: Page, tags: { uuid: string; name: string; color_hex?: string | null }[]) {
  await page.route('**/v1/tags/all', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(tags),
    })
  })
  await page.route('**/v1/setting/event/tag/default/color', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ default: '#4A90D9', holiday: '#ef4444' }),
      })
    } else {
      await route.continue()
    }
  })
}

// TagManagementPanel 영역으로 한정된 locator — settings 좌측 EditEventSection 과 텍스트 중복 회피
function tagPanel(page: Page) {
  return page.getByTestId('tag-management-panel')
}

test('태그 관리 패널 진입 시 헤더와 기본/휴일 행, 유저 태그가 순서대로 렌더된다', async ({ page }) => {
  await mockTagEndpoints(page, [{ uuid: 'u-1', name: '업무' }])

  await page.goto(TAG_MGMT_PATH)
  await page.waitForLoadState('networkidle')

  const panel = tagPanel(page)
  await expect(panel.getByRole('heading', { name: '이벤트 종류' })).toBeVisible()
  await expect(panel.getByRole('button', { name: '새 태그 추가' })).toBeVisible()
  await expect(panel.getByRole('button', { name: '태그 관리 닫기' })).toBeVisible()

  // 행은 [기본, 공휴일, 유저...] 순서로 렌더된다 — TagRow 의 이름 span 만 매칭
  const rows = panel.getByTestId('tag-row-list').getByRole('listitem')
  await expect(rows).toHaveCount(3)
  await expect(rows.nth(0)).toContainText('기본')
  await expect(rows.nth(1)).toContainText('공휴일')
  await expect(rows.nth(2)).toContainText('업무')
})

test('"+" 버튼으로 새 태그를 생성하면 리스트에 즉시 추가된다', async ({ page }) => {
  await mockTagEndpoints(page, [])
  await page.route('**/v1/tags/tag', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ uuid: 'new-id', name: '신규 태그', color_hex: '#22c55e' }),
      })
    } else {
      await route.continue()
    }
  })

  await page.goto(TAG_MGMT_PATH)
  await page.waitForLoadState('networkidle')

  const panel = tagPanel(page)
  await panel.getByRole('button', { name: '새 태그 추가' }).click()
  await expect(page.getByRole('heading', { name: '새 태그' })).toBeVisible()

  await page.getByLabel('이름').fill('신규 태그')
  await page.getByTitle('#22c55e').click()
  await page.getByRole('button', { name: '저장' }).click()

  await expect(panel.getByText('신규 태그')).toBeVisible()
})

test('유저 태그 편집: 이름/색상 수정 후 저장하면 스토어에 반영된다', async ({ page }) => {
  await mockTagEndpoints(page, [{ uuid: 'u-1', name: '원래', color_hex: '#ff0000' }])
  await page.route('**/v1/tags/tag/u-1', async route => {
    if (route.request().method() === 'PUT') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ uuid: 'u-1', name: '바뀐', color_hex: '#3b82f6' }),
      })
    } else {
      await route.continue()
    }
  })

  await page.goto(TAG_MGMT_PATH)
  await page.waitForLoadState('networkidle')
  const panel = tagPanel(page)
  await expect(panel.getByText('원래')).toBeVisible()

  // [기본, 공휴일, u-1] → 유저 태그는 nth(2) 의 "태그 상세 열기"
  const infoButtons = panel.getByRole('button', { name: '태그 상세 열기' })
  await infoButtons.nth(2).click()

  await expect(page.getByRole('heading', { name: '태그 편집' })).toBeVisible()
  await page.getByLabel('이름').fill('바뀐')
  await page.getByTitle('#3b82f6').click()
  await page.getByRole('button', { name: '저장' }).click()

  await expect(panel.getByText('바뀐')).toBeVisible()
})

test('기본 태그 편집 패널: 이름은 readonly, 삭제 버튼은 없으며 색상만 저장 가능', async ({ page }) => {
  await mockTagEndpoints(page, [])
  await page.route('**/v1/setting/event/tag/default/color', async route => {
    if (route.request().method() === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ default: '#22c55e', holiday: '#ef4444' }),
      })
    } else if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ default: '#4A90D9', holiday: '#ef4444' }),
      })
    } else {
      await route.continue()
    }
  })

  await page.goto(TAG_MGMT_PATH)
  await page.waitForLoadState('networkidle')

  const panel = tagPanel(page)
  // 첫 번째 행(기본 태그)의 "태그 상세 열기"
  await panel.getByRole('button', { name: '태그 상세 열기' }).nth(0).click()

  await expect(page.getByRole('heading', { name: '태그 편집' })).toBeVisible()
  const nameInput = page.getByLabel('이름')
  await expect(nameInput).toHaveAttribute('readonly', '')
  await expect(nameInput).toHaveValue('기본')
  await expect(page.getByRole('button', { name: '삭제', exact: true })).toHaveCount(0)

  await page.getByTitle('#22c55e').click()
  await page.getByRole('button', { name: '저장' }).click()

  await expect(page.getByRole('heading', { name: '태그 편집' })).toBeHidden()
})

test('유저 태그 삭제: 태그만 삭제 경로', async ({ page }) => {
  await mockTagEndpoints(page, [{ uuid: 'u-1', name: '삭제대상' }])
  await page.route('**/v1/tags/tag/u-1', async route => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) })
    } else {
      await route.continue()
    }
  })

  await page.goto(TAG_MGMT_PATH)
  await page.waitForLoadState('networkidle')
  const panel = tagPanel(page)
  await expect(panel.getByText('삭제대상')).toBeVisible()

  await panel.getByRole('button', { name: '태그 상세 열기' }).nth(2).click()
  await page.getByRole('button', { name: '삭제', exact: true }).click()
  await expect(page.getByText('태그 삭제')).toBeVisible()
  await page.getByRole('button', { name: '태그만 삭제' }).click()

  await expect(panel.getByText('삭제대상', { exact: true })).toBeHidden()
})

test('태그 on/off 토글이 localStorage에 즉시 기록된다', async ({ page }) => {
  await mockTagEndpoints(page, [{ uuid: 'u-1', name: '공유토글' }])

  await page.goto(TAG_MGMT_PATH)
  await page.waitForLoadState('networkidle')
  const panel = tagPanel(page)
  await expect(panel.getByText('공유토글')).toBeVisible()

  await panel.getByRole('button', { name: '태그 표시 전환' }).nth(2).click()

  const hidden = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('hidden_tag_ids') ?? '[]') } catch { return [] }
  })
  expect(hidden).toContain('u-1')
})

test('닫기 버튼은 패널을 닫고 /settings/editEvent 로 복귀시킨다', async ({ page }) => {
  await mockTagEndpoints(page, [])

  await page.goto(TAG_MGMT_PATH)
  await page.waitForLoadState('networkidle')

  await tagPanel(page).getByRole('button', { name: '태그 관리 닫기' }).click()

  await expect(page).toHaveURL(/\/settings\/editEvent$/)
})
