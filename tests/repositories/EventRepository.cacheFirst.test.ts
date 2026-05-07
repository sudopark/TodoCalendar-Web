import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EventRepository } from '../../src/repositories/EventRepository'
import { LocalStorageContainer } from '../../src/repositories/local-storage/LocalStorageContainer'
import { useCalendarEventsCache } from '../../src/repositories/caches/calendarEventsCache'
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
    // macro-task 로 cache 읽기 완료 대기 (fake-indexeddb 는 내부적으로 macro-task 로 IDB 이벤트 처리)
    await new Promise(r => setTimeout(r, 0))

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
