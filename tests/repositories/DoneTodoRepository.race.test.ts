import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DoneTodoRepository } from '../../src/repositories/DoneTodoRepository'
import { LocalStorageContainer } from '../../src/repositories/local-storage/LocalStorageContainer'
import { useDoneTodosCache } from '../../src/repositories/caches/doneTodosCache'
import type { DoneTodo } from '../../src/models/DoneTodo'

const TEST_UID = 'done-race'
async function deleteDb(uid: string) {
  await new Promise<void>((r) => {
    const req = indexedDB.deleteDatabase(`todocal-cache:${uid}`)
    req.onsuccess = req.onerror = req.onblocked = () => r()
  })
}

const doneOf = (uuid: string, done_at = 1000): DoneTodo =>
  ({ uuid, origin_event_id: 'o-' + uuid, name: 'd-' + uuid, done_at } as DoneTodo)

describe('DoneTodoRepository.fetchNextPage — generation 보호 (race condition)', () => {
  let container: LocalStorageContainer
  let doneApi: { getDoneTodos: ReturnType<typeof vi.fn>; deleteDoneTodo: ReturnType<typeof vi.fn>; revertDoneTodo: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    container = new LocalStorageContainer()
    await container.init(TEST_UID)
    useDoneTodosCache.getState().reset()
    doneApi = { getDoneTodos: vi.fn(), deleteDoneTodo: vi.fn(), revertDoneTodo: vi.fn() }
  })

  afterEach(async () => {
    await container.dispose()
    await deleteDb(TEST_UID)
    useDoneTodosCache.getState().reset()
  })

  it('fetchNextPage 도중 removeItem 이 일어나면 stale 응답이 무시된다 (C1.1)', async () => {
    // given: LocalStorage 에 기존 항목 저장
    await container.doneTodo().saveDoneTodos([doneOf('d-existing')])

    // Remote 가 응답 대기 상태로 고정 — 'd-stale' 을 반환 예정
    const fetchedItems = [doneOf('d-stale')]
    let resolveFetch!: (v: DoneTodo[]) => void
    doneApi.getDoneTodos.mockImplementation(
      () => new Promise<DoneTodo[]>(r => { resolveFetch = r })
    )

    const repo = new DoneTodoRepository({ api: doneApi as any, localStorageContainer: container })

    // when: fetchNextPage 시작 — Remote 응답 대기 중
    const fetchPromise = repo.fetchNextPage()
    // cache-first 단계(LocalStorage read)가 완료될 때까지 대기
    await new Promise(r => setTimeout(r, 20))

    // 그 사이 removeItem 으로 generation bump
    useDoneTodosCache.getState().removeItem('d-existing')

    // 이제 Remote 응답 도착
    resolveFetch(fetchedItems)
    await fetchPromise

    // then: stale 응답이 무시되어 'd-stale' 이 메모리에 없음
    const items = useDoneTodosCache.getState().items
    expect(items.find(i => i.uuid === 'd-stale')).toBeUndefined()
  })

  it('fetchNextPage 도중 reset 이 일어나면 stale 응답이 무시된다 (C1.1 — reset 경로)', async () => {
    // given: Remote 응답 대기 상태
    const fetchedItems = [doneOf('d-from-server')]
    let resolveFetch!: (v: DoneTodo[]) => void
    doneApi.getDoneTodos.mockImplementation(
      () => new Promise<DoneTodo[]>(r => { resolveFetch = r })
    )

    const repo = new DoneTodoRepository({ api: doneApi as any, localStorageContainer: container })

    // when: fetchNextPage 시작
    const fetchPromise = repo.fetchNextPage()
    await new Promise(r => setTimeout(r, 20))

    // 진행 중에 reset (generation bump)
    useDoneTodosCache.getState().reset()

    // Remote 응답 도착
    resolveFetch(fetchedItems)
    await fetchPromise

    // then: stale 응답이 무시됨
    const items = useDoneTodosCache.getState().items
    expect(items.find(i => i.uuid === 'd-from-server')).toBeUndefined()
  })
})
