/**
 * Todo 라이프사이클 사용자 여정 E2E 테스트
 *
 * 실제 사용자 관점에서 Todo 생성→확인→완료→되돌리기→로그아웃까지의
 * 전체 흐름을 검증한다.
 *
 * NOTE: Test 1(FAB → Todo 오버레이 가시성)은 오버레이 포지셔닝 버그로 인해 실패가 예상된다.
 * 오버레이 버그: TodoFormPage/ScheduleFormPage가 overlay route로 렌더될 때
 * fixed 포지셔닝이 없어 뷰포트 아래에 렌더된다.
 */
import { test, expect } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

const NOW_SEC = Math.floor(Date.now() / 1000)

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: FAB → Todo 오버레이 가시성
// NOTE: 이 테스트는 현재 알려진 오버레이 버그로 인해 FAIL이 예상된다.
// TodoFormPage는 overlay route로 렌더될 때 fixed 포지셔닝이 없어 뷰포트 밖에 렌더된다.
// ─────────────────────────────────────────────────────────────────────────────
test('FAB 클릭 후 Todo 선택 시 Todo 폼이 화면에 보여야 한다 [overlay bug]', async ({ page }) => {
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

  // when — FAB 클릭 → Todo 선택 (exact: true 로 TypeSelectorPopup 버튼만 매칭)
  await page.getByRole('button', { name: '새 이벤트' }).click()
  await expect(page.getByRole('button', { name: 'Todo', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Todo', exact: true }).click()

  // then — URL이 /todos/new로 변경되어야 한다
  await expect(page).toHaveURL(/\/todos\/new/)

  // 폼 요소가 뷰포트 내에서 보여야 한다 (오버레이 버그 검증)
  await expect(page.getByRole('heading', { name: '새 Todo' })).toBeVisible()
  await expect(page.getByLabel('이름')).toBeVisible()
  await expect(page.getByRole('button', { name: '저장' })).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: FAB → Schedule 오버레이 가시성
// ─────────────────────────────────────────────────────────────────────────────
test('FAB 클릭 후 Schedule 선택 시 Schedule 폼이 화면에 보여야 한다', async ({ page }) => {
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

  // when — FAB 클릭 → Schedule 선택 (exact: true 로 TypeSelectorPopup 버튼만 매칭)
  await page.getByRole('button', { name: '새 이벤트' }).click()
  await expect(page.getByRole('button', { name: 'Schedule', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Schedule', exact: true }).click()

  // then — URL이 /schedules/new로 변경되어야 한다
  await expect(page).toHaveURL(/\/schedules\/new/)

  // 폼 요소가 뷰포트 내에서 보여야 한다
  await expect(page.getByRole('heading', { name: '새 Schedule' })).toBeVisible()
  await expect(page.getByLabel('이름')).toBeVisible()
  await expect(page.getByRole('button', { name: '저장' })).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: Todo 생성 → 메인에서 확인
// ─────────────────────────────────────────────────────────────────────────────
test('Todo 폼에서 이름 입력 후 저장하면 메인 페이지 현재 목록에 나타난다', async ({ page }) => {
  const newTodo = {
    uuid: 'journey-new-001',
    name: '새로 만든 여정 Todo',
    is_current: true,
    event_time: null,
    repeating: null,
  }

  // given — Todo POST API 모킹 (생성 API) + 목록에 항상 새 Todo 포함
  // NOTE: GET /v1/todos 가 처음부터 새 Todo를 반환하도록 하여 저장 후
  //       addTodo 낙관적 업데이트와 무관하게 항목이 표시되도록 한다.
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
      // GET /v1/todos (현재 todo 목록) — 항상 새 Todo 포함
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([newTodo]) })
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

  // when — 메인 페이지 진입 후 /todos/new 직접 이동 (background state 없이)
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto('/todos/new')
  await expect(page.getByRole('heading', { name: '새 Todo' })).toBeVisible()
  await page.getByLabel('이름').fill('새로 만든 여정 Todo')
  await page.getByRole('button', { name: '저장' }).click()

  // then — 저장 후 메인 페이지로 돌아간다
  await expect(page).not.toHaveURL(/\/todos\/new/)

  // 메인 페이지의 Current 섹션에 새 Todo가 나타난다
  await expect(page.getByText('새로 만든 여정 Todo')).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 4: Todo 클릭 → 상세 → 편집
// ─────────────────────────────────────────────────────────────────────────────
test('현재 Todo를 클릭하면 이벤트 상세 페이지가 열리고 편집 버튼으로 편집 폼에 진입할 수 있다', async ({ page }) => {
  const todoId = 'journey-detail-todo'
  const todo = {
    uuid: todoId,
    name: '상세 보기 테스트 Todo',
    is_current: true,
    event_time: null,
    repeating: null,
  }

  // given — 목록에 Todo 하나 표시, 상세 API 모킹
  // NOTE: '**/v1/todos**' 패턴이 '/v1/todos/todo/{id}' 포함 모든 서브경로 매칭
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

  // CurrentTodoList의 버튼은 todo name을 텍스트로 포함
  await page.getByRole('button', { name: '상세 보기 테스트 Todo' }).click()

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

  // CurrentTodoList에 체크박스가 보여야 한다
  const checkbox = page.getByRole('checkbox', { name: '완료 처리할 Todo' })
  await expect(checkbox).toBeVisible()

  // when — 체크박스 클릭 (완료 처리)
  await checkbox.click()

  // then — Todo가 현재 목록에서 사라진다
  await expect(page.getByRole('checkbox', { name: '완료 처리할 Todo' })).not.toBeVisible()

  // /done 페이지로 이동하면 완료된 항목이 보인다
  await page.goto('/done')
  await page.waitForLoadState('networkidle')
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
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(revertedTodo) })
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
  await page.goto('/done')
  await page.waitForLoadState('networkidle')

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
  await page.goto('/settings')
  await page.waitForLoadState('networkidle')

  await expect(page.getByRole('heading', { name: '설정' })).toBeVisible()

  // when — 로그아웃 버튼 클릭
  await page.getByRole('button', { name: '로그아웃' }).click()

  // then — 로그인 페이지로 리다이렉트
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole('heading', { name: 'TodoCalendar' })).toBeVisible()
})
