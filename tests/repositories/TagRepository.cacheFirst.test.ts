import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TagRepository } from '../../src/repositories/TagRepository'
import { LocalStorageContainer } from '../../src/repositories/local-storage/LocalStorageContainer'
import { useEventTagListCache } from '../../src/repositories/caches/eventTagListCache'
import { useCalendarEventsCache } from '../../src/repositories/caches/calendarEventsCache'
import type { EventTag } from '../../src/models/EventTag'
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

describe('TagRepository.deleteTagAndEvents — cascading invalidate', () => {
  let container: LocalStorageContainer

  beforeEach(async () => {
    container = new LocalStorageContainer()
    await container.init(TEST_UID)
    useEventTagListCache.getState().reset()
    useCalendarEventsCache.getState().reset()
  })

  afterEach(async () => {
    await container.dispose()
    await deleteDb(TEST_UID)
    useEventTagListCache.getState().reset()
    useCalendarEventsCache.getState().reset()
  })

  it('deleteTagAndEvents 호출 후 loadedYears 각각에 대해 fetchEventsForYear, fetchCurrentTodos, fetchUncompletedTodos 가 호출된다', async () => {
    // given: calendar events cache 에 2025/2026 두 해가 로드된 상태
    useCalendarEventsCache.setState({ loadedYears: new Set([2025, 2026]) })

    const { eventTagApi, settingApi } = makeFakeApis()
    eventTagApi.deleteTagAndEvents.mockResolvedValue({ status: 'ok' })

    const fetchYear = vi.fn().mockResolvedValue(undefined)
    const fetchCurrent = vi.fn().mockResolvedValue(undefined)
    const fetchUncompleted = vi.fn().mockResolvedValue(undefined)
    const eventRepo = {
      fetchEventsForYear: fetchYear,
      fetchCurrentTodos: fetchCurrent,
      fetchUncompletedTodos: fetchUncompleted,
    } as unknown as EventRepository

    const repo = new TagRepository({
      eventTagApi: eventTagApi as any,
      settingApi: settingApi as any,
      localStorageContainer: container,
      eventRepo,
    })

    // when
    await repo.deleteTagAndEvents('tag-1')

    // then: 두 해 모두에 대해 fetchEventsForYear 호출, current/uncompleted 도 재fetch
    expect(fetchYear).toHaveBeenCalledWith(2025)
    expect(fetchYear).toHaveBeenCalledWith(2026)
    expect(fetchCurrent).toHaveBeenCalled()
    expect(fetchUncompleted).toHaveBeenCalled()
    // calendar events cache 의 loadedYears 도 invalidate 됨
    expect(useCalendarEventsCache.getState().loadedYears.has(2025)).toBe(false)
    expect(useCalendarEventsCache.getState().loadedYears.has(2026)).toBe(false)
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
