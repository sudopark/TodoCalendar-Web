/**
 * Todo 라이프사이클 사용자 여정 E2E 테스트
 *
 * 실제 사용자 관점에서 Todo 생성→확인→완료→되돌리기→로그아웃까지의
 * 전체 흐름을 검증한다.
 */
import { test, expect } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

const NOW_SEC = Math.floor(Date.now() / 1000)

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: FAB → Todo 팝오버 가시성
// ─────────────────────────────────────────────────────────────────────────────
test('FAB 클릭 후 Todo 선택 시 Todo 팝오버가 화면에 보여야 한다', async ({ page }) => {
  // given
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

  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // when — FAB 클릭 → Todo 선택
  await page.getByTestId('create-event-button').click()
  await expect(page.getByRole('menuitem', { name: 'Todo', exact: true })).toBeVisible()
  await page.getByRole('menuitem', { name: 'Todo', exact: true }).click()

  // then — 팝오버가 표시된다
  await expect(page.getByTestId('event-form-backdrop')).toBeVisible()
  await expect(page.getByPlaceholder('이벤트 이름 추가')).toBeVisible()
  await expect(page.getByRole('button', { name: '저장' })).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: FAB → Schedule 팝오버 가시성
// ─────────────────────────────────────────────────────────────────────────────
test('FAB 클릭 후 Schedule 선택 시 Schedule 팝오버가 화면에 보여야 한다', async ({ page }) => {
  // given
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

  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // when — FAB 클릭 → Schedule 선택
  await page.getByTestId('create-event-button').click()
  await expect(page.getByRole('menuitem', { name: 'Schedule', exact: true })).toBeVisible()
  await page.getByRole('menuitem', { name: 'Schedule', exact: true }).click()

  // then — 팝오버가 표시된다
  await expect(page.getByTestId('event-form-backdrop')).toBeVisible()
  await expect(page.getByPlaceholder('이벤트 이름 추가')).toBeVisible()
  await expect(page.getByRole('button', { name: '저장' })).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: Todo 생성 → 메인에서 확인
// ─────────────────────────────────────────────────────────────────────────────
test('Todo 팝오버에서 이름 입력 후 저장하면 메인 페이지 현재 목록에 나타난다', async ({ page }) => {
  const newTodo = {
    uuid: 'journey-new-001',
    name: '새로 만든 여정 Todo',
    is_current: true,
    event_time: null,
    repeating: null,
  }

  // given — Todo POST API 모킹 (생성 API) + save 후 addTodo로 목록에 추가되므로 초기 목록은 비움
  await page.route('**/v1/todos**', async route => {
    const url = route.request().url()
    const method = route.request().method()
    if (url.includes('/todo') && method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(newTodo),
      })
      return
    }
    if (method !== 'GET') { await route.continue(); return }
    if (url.includes('/uncompleted')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    } else if (url.includes('/dones')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    } else if (url.includes('/todo/')) {
      await route.fulfill({ status: 404, body: '{}' })
    } else {
      // GET /v1/todos (현재 todo 목록) — 초기에는 비어있고, save 시 store.addTodo로 추가됨
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    }
  })
  await page.route('**/v1/schedules**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
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

  // when — 메인 페이지에서 FAB → Todo → 팝오버에서 이름 입력 후 저장
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  await page.getByTestId('create-event-button').click()
  await page.getByRole('menuitem', { name: 'Todo', exact: true }).click()
  await expect(page.getByTestId('event-form-backdrop')).toBeVisible()

  await page.getByPlaceholder('이벤트 이름 추가').fill('새로 만든 여정 Todo')
  await page.getByRole('button', { name: '저장' }).click()

  // then — 저장 후 팝오버가 닫힌다
  await expect(page.getByTestId('event-form-backdrop')).not.toBeVisible()

  // 메인 페이지의 Current 섹션에 새 Todo가 나타난다
  await expect(page.getByText('새로 만든 여정 Todo')).toBeVisible()
})

// EventDetailPage(/events/:id) 라우트가 EventDetailPopover로 대체되어 제거됨.
// 팝오버 기반 편집 플로우는 별도 시나리오로 재작성 필요 — 이 브랜치 스코프 외.
test.skip('현재 Todo를 클릭하면 이벤트 상세 페이지가 열리고 편집 버튼으로 편집 폼에 진입할 수 있다', async ({ page }) => {
  const todoId = 'journey-detail-todo'
  const todo = {
    uuid: todoId,
    name: '상세 보기 테스트 Todo',
    is_current: true,
    event_time: null,
    repeating: null,
  }

  // given — 목록에 Todo 하나 표시, 상세 API 모킹
  await page.route('**/v1/todos**', async route => {
    const url = route.request().url()
    const method = route.request().method()
    if (method !== 'GET') { await route.continue(); return }
    if (url.includes('/uncompleted')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    } else if (url.includes('/dones')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    } else if (url.includes(`/todo/${todoId}`)) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(todo) })
    } else if (url.includes('/todo/')) {
      await route.fulfill({ status: 404, body: '{}' })
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([todo]) })
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
  await page.route('**/v1/events/detail**', async route => {
    await route.fulfill({ status: 404, body: '{}' })
  })

  // when — 메인 페이지에서 Todo 클릭
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // CurrentTodoList의 카드를 클릭하면 상세 페이지로 이동 (텍스트 영역 클릭)
  await page.getByText('상세 보기 테스트 Todo').click()

  // then — EventDetailPage가 오버레이로 열린다
  await expect(page).toHaveURL(new RegExp(`/events/${todoId}`))
  await expect(page.getByRole('heading', { name: '상세 보기 테스트 Todo' })).toBeVisible()

  // 편집 버튼 클릭 (header row의 "편집" button)
  await page.getByRole('button', { name: '편집' }).first().click()

  // 편집 폼으로 이동
  await expect(page).toHaveURL(new RegExp(`/todos/${todoId}/edit`))
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 5: Todo 완료 → 완료 목록에서 확인
// ─────────────────────────────────────────────────────────────────────────────
test('현재 Todo의 체크박스를 클릭하면 목록에서 사라지고 완료 목록에 나타난다', async ({ page }) => {
  const todoId = 'journey-complete-todo'
  const todo = {
    uuid: todoId,
    name: '완료 처리할 Todo',
    is_current: true,
    event_time: null,
    repeating: null,
  }
  const doneTodo = {
    uuid: 'journey-done-from-complete',
    name: '완료 처리할 Todo',
    done_at: NOW_SEC,
    event_time: null,
    event_tag_id: null,
  }

  let completed = false

  // given — todos 전체 경로 모킹 (complete API 포함)
  await page.route('**/v1/todos**', async route => {
    const url = route.request().url()
    const method = route.request().method()

    if (url.includes(`/todo/${todoId}/complete`) && method === 'POST') {
      completed = true
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(doneTodo) })
      return
    }

    if (method !== 'GET') { await route.continue(); return }

    if (url.includes('/uncompleted')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    } else if (url.includes('/dones')) {
      const items = completed ? [doneTodo] : []
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(items) })
    } else if (url.includes(`/todo/${todoId}`)) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(todo) })
    } else if (url.includes('/todo/')) {
      await route.fulfill({ status: 404, body: '{}' })
    } else {
      const items = completed ? [] : [todo]
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(items) })
    }
  })
  await page.route('**/v1/schedules**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
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

  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // CurrentTodoList에 완료 버튼이 보여야 한다
  const completeBtn = page.getByRole('button', { name: '완료 처리할 Todo' })
  await expect(completeBtn).toBeVisible()

  // when — 완료 버튼 클릭 (완료 처리)
  await completeBtn.click()

  // then — Todo가 현재 목록에서 사라진다
  await expect(page.getByRole('button', { name: '완료 처리할 Todo' })).not.toBeVisible()

  // ArchivePanel 진입(메인 우측 패널의 "완료된 할 일" 버튼) 후 완료된 항목 확인
  await page.getByRole('button', { name: '완료된 할 일', exact: true }).click()
  await expect(page.getByText('완료 처리할 Todo').first()).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 6: 완료된 Todo 되돌리기
// ─────────────────────────────────────────────────────────────────────────────
test('완료 목록에서 되돌리기를 클릭하면 항목이 완료 목록에서 사라진다', async ({ page }) => {
  const doneId = 'journey-revert-done'
  const doneTodo = {
    uuid: doneId,
    name: '되돌릴 완료 항목',
    done_at: NOW_SEC - 1800,
    event_time: null,
    event_tag_id: null,
  }
  const revertedTodo = {
    uuid: 'journey-reverted-current',
    name: '되돌릴 완료 항목',
    is_current: true,
    event_time: null,
    repeating: null,
  }

  let reverted = false

  // given — todos 전체 경로 모킹 (revert API 포함)
  await page.route('**/v1/todos**', async route => {
    const url = route.request().url()
    const method = route.request().method()

    if (url.includes(`/dones/${doneId}/revert`) && method === 'POST') {
      reverted = true
      // iOS RevertTodoResultMapper 정합 — { todo, detail } 형태
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ todo: revertedTodo, detail: null }) })
      return
    }

    if (method !== 'GET') { await route.continue(); return }

    if (url.includes('/uncompleted')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    } else if (url.includes('/dones')) {
      const items = reverted ? [] : [doneTodo]
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(items) })
    } else if (url.includes('/todo/')) {
      await route.fulfill({ status: 404, body: '{}' })
    } else {
      const items = reverted ? [revertedTodo] : []
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(items) })
    }
  })
  await page.route('**/v1/schedules**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
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

  await page.goto('/')
  await page.waitForLoadState('networkidle')
  // ArchivePanel 진입 (메인 페이지 우측 패널의 "완료된 할 일" 버튼)
  await page.getByRole('button', { name: '완료된 할 일', exact: true }).click()

  // 완료 목록에 항목이 보여야 한다
  await expect(page.getByText('되돌릴 완료 항목').first()).toBeVisible()
  const revertBtn = page.getByRole('button', { name: '되돌리기' }).first()
  await expect(revertBtn).toBeVisible()

  // when — 되돌리기 클릭
  await revertBtn.click()

  // then — 항목이 완료 목록에서 사라진다 (React StrictMode 이중 렌더 가능성 고려)
  await expect(page.getByText('되돌릴 완료 항목').first()).not.toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 7: 로그아웃 → 로그인 페이지 리다이렉트
// ─────────────────────────────────────────────────────────────────────────────
test('설정 페이지에서 로그아웃하면 로그인 페이지로 리다이렉트된다', async ({ page }) => {
  // given
  await page.route('**/v1/tags**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })
  await page.route('**/v1/todos**', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    } else {
      await route.continue()
    }
  })
  await page.route('**/v1/foremost**', async route => {
    await route.fulfill({ status: 404, body: '{}' })
  })
  await page.route('**/v1/schedules**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })
  await page.route('**/v1/holidays**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })

  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // 설정 페이지의 카테고리 메뉴는 /settings/:categoryId 로 분기되며 '계정' 카테고리에 로그아웃 버튼이 있다
  await page.goto('/settings/account')
  await page.waitForLoadState('networkidle')

  // when — 로그아웃 버튼 클릭
  await page.getByRole('button', { name: '로그아웃' }).click()

  // then — 로그인 페이지로 리다이렉트
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole('heading', { name: 'TodoCalendar' })).toBeVisible()
})
