import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TagRepository } from '../../src/repositories/TagRepository'
import { LocalStorageContainer } from '../../src/repositories/local-storage/LocalStorageContainer'
import { useEventTagListCache } from '../../src/repositories/caches/eventTagListCache'
import type { EventTag } from '../../src/models/EventTag'

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
