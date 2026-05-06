import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { openLocalCacheDb } from '../../../src/repositories/local-storage/database'
import { EventTagLocalStorageIdb } from '../../../src/repositories/local-storage/EventTagLocalStorageIdb'
import type { IDBPDatabase } from 'idb'
import type { EventTag } from '../../../src/models/EventTag'

const TEST_UID = 'test-uid'

function tagFixture(overrides: Partial<EventTag> = {}): EventTag {
  return { uuid: 't1', name: '태그', color_hex: '#ff0000', ...overrides }
}

describe('EventTagLocalStorageIdb', () => {
  let db: IDBPDatabase
  let storage: EventTagLocalStorageIdb

  beforeEach(async () => {
    db = await openLocalCacheDb(TEST_UID)
    storage = new EventTagLocalStorageIdb(db)
  })

  afterEach(async () => {
    db.close()
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(`todocal-cache:${TEST_UID}`)
      req.onsuccess = req.onerror = req.onblocked = () => resolve()
    })
  })

  it('저장한 tag 들을 loadAll 로 모두 가져온다', async () => {
    // given
    await storage.saveTags([tagFixture({ uuid: 'a' }), tagFixture({ uuid: 'b' })])
    // when
    const all = await storage.loadAll()
    // then
    expect(all.map((t) => t.uuid).sort()).toEqual(['a', 'b'])
  })

  it('빈 상태에서 loadAll 은 빈 배열을 반환한다', async () => {
    // when / then
    expect(await storage.loadAll()).toEqual([])
  })

  it('loadTag 는 uuid 매칭, 없으면 null', async () => {
    // given
    await storage.saveTags([tagFixture({ uuid: 'a', name: 'A' })])
    // when / then
    expect((await storage.loadTag('a'))?.name).toBe('A')
    expect(await storage.loadTag('missing')).toBeNull()
  })

  it('updateTag 는 동일 uuid 를 덮어쓴다', async () => {
    // given
    await storage.saveTags([tagFixture({ uuid: 'a', name: 'old' })])
    // when
    await storage.updateTag(tagFixture({ uuid: 'a', name: 'new' }))
    // then
    expect((await storage.loadTag('a'))?.name).toBe('new')
  })

  it('removeTag 는 단건 제거', async () => {
    // given
    await storage.saveTags([tagFixture({ uuid: 'a' }), tagFixture({ uuid: 'b' })])
    // when
    await storage.removeTag('a')
    // then
    expect(await storage.loadTag('a')).toBeNull()
    expect(await storage.loadTag('b')).not.toBeNull()
  })

  it('reset 은 전체 제거', async () => {
    // given
    await storage.saveTags([tagFixture({ uuid: 'a' }), tagFixture({ uuid: 'b' })])
    // when
    await storage.reset()
    // then
    expect(await storage.loadAll()).toEqual([])
  })
})
