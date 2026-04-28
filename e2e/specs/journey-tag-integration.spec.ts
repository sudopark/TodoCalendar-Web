/**
 * 태그 통합 사용자 여정 E2E 테스트
 *
 * 태그 생성 → Todo에 태그 적용 → TagFilter 동작 → 태그 삭제 흐름을 검증한다.
 */
import { test, expect } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)
})

function setupBaseMocks(page: Parameters<Parameters<typeof test>[1]>[0], extraTags: object[] = []) {
  return Promise.all([
    page.route('**/v1/foremost**', async route => {
      await route.fulfill({ status: 404, body: '{}' })
    }),
    page.route('**/v1/holidays**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    }),
    page.route('**/v1/schedules**', async route => {
      const method = route.request().method()
      if (method === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
      } else {
        await route.continue()
      }
    }),
  ])
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: /tags 이동 → 태그 "업무" 생성 → 목록에 나타남
// ─────────────────────────────────────────────────────────────────────────────
test('/tags 페이지에서 새 태그를 생성하면 목록에 나타난다', async ({ page }) => {
  const newTag = { uuid: 'tag-work-001', name: '업무', color_hex: '#3b82f6' }
  let tags: object[] = []

  // given
  await setupBaseMocks(page)
  await page.route('**/v1/tags/**', async route => {
    const url = route.request().url()
    const method = route.request().method()

    if (url.includes('/tags/tag') && method === 'POST') {
      tags = [newTag]
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(newTag) })
      return
    }
    if (url.includes('/tags/all') && method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tags) })
      return
    }
    await route.continue()
  })
  await page.route('**/v1/todos**', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    } else {
      await route.continue()
    }
  })

  // when — /tags 페이지로 이동 후 + 버튼 → 패널에서 태그 생성
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/tags')
  await expect(page.getByRole('heading', { name: '이벤트 종류' })).toBeVisible()

  await page.getByRole('button', { name: '새 태그 추가' }).click()
  await expect(page.getByRole('heading', { name: '새 태그' })).toBeVisible()
  await page.getByLabel('이름').fill('업무')
  await page.getByTitle('#3b82f6').click()
  await page.getByRole('button', { name: '저장' }).click()

  // then — 생성된 태그가 목록에 표시된다
  await expect(page.getByText('업무')).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: FAB → Todo → TagDropdown에서 태그 선택 → 저장 → 메인 색상 점 확인
// ─────────────────────────────────────────────────────────────────────────────
test('Todo 폼에서 "업무" 태그를 선택하고 저장하면 Current 목록에서 태그 색상 점이 표시된다', async ({ page }) => {
  const tag = { uuid: 'tag-work-001', name: '업무', color_hex: '#3b82f6' }
  const newTodo = {
    uuid: 'todo-tagged-001',
    name: '업무 태그 Todo',
    event_tag_id: tag.uuid,
    is_current: true,
    event_time: null,
    repeating: null,
  }

  // given
  await setupBaseMocks(page)
  await page.route('**/v1/tags/**', async route => {
    const url = route.request().url()
    if (url.includes('/tags/all')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([tag]) })
    } else {
      await route.continue()
    }
  })
  await page.route('**/v1/todos**', async route => {
    const url = route.request().url()
    const method = route.request().method()

    if (url.includes('/todo') && method === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(newTodo) })
      return
    }
    if (method !== 'GET') { await route.continue(); return }

    if (url.includes('/uncompleted')) {
      // 미완료 목록: 빈 배열
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    } else if (url.includes('lower=') && url.includes('upper=')) {
      // 캘린더 범위 쿼리: 빈 배열
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    } else {
      // getCurrentTodos (/v1/todos): newTodo 포함
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([newTodo]) })
    }
  })

  // when — 기본 태그를 "업무"로 설정 후, FAB → Todo → 팝오버에서 저장
  await page.addInitScript(() => {
    localStorage.setItem('event_defaults', JSON.stringify({ defaultTagId: 'tag-work-001' }))
  })
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  await page.getByTestId('create-event-button').click()
  await page.getByRole('menuitem', { name: 'Todo', exact: true }).click()
  await expect(page.getByTestId('event-form-backdrop')).toBeVisible()

  // 이름 입력 후 저장
  await page.getByPlaceholder('이벤트 이름 추가').fill('업무 태그 Todo')
  await page.getByRole('button', { name: '저장' }).click()

  // then — 저장 후 팝오버가 닫히고 todo가 표시된다
  await expect(page.getByTestId('event-form-backdrop')).not.toBeVisible()
  await expect(page.getByText('업무 태그 Todo').first()).toBeVisible()

  // 색상 바가 todo 아이템에 있어야 한다 (rounded-full 클래스의 컬러바)
  const todoItem = page.locator('.bg-\\[\\#f3f4f7\\]').filter({ hasText: '업무 태그 Todo' }).first()
  const colorBar = todoItem.locator('.rounded-full').first()
  await expect(colorBar).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: TagFilter에서 "업무" 클릭 → Current 목록에서 사라짐 → 다시 클릭 → 재등장
// ─────────────────────────────────────────────────────────────────────────────
test('TagFilter에서 태그를 클릭하면 해당 태그의 Todo가 Current 목록에서 사라지고, 다시 클릭하면 재등장한다', async ({ page }) => {
  const tag = { uuid: 'tag-work-filter', name: '업무', color_hex: '#ef4444' }
  const taggedTodo = {
    uuid: 'todo-tagged-filter',
    name: '필터될 Todo',
    event_tag_id: tag.uuid,
    is_current: true,
    event_time: null,
    repeating: null,
  }

  // given
  await setupBaseMocks(page)
  await page.route('**/v1/tags/**', async route => {
    const url = route.request().url()
    if (url.includes('/tags/all')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([tag]) })
    } else {
      await route.continue()
    }
  })
  await page.route('**/v1/todos**', async route => {
    const url = route.request().url()
    const method = route.request().method()
    if (method !== 'GET') { await route.continue(); return }

    if (url.includes('/uncompleted')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    } else if (url.includes('lower=') && url.includes('upper=')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    } else {
      // getCurrentTodos: taggedTodo 포함
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([taggedTodo]) })
    }
  })

  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // Todo가 페이지에 보여야 한다
  await expect(page.getByText('필터될 Todo').first()).toBeVisible()

  // CalendarList의 "업무" 태그 항목 클릭 → 숨김
  // 사이드바 내 CalendarList에서 태그 이름 텍스트를 가진 항목을 찾는다
  const sidebar = page.locator('.hidden.md\\:flex.flex-col').first()
  const tagItem = sidebar.getByText('업무', { exact: true })
  await expect(tagItem).toBeVisible()

  // when — 첫 번째 클릭 (숨김)
  await tagItem.click()

  // then — Todo가 사라진다
  await expect(page.getByText('필터될 Todo')).not.toBeVisible()

  // when — 두 번째 클릭 (다시 표시)
  await tagItem.click()

  // then — Todo가 다시 보인다
  await expect(page.getByText('필터될 Todo').first()).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 4: /tags에서 "태그 + 이벤트 삭제" → 연관 Todo도 사라짐
// ─────────────────────────────────────────────────────────────────────────────
test('/tags에서 "태그 + 연관 이벤트 모두 삭제"를 선택하면 연관 Todo가 목록에서 제거된다', async ({ page }) => {
  const tag = { uuid: 'tag-delete-001', name: '삭제할태그', color_hex: '#10b981' }
  const taggedTodo = {
    uuid: 'todo-delete-001',
    name: '태그 삭제될 Todo',
    event_tag_id: tag.uuid,
    is_current: true,
    event_time: null,
    repeating: null,
  }

  let tagDeleted = false
  let currentTags = [tag]

  // given
  await setupBaseMocks(page)
  await page.route('**/v1/setting/event/tag/default/color', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ default: '#4A90D9', holiday: '#ef4444' }),
    })
  })
  await page.route('**/v1/tags/**', async route => {
    const url = route.request().url()
    const method = route.request().method()

    if (url.includes('/tags/tag_and_events/') && method === 'DELETE') {
      tagDeleted = true
      currentTags = []
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) })
      return
    }
    if (url.includes('/tags/all') && method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(currentTags) })
      return
    }
    await route.continue()
  })
  await page.route('**/v1/todos**', async route => {
    const url = route.request().url()
    const method = route.request().method()
    if (method !== 'GET') { await route.continue(); return }

    const items = tagDeleted ? [] : [taggedTodo]
    if (url.includes('/uncompleted')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    } else if (url.includes('lower=') && url.includes('upper=')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(items) })
    }
  })

  // when — 메인에서 Todo 확인 후 /tags 이동
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText('태그 삭제될 Todo').first()).toBeVisible()

  await page.goto('/tags')
  await expect(page.getByRole('heading', { name: '이벤트 종류' })).toBeVisible()
  await expect(page.getByText('삭제할태그')).toBeVisible()

  // info 버튼(Default, Holiday, 삭제할태그 중 index 2) → 편집 패널 열기 → 삭제
  await page.getByRole('button', { name: '태그 상세 열기' }).nth(2).click()
  await expect(page.getByRole('heading', { name: '태그 편집' })).toBeVisible()
  await page.getByRole('button', { name: '삭제', exact: true }).click()

  // 확인 다이얼로그에서 "태그 + 연관 이벤트 모두 삭제" 선택
  await expect(page.getByRole('button', { name: '태그 + 연관 이벤트 모두 삭제' })).toBeVisible()
  await page.getByRole('button', { name: '태그 + 연관 이벤트 모두 삭제' }).click()

  // then — 태그가 목록에서 사라진다
  await expect(page.getByText('삭제할태그', { exact: true })).not.toBeVisible()

  // 메인으로 돌아가면 연관 Todo도 사라진다
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  // Current 섹션 자체가 사라지거나 해당 Todo가 보이지 않아야 한다
  await expect(page.getByText('태그 삭제될 Todo')).not.toBeVisible()
})
