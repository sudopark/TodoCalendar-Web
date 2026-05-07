import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EventDetailRepository } from '../../src/repositories/EventDetailRepository'
import { LocalStorageContainer } from '../../src/repositories/local-storage/LocalStorageContainer'
import type { EventDetail } from '../../src/models/EventDetail'

const TEST_UID = 'detail-write'
async function deleteDb(uid: string) {
  await new Promise<void>((r) => {
    const req = indexedDB.deleteDatabase(`todocal-cache:${uid}`)
    req.onsuccess = req.onerror = req.onblocked = () => r()
  })
}

describe('EventDetailRepository — read cache-first + write sync', () => {
  let container: LocalStorageContainer
  let api: { getEventDetail: ReturnType<typeof vi.fn>; updateEventDetail: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    container = new LocalStorageContainer()
    await container.init(TEST_UID)
    api = { getEventDetail: vi.fn(), updateEventDetail: vi.fn() }
  })

  afterEach(async () => {
    await container.dispose()
    await deleteDb(TEST_UID)
  })

  it('get 은 LocalStorage 의 cached 가 있으면 그것을 즉시 반환 (cache-hit)', async () => {
    const cached: EventDetail = { place: 'home', url: null, memo: 'cached' } as EventDetail
    await container.eventDetail().saveDetail('e-1', cached)
    api.getEventDetail.mockResolvedValue({ place: 'remote', url: null, memo: 'remote' } as EventDetail)

    const repo = new EventDetailRepository({ api: api as any, localStorageContainer: container })
    const result = await repo.get('e-1')

    expect(result?.memo).toBe('cached')
  })

  it('cache miss 면 Remote 만으로 동작', async () => {
    api.getEventDetail.mockResolvedValue({ place: 'remote', url: null, memo: 'remote' } as EventDetail)

    const repo = new EventDetailRepository({ api: api as any, localStorageContainer: container })
    const result = await repo.get('e-1')

    expect(result?.memo).toBe('remote')
    expect((await container.eventDetail().loadDetail('e-1'))?.memo).toBe('remote')
  })

  it('save 응답값이 LocalStorage 에 저장된다', async () => {
    const detail: EventDetail = { place: 'a', url: null, memo: 'm' } as EventDetail
    api.updateEventDetail.mockResolvedValue(detail)

    const repo = new EventDetailRepository({ api: api as any, localStorageContainer: container })
    await repo.save('e-1', detail)

    expect((await container.eventDetail().loadDetail('e-1'))?.place).toBe('a')
  })

  it('localStorageContainer 미주입 호환성', async () => {
    api.getEventDetail.mockResolvedValue({ place: 'r', url: null, memo: 'r' } as EventDetail)

    const repo = new EventDetailRepository({ api: api as any })
    const result = await repo.get('e-1')

    expect(result?.memo).toBe('r')
  })
})