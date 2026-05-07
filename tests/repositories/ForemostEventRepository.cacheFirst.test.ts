import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ForemostEventRepository } from '../../src/repositories/ForemostEventRepository'
import { LocalStorageContainer } from '../../src/repositories/local-storage/LocalStorageContainer'
import { useForemostEventCache } from '../../src/repositories/caches/foremostEventCache'
import type { ForemostEvent } from '../../src/models'

const TEST_UID = 'fm-cf'
async function deleteDb(uid: string) {
  await new Promise<void>((r) => { const req = indexedDB.deleteDatabase(`todocal-cache:${uid}`); req.onsuccess = req.onerror = req.onblocked = () => r() })
}

describe('ForemostEventRepository.fetch — cache-first', () => {
  let container: LocalStorageContainer
  let foremostApi: { getForemostEvent: ReturnType<typeof vi.fn>; [k: string]: unknown }

  beforeEach(async () => {
    container = new LocalStorageContainer()
    await container.init(TEST_UID)
    useForemostEventCache.getState().reset()
    foremostApi = { getForemostEvent: vi.fn(), setForemostEvent: vi.fn(), removeForemostEvent: vi.fn() }
  })

  afterEach(async () => {
    await container.dispose()
    await deleteDb(TEST_UID)
    useForemostEventCache.getState().reset()
  })

  it('LocalStorage 의 foremost 로 즉시 set, Remote 응답 후 그 값으로 교체', async () => {
    const cached: ForemostEvent = { event_id: 'cached', is_todo: true } as ForemostEvent
    const remote: ForemostEvent = { event_id: 'remote', is_todo: false } as ForemostEvent
    await container.foremost().save(cached)
    foremostApi.getForemostEvent.mockResolvedValue(remote)

    const repo = new ForemostEventRepository({ api: foremostApi as any, localStorageContainer: container })
    await repo.fetch()

    expect(useForemostEventCache.getState().foremostEvent?.event_id).toBe('remote')
    expect((await container.foremost().load())?.event_id).toBe('remote')
  })

  it('LocalStorage 비었을 때 Remote 만으로 동작', async () => {
    foremostApi.getForemostEvent.mockResolvedValue({ event_id: 'r', is_todo: true } as ForemostEvent)
    const repo = new ForemostEventRepository({ api: foremostApi as any, localStorageContainer: container })
    await repo.fetch()
    expect(useForemostEventCache.getState().foremostEvent?.event_id).toBe('r')
  })

  it('Remote 가 throw 하면 메모리는 null, LocalStorage 의 cached 는 보존', async () => {
    const cached: ForemostEvent = { event_id: 'cached', is_todo: true } as ForemostEvent
    await container.foremost().save(cached)
    foremostApi.getForemostEvent.mockRejectedValue(new Error('boom'))

    const repo = new ForemostEventRepository({ api: foremostApi as any, localStorageContainer: container })
    await repo.fetch()
    expect(useForemostEventCache.getState().foremostEvent).toBeNull()
    expect((await container.foremost().load())?.event_id).toBe('cached')
  })

  it('localStorageContainer 미주입이면 Remote 만 (호환성)', async () => {
    foremostApi.getForemostEvent.mockResolvedValue({ event_id: 'r', is_todo: true } as ForemostEvent)
    const repo = new ForemostEventRepository({ api: foremostApi as any })
    await repo.fetch()
    expect(useForemostEventCache.getState().foremostEvent?.event_id).toBe('r')
  })
})
