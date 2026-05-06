import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { openLocalCacheDb } from '../../../src/repositories/local-storage/database'
import { DoneTodoLocalStorageIdb } from '../../../src/repositories/local-storage/DoneTodoLocalStorageIdb'
import type { IDBPDatabase } from 'idb'
import type { DoneTodo } from '../../../src/models/DoneTodo'

const TEST_UID = 'test-uid'

function doneFixture(overrides: Partial<DoneTodo> = {}): DoneTodo {
  return { uuid: 'd1', origin_event_id: 'o1', name: '완료', done_at: 1000, ...overrides } as DoneTodo
}

describe('DoneTodoLocalStorageIdb', () => {
  let db: IDBPDatabase
  let storage: DoneTodoLocalStorageIdb

  beforeEach(async () => {
    db = await openLocalCacheDb(TEST_UID)
    storage = new DoneTodoLocalStorageIdb(db)
  })

  afterEach(async () => {
    db.close()
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(`todocal-cache:${TEST_UID}`)
      req.onsuccess = req.onerror = req.onblocked = () => resolve()
    })
  })

  it('loadRecent 은 done_at 내림차순으로 limit 개 반환', async () => {
    await storage.saveDoneTodos([
      doneFixture({ uuid: 'a', done_at: 100 }),
      doneFixture({ uuid: 'b', done_at: 300 }),
      doneFixture({ uuid: 'c', done_at: 200 }),
    ])
    const result = await storage.loadRecent(2)
    expect(result.map((d) => d.uuid)).toEqual(['b', 'c'])
  })

  it('loadDoneTodo 단건 조회 / 없음 null', async () => {
    await storage.saveDoneTodos([doneFixture({ uuid: 'a' })])
    expect((await storage.loadDoneTodo('a'))?.uuid).toBe('a')
    expect(await storage.loadDoneTodo('missing')).toBeNull()
  })

  it('saveDoneTodos 는 동일 uuid 덮어쓰기', async () => {
    await storage.saveDoneTodos([doneFixture({ uuid: 'a', name: 'old' })])
    await storage.saveDoneTodos([doneFixture({ uuid: 'a', name: 'new' })])
    expect((await storage.loadDoneTodo('a'))?.name).toBe('new')
  })

  it('removeDoneTodos 는 지정 uuid 만 제거', async () => {
    await storage.saveDoneTodos([doneFixture({ uuid: 'a' }), doneFixture({ uuid: 'b' })])
    await storage.removeDoneTodos(['a'])
    expect(await storage.loadDoneTodo('a')).toBeNull()
    expect(await storage.loadDoneTodo('b')).not.toBeNull()
  })

  it('reset 은 전체 제거', async () => {
    await storage.saveDoneTodos([doneFixture({ uuid: 'a' }), doneFixture({ uuid: 'b' })])
    await storage.reset()
    expect((await storage.loadRecent(10))).toEqual([])
  })
})
