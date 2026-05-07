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

  it('invalidate 후 LocalStorage 에서도 제거된다 (C2)', async () => {
    // given: LocalStorage 에 저장된 상태
    const detail: EventDetail = { place: 'home', url: null, memo: 'cached' } as EventDetail
    await container.eventDetail().saveDetail('e-inv', detail)
    api.getEventDetail.mockResolvedValue({ place: 'remote', url: null, memo: 'remote' } as EventDetail)

    const repo = new EventDetailRepository({ api: api as any, localStorageContainer: container })

    // when: invalidate
    await repo.invalidate('e-inv')

    // then: LocalStorage 에서 제거됐는지 확인
    expect(await container.eventDetail().loadDetail('e-inv')).toBeNull()
  })

  it('get 도중 save 가 완료되면 bg refresh 가 stale Remote 로 덮어쓰지 않는다 (I1)', async () => {
    // given: LocalStorage 에 cached 값이 있어 bg refresh 가 시작되도록 설정
    const cachedDetail: EventDetail = { place: 'cached', url: null, memo: 'cached' } as EventDetail
    await container.eventDetail().saveDetail('e-race', cachedDetail)

    // bg refresh 가 완료되기 전에 save 가 먼저 끝나도록 bg refresh 를 지연
    let bgRefreshResolve!: () => void
    const remoteAfterBg: EventDetail = { place: 'remote-stale', url: null, memo: 'remote-stale' } as EventDetail
    api.getEventDetail.mockReturnValueOnce(
      new Promise<EventDetail>(resolve => { bgRefreshResolve = () => resolve(remoteAfterBg) })
    )
    const savedDetail: EventDetail = { place: 'saved-fresh', url: null, memo: 'saved-fresh' } as EventDetail
    api.updateEventDetail.mockResolvedValue(savedDetail)

    const repo = new EventDetailRepository({ api: api as any, localStorageContainer: container })

    // when: get 을 먼저 호출 (LocalStorage cache-hit → bg refresh 시작)
    const result = await repo.get('e-race')
    expect(result?.memo).toBe('cached')

    // save 완료 (generation bump)
    await repo.save('e-race', { memo: 'x' } as EventDetail)

    // 이제 bg refresh 완료시킴 (generation 이 올라간 상태라 적용되지 않아야 함)
    bgRefreshResolve()
    // bg refresh task 가 완료될 때까지 microtask 소진
    await new Promise(r => setTimeout(r, 10))

    // then: 여전히 save 응답값이 get 에서 반환됨 (stale Remote 로 덮어쓰지 않음)
    const afterRace = await repo.get('e-race')
    expect(afterRace?.memo).toBe('saved-fresh')
    // LocalStorage 에도 saved 값이 유지됨
    expect((await container.eventDetail().loadDetail('e-race'))?.memo).toBe('saved-fresh')
  })
})