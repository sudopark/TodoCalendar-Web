import { test, expect } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)
})

test('/tags 진입 시 태그 관리 페이지가 렌더된다', async ({ page }) => {
  // given / when
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/tags')

  // then
  await expect(page.getByRole('heading', { name: '태그 관리' })).toBeVisible()
  await expect(page.getByPlaceholder('새 태그 이름')).toBeVisible()
  await expect(page.getByRole('button', { name: '추가' })).toBeVisible()
  await expect(page.getByRole('button', { name: '닫기' })).toBeVisible()
})

test('새 태그 이름을 입력하고 추가하면 목록에 나타난다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // API 라우트 모킹 — 태그 생성
  const newTag = { uuid: 'new-tag-uuid', name: 'E2E 태그' }
  await page.route('**/v1/tags/tag', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(newTag),
      })
    } else {
      await route.continue()
    }
  })

  await page.goto('/tags')
  await expect(page.getByRole('heading', { name: '태그 관리' })).toBeVisible()

  // when
  await page.getByPlaceholder('새 태그 이름').fill('E2E 태그')
  await page.getByRole('button', { name: '추가' }).click()

  // then
  await expect(page.getByText('E2E 태그')).toBeVisible()
})

test('태그 이름이 비어있으면 추가해도 아무 변화가 없다', async ({ page }) => {
  // given
  const existingTag = { uuid: 'existing-tag-uuid', name: '기존 태그' }
  await page.route('**/v1/tags/all', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([existingTag]),
    })
  })

  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/tags')
  await expect(page.getByText('기존 태그')).toBeVisible()

  const initialTagCount = await page.getByRole('listitem').count()

  // when — 빈 입력으로 추가 버튼 클릭
  await page.getByRole('button', { name: '추가' }).click()

  // then — 태그 목록에 변화가 없다
  await expect(page.getByRole('listitem')).toHaveCount(initialTagCount)
  await expect(page.getByText('기존 태그')).toBeVisible()
})

test('편집 버튼을 누르면 인라인 수정 UI가 표시된다', async ({ page }) => {
  // given — 페이지 로드 전에 태그 목록 모킹 (AuthGuard가 fetchAll을 최초 1회 호출)
  const existingTag = { uuid: 'editable-tag-uuid', name: '수정할 태그' }
  await page.route('**/v1/tags/all', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([existingTag]),
    })
  })

  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/tags')
  await expect(page.getByText('수정할 태그')).toBeVisible()

  // when
  await page.getByRole('button', { name: '편집' }).click()

  // then — 인라인 편집 입력 필드가 열린다
  await expect(page.locator('input:not([type="color"]):not([placeholder])')).toBeVisible()
  await expect(page.getByRole('button', { name: '저장' })).toBeVisible()
  await expect(page.getByRole('button', { name: '취소' })).toBeVisible()
})

test('편집 취소 버튼을 누르면 인라인 수정 UI가 닫힌다', async ({ page }) => {
  // given — 페이지 로드 전에 태그 목록 모킹
  const existingTag = { uuid: 'cancel-edit-tag', name: '편집취소 태그' }
  await page.route('**/v1/tags/all', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([existingTag]),
    })
  })

  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/tags')
  await page.getByRole('button', { name: '편집' }).click()
  await expect(page.locator('input:not([type="color"]):not([placeholder])')).toBeVisible()

  // when
  await page.getByRole('button', { name: '취소' }).click()

  // then — 수정 UI가 닫히고 태그 이름이 텍스트로 다시 표시된다
  await expect(page.getByText('편집취소 태그')).toBeVisible()
  await expect(page.locator('input:not([type="color"]):not([placeholder])')).not.toBeVisible()
})

test('태그 이름을 수정하고 저장하면 API가 호출된다', async ({ page }) => {
  // given — 페이지 로드 전에 태그 목록 모킹
  const existingTag = { uuid: 'save-edit-tag', name: '원래 이름' }
  await page.route('**/v1/tags/all', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([existingTag]),
    })
  })

  await page.route('**/v1/tags/tag/save-edit-tag', async route => {
    if (route.request().method() === 'PUT') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...existingTag, name: '바뀐 이름' }),
      })
    } else {
      await route.continue()
    }
  })

  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/tags')
  await page.getByRole('button', { name: '편집' }).click()

  // when
  await page.locator('input:not([type="color"]):not([placeholder])').fill('바뀐 이름')
  await page.getByRole('button', { name: '저장' }).click()

  // then — 편집 UI가 닫힌다 (저장 성공 후 editingId가 null로 리셋)
  await expect(page.locator('input:not([type="color"]):not([placeholder])')).not.toBeVisible()
})

test('삭제 버튼을 누르면 태그 삭제 확인 다이얼로그가 표시된다', async ({ page }) => {
  // given — 페이지 로드 전에 태그 목록 모킹
  const existingTag = { uuid: 'delete-tag-uuid', name: '삭제할 태그' }
  await page.route('**/v1/tags/all', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([existingTag]),
    })
  })

  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/tags')
  await expect(page.getByText('삭제할 태그')).toBeVisible()

  // when
  await page.getByRole('button', { name: '삭제' }).click()

  // then — 모달 다이얼로그가 표시된다
  await expect(page.getByText('태그 삭제')).toBeVisible()
  await expect(page.getByText('"삭제할 태그" 태그를 어떻게 삭제할까요?')).toBeVisible()
  await expect(page.getByRole('button', { name: '태그만 삭제' })).toBeVisible()
  await expect(page.getByRole('button', { name: '태그 + 연관 이벤트 모두 삭제' })).toBeVisible()
})

test('태그 삭제 다이얼로그에서 취소를 누르면 닫힌다', async ({ page }) => {
  // given — 페이지 로드 전에 태그 목록 모킹
  const existingTag = { uuid: 'cancel-delete-tag', name: '취소 삭제 태그' }
  await page.route('**/v1/tags/all', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([existingTag]),
    })
  })

  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/tags')
  await page.getByRole('button', { name: '삭제' }).click()
  await expect(page.getByText('태그 삭제')).toBeVisible()

  // when
  await page.getByRole('button', { name: '취소' }).click()

  // then
  await expect(page.getByText('태그 삭제')).not.toBeVisible()
  await expect(page.getByText('취소 삭제 태그')).toBeVisible()
})

test('닫기 버튼을 누르면 이전 페이지로 돌아간다', async ({ page }) => {
  // given
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/tags')

  // when
  await page.getByRole('button', { name: '닫기' }).click()

  // then
  await expect(page).not.toHaveURL('/tags')
})
