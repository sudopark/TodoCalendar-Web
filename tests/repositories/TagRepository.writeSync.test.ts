import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TagRepository } from '../../src/repositories/TagRepository'
import { LocalStorageContainer } from '../../src/repositories/local-storage/LocalStorageContainer'
import { useEventTagListCache } from '../../src/repositories/caches/eventTagListCache'
import type { EventTag } from '../../src/models/EventTag'

const TEST_UID = 'tag-write-sync'
const tagOf = (uuid: string, name: string): EventTag => ({ uuid, name, color_hex: '#fff' } as EventTag)
async function deleteDb(uid: string) {
  await new Promise<void>((r) => {
    const req = indexedDB.deleteDatabase(`todocal-cache:${uid}`)
    req.onsuccess = req.onerror = req.onblocked = () => r()
  })
}

function makeFakeApis() {
  return {
    eventTagApi: {
      getAllTags: vi.fn().mockResolvedValue([]),
      createTag: vi.fn(), updateTag: vi.fn(),
      deleteTag: vi.fn(), deleteTagAndEvents: vi.fn(),
    },
    settingApi: {
      getDefaultTagColors: vi.fn().mockResolvedValue(null),
      updateDefaultTagColors: vi.fn(),
    },
  }
}

describe('TagRepository — mutation LocalStorage write sync', () => {
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

  it('createTag 응답값이 LocalStorage 에 저장된다', async () => {
    const created = tagOf('t-1', 'NEW')
    const { eventTagApi, settingApi } = makeFakeApis()
    eventTagApi.createTag.mockResolvedValue(created)

    const repo = new TagRepository({
      eventTagApi: eventTagApi as any,
      settingApi: settingApi as any,
      localStorageContainer: container,
    })
    await repo.createTag('NEW', '#fff')

    expect(await container.eventTag().loadTag('t-1')).toEqual(created)
  })

  it('updateTag 응답값이 LocalStorage 의 동일 uuid 를 덮어쓴다', async () => {
    const existing = tagOf('a', 'OLD')
    await container.eventTag().saveTags([existing])
    useEventTagListCache.getState().replaceAll([existing], null)

    const updated = tagOf('a', 'NEW')
    const { eventTagApi, settingApi } = makeFakeApis()
    eventTagApi.updateTag.mockResolvedValue(updated)

    const repo = new TagRepository({
      eventTagApi: eventTagApi as any,
      settingApi: settingApi as any,
      localStorageContainer: container,
    })
    await repo.updateTag('a', { name: 'NEW' })

    expect((await container.eventTag().loadTag('a'))?.name).toBe('NEW')
  })

  it('deleteTag 응답 후 LocalStorage 에서도 제거된다', async () => {
    await container.eventTag().saveTags([tagOf('a', 'A')])
    const { eventTagApi, settingApi } = makeFakeApis()
    eventTagApi.deleteTag.mockResolvedValue({ status: 'ok' })

    const repo = new TagRepository({
      eventTagApi: eventTagApi as any,
      settingApi: settingApi as any,
      localStorageContainer: container,
    })
    await repo.deleteTag('a')

    expect(await container.eventTag().loadTag('a')).toBeNull()
  })

  it('localStorageContainer 미주입 호환성', async () => {
    const created = tagOf('a', 'A')
    const { eventTagApi, settingApi } = makeFakeApis()
    eventTagApi.createTag.mockResolvedValue(created)

    const repo = new TagRepository({
      eventTagApi: eventTagApi as any,
      settingApi: settingApi as any,
    })
    await expect(repo.createTag('A', '#fff')).resolves.toEqual(created)
  })
})