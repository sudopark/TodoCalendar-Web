import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TagRepository } from '../../src/repositories/TagRepository'
import { LocalStorageContainer } from '../../src/repositories/local-storage/LocalStorageContainer'
import { useEventTagListCache } from '../../src/repositories/caches/eventTagListCache'
import { useCalendarEventsCache } from '../../src/repositories/caches/calendarEventsCache'
import { useCurrentTodosCache } from '../../src/repositories/caches/currentTodosCache'
import { useUncompletedTodosCache } from '../../src/repositories/caches/uncompletedTodosCache'
import type { EventTag } from '../../src/models/EventTag'
import type { Todo } from '../../src/models/Todo'
import type { EventRepository } from '../../src/repositories/EventRepository'

const TEST_UID = 'tag-cf'

const tagFx = (uuid: string, name: string): EventTag => ({ uuid, name, color_hex: '#ff0000' } as EventTag)

async function deleteDb(uid: string) {
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(`todocal-cache:${uid}`)
    req.onsuccess = req.onerror = req.onblocked = () => resolve()
  })
}

function makeFakeApis() {
  return {
    eventTagApi: {
      getAllTags: vi.fn(),
      createTag: vi.fn(), updateTag: vi.fn(), deleteTag: vi.fn(), deleteTagAndEvents: vi.fn(),
    },
    settingApi: {
      getDefaultTagColors: vi.fn().mockResolvedValue(null),
      updateDefaultTagColors: vi.fn(),
    },
  }
}

describe('TagRepository.fetchAll — cache-first', () => {
  let container: LocalStorageContainer

  beforeEach(async () => {
    container = new LocalStorageContainer()
    await container.init(TEST_UID)
    useEventTagListCache.getState().reset()
  })

  afterEach(async () => {
    await container.dispose()
    await deleteDb(TEST_UID)
    useEventTagListCache.getState().reset()
  })

  it('LocalStorage 의 tag 들로 즉시 메모리 set, Remote 응답 후 그 값으로 교체', async () => {
    await container.eventTag().saveTags([tagFx('cached', 'CACHED')])
    const { eventTagApi, settingApi } = makeFakeApis()
    eventTagApi.getAllTags.mockResolvedValue([tagFx('remote', 'REMOTE')])

    const repo = new TagRepository({
      eventTagApi: eventTagApi as any,
      settingApi: settingApi as any,
      localStorageContainer: container,
    })
    await repo.fetchAll()

    expect(Array.from(useEventTagListCache.getState().tags.values()).map(t => t.uuid)).toEqual(['remote'])
    expect((await container.eventTag().loadAll()).map(t => t.uuid)).toContain('remote')
  })

  it('LocalStorage 비어있을 때 Remote 응답만으로 동작', async () => {
    const { eventTagApi, settingApi } = makeFakeApis()
    eventTagApi.getAllTags.mockResolvedValue([tagFx('a', 'A')])
    const repo = new TagRepository({
      eventTagApi: eventTagApi as any,
      settingApi: settingApi as any,
      localStorageContainer: container,
    })
    await repo.fetchAll()
    expect(useEventTagListCache.getState().tags.size).toBe(1)
  })

  it('localStorageContainer 미주입이면 Remote 만으로 동작 (호환성)', async () => {
    const { eventTagApi, settingApi } = makeFakeApis()
    eventTagApi.getAllTags.mockResolvedValue([tagFx('only-remote', 'X')])
    const repo = new TagRepository({
      eventTagApi: eventTagApi as any,
      settingApi: settingApi as any,
    })
    await repo.fetchAll()
    expect(useEventTagListCache.getState().tags.size).toBe(1)
  })
})

const makeTodo = (uuid: string, event_tag_id?: string | null): Todo => ({
  uuid, name: `todo-${uuid}`, is_current: true, event_time: null, event_tag_id: event_tag_id ?? null,
})

describe('TagRepository.deleteTagAndEvents — cascading invalidate', () => {
  let container: LocalStorageContainer

  beforeEach(async () => {
    container = new LocalStorageContainer()
    await container.init(TEST_UID)
    useEventTagListCache.getState().reset()
    useCalendarEventsCache.getState().reset()
    useCurrentTodosCache.getState().reset()
    useUncompletedTodosCache.getState().reset()
  })

  afterEach(async () => {
    await container.dispose()
    await deleteDb(TEST_UID)
    useEventTagListCache.getState().reset()
    useCalendarEventsCache.getState().reset()
    useCurrentTodosCache.getState().reset()
    useUncompletedTodosCache.getState().reset()
  })

  it('deleteTagAndEvents 호출 후 calendarEventsCache 의 loadedYears 가 invalidate 되고 재fetch 된다', async () => {
    // given: calendar events cache 에 2025/2026 두 해가 로드된 상태
    useCalendarEventsCache.setState({ loadedYears: new Set([2025, 2026]) })

    const { eventTagApi, settingApi } = makeFakeApis()
    eventTagApi.deleteTagAndEvents.mockResolvedValue({ status: 'ok' })

    const fetchedYears: number[] = []
    const eventRepo = {
      fetchEventsForYear: vi.fn((y: number) => { fetchedYears.push(y); return Promise.resolve() }),
      fetchCurrentTodos: vi.fn().mockResolvedValue(undefined),
      fetchUncompletedTodos: vi.fn().mockResolvedValue(undefined),
    } as unknown as EventRepository

    const repo = new TagRepository({
      eventTagApi: eventTagApi as any,
      settingApi: settingApi as any,
      localStorageContainer: container,
      eventRepo,
    })

    // when
    await repo.deleteTagAndEvents('tag-1')

    // then: calendar events cache 의 loadedYears invalidate 됨
    expect(useCalendarEventsCache.getState().loadedYears.has(2025)).toBe(false)
    expect(useCalendarEventsCache.getState().loadedYears.has(2026)).toBe(false)
    // 두 해 모두에 대해 fetchEventsForYear 재fetch
    expect(fetchedYears).toContain(2025)
    expect(fetchedYears).toContain(2026)
  })

  it('deleteTagAndEvents 호출 시 태그를 가진 todo 가 currentTodosCache/uncompletedTodosCache 에서 즉시 제거된다', async () => {
    // given
    useCurrentTodosCache.setState({ todos: [makeTodo('c1', 'tag-del'), makeTodo('c2', 'other')] })
    useUncompletedTodosCache.setState({ todos: [makeTodo('u1', 'tag-del'), makeTodo('u2', 'other')] })

    const { eventTagApi, settingApi } = makeFakeApis()
    eventTagApi.deleteTagAndEvents.mockResolvedValue({ status: 'ok' })

    const repo = new TagRepository({
      eventTagApi: eventTagApi as any,
      settingApi: settingApi as any,
      localStorageContainer: container,
    })

    // when
    await repo.deleteTagAndEvents('tag-del')

    // then: 삭제된 태그를 가진 todo 만 제거, 나머지는 유지
    expect(useCurrentTodosCache.getState().todos.some(t => t.uuid === 'c1')).toBe(false)
    expect(useCurrentTodosCache.getState().todos.some(t => t.uuid === 'c2')).toBe(true)
    expect(useUncompletedTodosCache.getState().todos.some(t => t.uuid === 'u1')).toBe(false)
    expect(useUncompletedTodosCache.getState().todos.some(t => t.uuid === 'u2')).toBe(true)
  })

  it('eventRepo 미주입 시 cascade 없이 정상 동작 (호환성)', async () => {
    // given
    const { eventTagApi, settingApi } = makeFakeApis()
    eventTagApi.deleteTagAndEvents.mockResolvedValue({ status: 'ok' })

    const repo = new TagRepository({
      eventTagApi: eventTagApi as any,
      settingApi: settingApi as any,
      localStorageContainer: container,
    })

    // when / then: 예외 없이 resolve
    await expect(repo.deleteTagAndEvents('tag-1')).resolves.toBeUndefined()
  })
})
