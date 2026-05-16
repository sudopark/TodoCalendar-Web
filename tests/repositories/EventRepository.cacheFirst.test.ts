import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EventRepository } from '../../src/repositories/EventRepository'
import { LocalStorageContainer } from '../../src/repositories/local-storage/LocalStorageContainer'
import { useCalendarEventsCache } from '../../src/repositories/caches/calendarEventsCache'
import { useCurrentTodosCache } from '../../src/repositories/caches/currentTodosCache'
import { useUncompletedTodosCache } from '../../src/repositories/caches/uncompletedTodosCache'
import { yearRange } from '../../src/domain/functions/eventTime'
import type { Todo } from '../../src/models/Todo'
import type { Schedule } from '../../src/models/Schedule'

const TEST_UID = 'cf-test'

function todo(uuid: string, ts: number, overrides: Partial<Todo> = {}): Todo {
  return {
    uuid, name: `t-${uuid}`,
    is_current: false,
    event_tag_id: null,
    event_time: { time_type: 'at', timestamp: ts },
    repeating: null,
    notification_options: null,
    ...overrides,
  } as Todo
}

function schedule(uuid: string, ts: number, overrides: Partial<Schedule> = {}): Schedule {
  return {
    uuid, name: `s-${uuid}`,
    event_tag_id: null,
    event_time: { time_type: 'at', timestamp: ts },
    repeating: null,
    notification_options: null,
    ...overrides,
  } as Schedule
}

async function deleteDb(uid: string) {
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(`todocal-cache:${uid}`)
    req.onsuccess = req.onerror = req.onblocked = () => resolve()
  })
}

function makeFakeApis() {
  return {
    todoApi: {
      getTodos: vi.fn(),
      getCurrentTodos: vi.fn(), getUncompletedTodos: vi.fn(),
      getTodo: vi.fn(), createTodo: vi.fn(), updateTodo: vi.fn(),
      completeTodo: vi.fn(), replaceTodo: vi.fn(), patchTodo: vi.fn(), deleteTodo: vi.fn(),
    },
    scheduleApi: {
      getSchedules: vi.fn(),
      getSchedule: vi.fn(), createSchedule: vi.fn(), updateSchedule: vi.fn(),
      excludeRepeating: vi.fn(), deleteSchedule: vi.fn(),
    },
  }
}

describe('EventRepository.fetchEventsForYear — cache-first', () => {
  let container: LocalStorageContainer

  beforeEach(async () => {
    container = new LocalStorageContainer()
    await container.init(TEST_UID)
    useCalendarEventsCache.getState().reset()
  })

  afterEach(async () => {
    await container.dispose()
    await deleteDb(TEST_UID)
    useCalendarEventsCache.getState().reset()
  })

  it('LocalStorage 캐시가 있으면 메모리 store 에 즉시 set 한다 — Remote 응답 전에', async () => {
    const range = yearRange(2025)
    await container.todo().saveTodos([todo('a', range.lower + 100)])
    await container.schedule().saveSchedules([schedule('s1', range.lower + 200)])

    let resolveTodos!: (v: Todo[]) => void
    const { todoApi, scheduleApi } = makeFakeApis()
    todoApi.getTodos.mockImplementation(() => new Promise<Todo[]>((r) => { resolveTodos = r }))
    scheduleApi.getSchedules.mockResolvedValue([])

    const repo = new EventRepository({
      todoApi: todoApi as any,
      scheduleApi: scheduleApi as any,
      localStorageContainer: container,
    })

    const fetchPromise = repo.fetchEventsForYear(2025)
    // cache-first read 가 비동기적 IDB 호출들 끝낼 때까지 polling — single setTimeout 은 CI 에서 flaky.
    // 사용자 관점: Remote 응답 전에 캐시 데이터가 메모리 store 에 보여야 한다.
    await vi.waitUntil(() => useCalendarEventsCache.getState().eventsByDate.size > 0, { timeout: 1000 })

    const state = useCalendarEventsCache.getState()
    expect(state.eventsByDate.size).toBeGreaterThan(0)

    resolveTodos([todo('a', range.lower + 100)])
    await fetchPromise
  })

  it('Remote 응답이 오면 LocalStorage 와 메모리 store 둘 다 그 응답으로 갱신된다', async () => {
    const range = yearRange(2025)
    const { todoApi, scheduleApi } = makeFakeApis()
    todoApi.getTodos.mockResolvedValue([todo('remote-1', range.lower + 500)])
    scheduleApi.getSchedules.mockResolvedValue([schedule('remote-s', range.lower + 600)])

    const repo = new EventRepository({
      todoApi: todoApi as any,
      scheduleApi: scheduleApi as any,
      localStorageContainer: container,
    })

    await repo.fetchEventsForYear(2025)

    const state = useCalendarEventsCache.getState()
    expect(state.loadedYears.has(2025)).toBe(true)
    const persistedTodos = await container.todo().loadTodos(range)
    expect(persistedTodos.map(t => t.uuid)).toContain('remote-1')
    const persistedSchedules = await container.schedule().loadSchedules(range)
    expect(persistedSchedules.map(s => s.uuid)).toContain('remote-s')
  })

  it('이미 loadedYears 에 있으면 short-circuit (이전 데이터 그대로 보임)', async () => {
    const { todoApi, scheduleApi } = makeFakeApis()
    todoApi.getTodos.mockResolvedValue([])
    scheduleApi.getSchedules.mockResolvedValue([])

    const repo = new EventRepository({
      todoApi: todoApi as any,
      scheduleApi: scheduleApi as any,
      localStorageContainer: container,
    })
    await repo.fetchEventsForYear(2025)
    expect(useCalendarEventsCache.getState().loadedYears.has(2025)).toBe(true)

    // 같은 year 재호출 — 메모리 store 의 그 해당 year 데이터는 변하지 않는다
    const beforeMap = useCalendarEventsCache.getState().eventsByDate
    await repo.fetchEventsForYear(2025)
    const afterMap = useCalendarEventsCache.getState().eventsByDate
    // user-observable: 데이터가 그대로 (새 fetch 없이)
    expect(afterMap).toBe(beforeMap)
  })

  it('cache-first 가 같은 year 에 두 번 호출돼도 중복 entry 가 누적되지 않는다 (replace 의미)', async () => {
    // given: LocalStorage 에 2025년 todo 1개
    const range = yearRange(2025)
    const cachedTodo = todo('cached-1', range.lower + 100)
    await container.todo().saveTodos([cachedTodo])

    // Remote 가 두 호출 모두에서 throw — cache-first 만이 메모리 store 의 유일한 writer 가 되도록
    // (Remote 성공 path 가 year keys 를 어차피 replace 하면 cache-first replace 버그가 가려지므로,
    //  Remote 가 항상 실패해야 cache-first 자체의 replace 의미가 검증됨)
    const { todoApi, scheduleApi } = makeFakeApis()
    todoApi.getTodos.mockRejectedValue(new Error('network'))
    scheduleApi.getSchedules.mockRejectedValue(new Error('network'))

    const repo = new EventRepository({
      todoApi: todoApi as any,
      scheduleApi: scheduleApi as any,
      localStorageContainer: container,
    })

    // First call — Remote fails after cache-first sets memory store. loadedYears 미설정 → 두번째 호출 가능
    await repo.fetchEventsForYear(2025)
    // Second call — cache-first 가 다시 한 번 set. replace 가 아니라 merge 였다면 여기서 중복 누적
    await repo.fetchEventsForYear(2025)

    // then: 메모리 store 의 해당 cached-1 uuid 가 1번만 등록 (중복 0)
    let totalForYear = 0
    for (const [key, events] of useCalendarEventsCache.getState().eventsByDate) {
      if (key.startsWith('2025')) {
        const cachedOnes = events.filter(e => e.event.uuid === 'cached-1').length
        totalForYear += cachedOnes
      }
    }
    expect(totalForYear).toBe(1)
  })

  it('localStorageContainer 가 없어도 Remote 만으로 동작한다 (호환성)', async () => {
    const range = yearRange(2025)
    const { todoApi, scheduleApi } = makeFakeApis()
    todoApi.getTodos.mockResolvedValue([todo('only-remote', range.lower + 100)])
    scheduleApi.getSchedules.mockResolvedValue([])

    const repo = new EventRepository({
      todoApi: todoApi as any,
      scheduleApi: scheduleApi as any,
    })

    await repo.fetchEventsForYear(2025)

    expect(useCalendarEventsCache.getState().loadedYears.has(2025)).toBe(true)
  })
})

describe('EventRepository.fetchCurrentTodos — cache-first', () => {
  let container: LocalStorageContainer

  beforeEach(async () => {
    container = new LocalStorageContainer()
    await container.init(TEST_UID)
    useCurrentTodosCache.getState().reset()
  })

  afterEach(async () => {
    await container.dispose()
    await deleteDb(TEST_UID)
    useCurrentTodosCache.getState().reset()
  })

  it('LocalStorage 캐시가 있으면 메모리 store 에 즉시 채우고, Remote 응답이 오면 그 값으로 교체한다', async () => {
    const cached: Todo = todo('cached-cur', 100, { is_current: true })
    await container.todo().saveTodos([cached])
    const { todoApi, scheduleApi } = makeFakeApis()
    todoApi.getCurrentTodos.mockResolvedValue([todo('remote-cur', 200, { is_current: true })])

    const repo = new EventRepository({
      todoApi: todoApi as any,
      scheduleApi: scheduleApi as any,
      localStorageContainer: container,
    })

    await repo.fetchCurrentTodos()

    expect(useCurrentTodosCache.getState().todos.map(t => t.uuid)).toEqual(['remote-cur'])
    expect((await container.todo().loadCurrentTodos()).map(t => t.uuid)).toContain('remote-cur')
  })

  it('LocalStorage 가 비어있어도 Remote 응답으로 정상 동작한다', async () => {
    const { todoApi, scheduleApi } = makeFakeApis()
    todoApi.getCurrentTodos.mockResolvedValue([todo('only-remote', 100, { is_current: true })])
    const repo = new EventRepository({
      todoApi: todoApi as any,
      scheduleApi: scheduleApi as any,
      localStorageContainer: container,
    })
    await repo.fetchCurrentTodos()
    expect(useCurrentTodosCache.getState().todos.map(t => t.uuid)).toEqual(['only-remote'])
  })
})

describe('EventRepository.fetchUncompletedTodos — cache-first', () => {
  let container: LocalStorageContainer

  beforeEach(async () => {
    container = new LocalStorageContainer()
    await container.init(TEST_UID)
    useUncompletedTodosCache.getState().reset()
  })

  afterEach(async () => {
    await container.dispose()
    await deleteDb(TEST_UID)
    useUncompletedTodosCache.getState().reset()
  })

  it('LocalStorage 의 미완료 todo (is_current=false, time<=now) 로 즉시 set 후 Remote 로 교체', async () => {
    const past = 100
    await container.todo().saveTodos([todo('past-uncomp', past, { is_current: false })])
    const { todoApi, scheduleApi } = makeFakeApis()
    todoApi.getUncompletedTodos.mockResolvedValue([todo('remote-uncomp', past + 1, { is_current: false })])

    const repo = new EventRepository({
      todoApi: todoApi as any,
      scheduleApi: scheduleApi as any,
      localStorageContainer: container,
    })
    await repo.fetchUncompletedTodos()

    expect(useUncompletedTodosCache.getState().todos.map(t => t.uuid)).toEqual(['remote-uncomp'])
  })
})
