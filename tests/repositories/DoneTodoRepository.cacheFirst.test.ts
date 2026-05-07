import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DoneTodoRepository } from '../../src/repositories/DoneTodoRepository'
import { LocalStorageContainer } from '../../src/repositories/local-storage/LocalStorageContainer'
import { useDoneTodosCache } from '../../src/repositories/caches/doneTodosCache'
import type { DoneTodo } from '../../src/models/DoneTodo'

const TEST_UID = 'done-cf'
async function deleteDb(uid: string) {
  await new Promise<void>((r) => { const req = indexedDB.deleteDatabase(`todocal-cache:${uid}`); req.onsuccess = req.onerror = req.onblocked = () => r() })
}

const doneFx = (uuid: string, done_at: number): DoneTodo => ({ uuid, origin_event_id: 'o-' + uuid, name: 'd-' + uuid, done_at } as DoneTodo)

describe('DoneTodoRepository.fetchNextPage — cache-first 첫 페이지', () => {
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

  it('첫 페이지 진입 시 LocalStorage recent 로 즉시 메모리 set, Remote 후 그 값으로 교체', async () => {
    await container.doneTodo().saveDoneTodos([doneFx('cached', 100)])
    doneApi.getDoneTodos.mockResolvedValue([doneFx('remote', 200)])

    const repo = new DoneTodoRepository({ api: doneApi as any, localStorageContainer: container })
    await repo.fetchNextPage()

    expect(useDoneTodosCache.getState().items.map(d => d.uuid)).toEqual(['remote'])
    const persisted = await container.doneTodo().loadRecent(10)
    expect(persisted.map(d => d.uuid)).toContain('remote')
  })

  it('두 번째 페이지 (cursor 있을 때) 는 cache-first 적용 안 함 (페이지 누적 의미상)', async () => {
    // 첫 페이지를 PAGE_SIZE(20)개로 채워야 hasMore=true → 두 번째 fetchNextPage 가 실행됨
    const page1 = Array.from({ length: 20 }, (_, i) => doneFx(`p1-${i}`, 2000 - i))
    doneApi.getDoneTodos.mockResolvedValueOnce(page1)
    const repo = new DoneTodoRepository({ api: doneApi as any, localStorageContainer: container })
    await repo.fetchNextPage()

    doneApi.getDoneTodos.mockResolvedValueOnce([doneFx('p2-a', 50)])
    await repo.fetchNextPage()

    const uuids = useDoneTodosCache.getState().items.map(d => d.uuid)
    expect(uuids).toContain('p1-0')
    expect(uuids).toContain('p2-a')
    expect(uuids).toHaveLength(21)
  })

  it('localStorageContainer 미주입이면 기존 동작 유지 (호환성)', async () => {
    doneApi.getDoneTodos.mockResolvedValue([doneFx('only-remote', 100)])
    const repo = new DoneTodoRepository({ api: doneApi as any })
    await repo.fetchNextPage()
    expect(useDoneTodosCache.getState().items.map(d => d.uuid)).toEqual(['only-remote'])
  })
})
