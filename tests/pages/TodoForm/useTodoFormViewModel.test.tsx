import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { RepositoriesProvider } from '../../../src/composition/RepositoriesProvider'
import { useTodoFormViewModel } from '../../../src/pages/TodoForm/useTodoFormViewModel'
import type { EventRepository } from '../../../src/repositories/EventRepository'
import type { EventDetailRepository } from '../../../src/repositories/EventDetailRepository'
import type { Repositories } from '../../../src/composition/container'
import type { Todo } from '../../../src/models/Todo'
import type { EventDetail } from '../../../src/models/EventDetail'

// ── 캐시 / api 부수 초기화 차단 ─────────────────────────────────────
vi.mock('../../../src/api/todoApi', () => ({ todoApi: {} }))
vi.mock('../../../src/api/scheduleApi', () => ({ scheduleApi: {} }))
vi.mock('../../../src/api/eventDetailApi', () => ({ eventDetailApi: {} }))
vi.mock('../../../src/api/settingApi', () => ({ settingApi: {} }))
vi.mock('../../../src/api/eventTagApi', () => ({ eventTagApi: {} }))
vi.mock('../../../src/api/doneTodoApi', () => ({ doneTodoApi: {} }))
vi.mock('../../../src/api/foremostApi', () => ({ foremostApi: {} }))
vi.mock('../../../src/api/holidayApi', () => ({ holidayApi: {} }))
vi.mock('../../../src/api/firebaseAuthApi', () => ({ firebaseAuthApi: {} }))
vi.mock('../../../src/firebase', () => ({ getAuthInstance: vi.fn(() => ({})) }))
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(() => () => {}),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn().mockImplementation(function (this: unknown) { return this }),
  OAuthProvider: vi.fn().mockImplementation(function (this: unknown) { return this }),
}))

// ── i18n stub (settingsCache 가 import 하는 의존) ────────────────────
vi.mock('../../../src/i18n', () => ({ default: { language: 'ko', on: vi.fn() } }))

// ── settingsCache: 기본값 stub ────────────────────────────────────────
// useSettingsCache 는 Zustand store로 hook 호출 외에 .getState() static도 사용됨.
interface SettingsCacheState {
  eventDefaults: { defaultTagId: string | null; defaultNotificationSeconds: number | null; defaultAllDayNotificationSeconds: number | null }
}
const settingsCacheState: SettingsCacheState = { eventDefaults: { defaultTagId: null, defaultNotificationSeconds: null, defaultAllDayNotificationSeconds: null } }
vi.mock('../../../src/repositories/caches/settingsCache', () => {
  const hook = (sel: (s: SettingsCacheState) => unknown) => sel(settingsCacheState)
  hook.getState = () => settingsCacheState
  return { useSettingsCache: hook }
})

// ── Fake Repositories ─────────────────────────────────────────────────

function makeTodo(override: Partial<Todo> & { uuid: string }): Todo {
  return {
    uuid: override.uuid,
    name: override.name ?? '할 일',
    is_current: override.is_current ?? false,
    ...override,
  }
}

function createFakeEventRepo(todos: Map<string, Todo> = new Map()): Pick<EventRepository,
  'getTodo' | 'createTodo' | 'updateTodo' | 'deleteTodo' | 'replaceTodoThisScope' | 'patchTodoNextOccurrence'
> {
  return {
    getTodo: vi.fn(async (id: string) => {
      const t = todos.get(id)
      if (!t) throw new Error(`todo not found: ${id}`)
      return t
    }),
    createTodo: vi.fn(async (input) => {
      const created = makeTodo({ uuid: 'created-1', name: input.name, is_current: false })
      todos.set(created.uuid, created)
      return created
    }),
    updateTodo: vi.fn(async (id: string) => {
      const existing = todos.get(id) ?? makeTodo({ uuid: id })
      const updated = { ...existing }
      todos.set(id, updated)
      return updated
    }),
    deleteTodo: vi.fn(async () => {}),
    replaceTodoThisScope: vi.fn(async () => ({
      new_todo: makeTodo({ uuid: 'new-1' }),
      next_repeating: undefined,
    })),
    patchTodoNextOccurrence: vi.fn(async (id: string) => {
      return todos.get(id) ?? makeTodo({ uuid: id })
    }),
  }
}

function createFakeDetailRepo(details: Map<string, EventDetail> = new Map()): Pick<EventDetailRepository,
  'get' | 'save' | 'invalidate'
> {
  return {
    get: vi.fn(async (id: string) => details.get(id) ?? null),
    save: vi.fn(async (id: string, detail: EventDetail) => {
      details.set(id, detail)
      return detail
    }),
    invalidate: vi.fn(),
  }
}

function createFakeRepos(
  todos?: Map<string, Todo>,
  details?: Map<string, EventDetail>,
): Repositories {
  return {
    eventRepo: createFakeEventRepo(todos) as unknown as EventRepository,
    eventDetailRepo: createFakeDetailRepo(details) as unknown as EventDetailRepository,
    tagRepo: {} as unknown as Repositories['tagRepo'],
    holidayRepo: {} as unknown as Repositories['holidayRepo'],
    doneTodoRepo: {} as unknown as Repositories['doneTodoRepo'],
    foremostEventRepo: {} as unknown as Repositories['foremostEventRepo'],
    authRepo: {} as unknown as Repositories['authRepo'],
    settingsRepo: {} as unknown as Repositories['settingsRepo'],
  }
}

function wrap(repos: Repositories) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <RepositoriesProvider value={repos}>{children}</RepositoriesProvider>
  }
}

// ── 테스트 ────────────────────────────────────────────────────────────

describe('useTodoFormViewModel — 신규 생성', () => {
  let repos: Repositories

  beforeEach(() => {
    repos = createFakeRepos()
  })

  it('빈 이름으로 저장하면 errorKey 에 invalid_name 키가 세팅된다', async () => {
    // given
    const { result } = renderHook(() => useTodoFormViewModel(undefined), { wrapper: wrap(repos) })

    // when
    act(() => result.current.setName(''))
    await act(async () => { await result.current.save() })

    // then
    expect(result.current.errorKey).toBe('error.eventSave.invalid_name')
    expect(result.current.successKey).toBeNull()
  })

  it('유효한 이름으로 저장하면 successKey 에 event.created.todo 가 세팅된다', async () => {
    // given
    const { result } = renderHook(() => useTodoFormViewModel(undefined), { wrapper: wrap(repos) })

    // when
    act(() => result.current.setName('새 할 일'))
    await act(async () => { await result.current.save() })

    // then
    expect(result.current.successKey).toBe('event.created.todo')
    expect(result.current.errorKey).toBeNull()
  })

  it('저장 중에는 saving이 true이다', async () => {
    // given: createTodo 가 pending 인 경우
    let resolveCreate!: (v: Todo) => void
    const pendingRepos = createFakeRepos()
    vi.mocked(pendingRepos.eventRepo.createTodo).mockImplementation(
      () => new Promise(r => { resolveCreate = r }),
    )
    const { result } = renderHook(() => useTodoFormViewModel(undefined), { wrapper: wrap(pendingRepos) })
    act(() => result.current.setName('테스트'))

    // when
    act(() => { result.current.save() })

    // then: saving 상태
    await waitFor(() => expect(result.current.saving).toBe(true))

    // cleanup
    act(() => resolveCreate(makeTodo({ uuid: 'x' })))
  })

  it('dismissMessage 호출 후 successKey/errorKey 가 null 로 초기화된다', async () => {
    // given
    const { result } = renderHook(() => useTodoFormViewModel(undefined), { wrapper: wrap(repos) })
    act(() => result.current.setName('할 일'))
    await act(async () => { await result.current.save() })
    expect(result.current.successKey).toBe('event.created.todo')

    // when
    act(() => result.current.dismissMessage())

    // then
    expect(result.current.successKey).toBeNull()
    expect(result.current.errorKey).toBeNull()
  })
})

describe('useTodoFormViewModel — 편집 로드', () => {
  it('id 가 주어지면 마운트 시 todo 가 로드되어 폼에 반영된다', async () => {
    // given
    const todos = new Map([['todo-1', makeTodo({ uuid: 'todo-1', name: '기존 이름' })]])
    const repos = createFakeRepos(todos)

    // when
    const { result } = renderHook(() => useTodoFormViewModel('todo-1'), { wrapper: wrap(repos) })

    // then: 로드 완료 후 이름이 반영됨
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.name).toBe('기존 이름')
  })

  it('로드 완료 후 변경 없으면 isDirty 가 false 이다', async () => {
    // given
    const todos = new Map([['todo-2', makeTodo({ uuid: 'todo-2', name: '할 일' })]])
    const repos = createFakeRepos(todos)

    // when
    const { result } = renderHook(() => useTodoFormViewModel('todo-2'), { wrapper: wrap(repos) })

    // then
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.isDirty).toBe(false)
  })

  it('로드 후 이름을 변경하면 isDirty 가 true 이다', async () => {
    // given
    const todos = new Map([['todo-3', makeTodo({ uuid: 'todo-3', name: '기존' })]])
    const repos = createFakeRepos(todos)
    const { result } = renderHook(() => useTodoFormViewModel('todo-3'), { wrapper: wrap(repos) })
    await waitFor(() => expect(result.current.loading).toBe(false))

    // when
    act(() => result.current.setName('수정됨'))

    // then
    expect(result.current.isDirty).toBe(true)
  })

  it('로드 실패해도 loading 이 false 로 전환된다', async () => {
    // given: getTodo 가 throw
    const repos = createFakeRepos()
    vi.mocked(repos.eventRepo.getTodo).mockRejectedValue(new Error('network'))

    // when
    const { result } = renderHook(() => useTodoFormViewModel('bad-id'), { wrapper: wrap(repos) })

    // then
    await waitFor(() => expect(result.current.loading).toBe(false))
  })
})

describe('useTodoFormViewModel — 편집 저장', () => {
  it('비반복 todo 업데이트 성공하면 successKey 가 event.updated.todo 이다', async () => {
    // given
    const todos = new Map([['todo-1', makeTodo({ uuid: 'todo-1', name: '기존' })]])
    const repos = createFakeRepos(todos)
    const { result } = renderHook(() => useTodoFormViewModel('todo-1'), { wrapper: wrap(repos) })
    await waitFor(() => expect(result.current.loading).toBe(false))

    // when
    act(() => result.current.setName('수정됨'))
    await act(async () => { await result.current.save() })

    // then
    expect(result.current.successKey).toBe('event.updated.todo')
  })

  it('반복 todo 의 경우 saveScopeRequired 가 true 이다', async () => {
    // given
    const repeatingTodo = makeTodo({
      uuid: 'repeat-1',
      name: '반복',
      repeating: {
        start: 1743375600,
        option: { optionType: 'every_week', interval: 1, dayOfWeek: [1], timeZone: 'UTC' },
      },
    })
    const todos = new Map([['repeat-1', repeatingTodo]])
    const repos = createFakeRepos(todos)
    const { result } = renderHook(() => useTodoFormViewModel('repeat-1'), { wrapper: wrap(repos) })

    // then
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.saveScopeRequired).toBe(true)
  })
})

describe('useTodoFormViewModel — 삭제', () => {
  it('비반복 todo 삭제 성공하면 successKey 가 event.deleted.todo 이다', async () => {
    // given
    const todos = new Map([['todo-del', makeTodo({ uuid: 'todo-del', name: '삭제할 일' })]])
    const repos = createFakeRepos(todos)
    const { result } = renderHook(() => useTodoFormViewModel('todo-del'), { wrapper: wrap(repos) })
    await waitFor(() => expect(result.current.loading).toBe(false))

    // when
    await act(async () => { await result.current.delete() })

    // then
    expect(result.current.successKey).toBe('event.deleted.todo')
  })

  it('삭제 실패 시 errorKey 에 error.eventDelete. prefix 가 붙는다', async () => {
    // given
    const todos = new Map([['todo-del2', makeTodo({ uuid: 'todo-del2', name: '삭제 실패' })]])
    const repos = createFakeRepos(todos)
    vi.mocked(repos.eventRepo.deleteTodo).mockRejectedValue(new Error('server error'))
    const { result } = renderHook(() => useTodoFormViewModel('todo-del2'), { wrapper: wrap(repos) })
    await waitFor(() => expect(result.current.loading).toBe(false))

    // when
    await act(async () => { await result.current.delete() })

    // then
    expect(result.current.errorKey).toMatch(/^error\.eventDelete\./)
    expect(result.current.successKey).toBeNull()
  })
})
