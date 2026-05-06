import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { openLocalCacheDb } from '../../../src/repositories/local-storage/database'
import { EventDetailLocalStorageIdb } from '../../../src/repositories/local-storage/EventDetailLocalStorageIdb'
import type { IDBPDatabase } from 'idb'
import type { EventDetail } from '../../../src/models/EventDetail'

const TEST_UID = 'test-uid'

describe('EventDetailLocalStorageIdb', () => {
  let db: IDBPDatabase
  let storage: EventDetailLocalStorageIdb

  beforeEach(async () => {
    db = await openLocalCacheDb(TEST_UID)
    storage = new EventDetailLocalStorageIdb(db)
  })

  afterEach(async () => {
    db.close()
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(`todocal-cache:${TEST_UID}`)
      req.onsuccess = req.onerror = req.onblocked = () => resolve()
    })
  })

  it('saveDetail / loadDetail 라운드트립', async () => {
    // given
    const detail: EventDetail = { place: 'home', url: null, memo: '메모' }
    // when
    await storage.saveDetail('e-1', detail)
    // then
    expect(await storage.loadDetail('e-1')).toEqual(detail)
  })

  it('없는 event_id 는 null 반환', async () => {
    // given / when / then
    expect(await storage.loadDetail('missing')).toBeNull()
  })

  it('saveDetail 은 동일 event_id 를 덮어쓴다', async () => {
    // given
    await storage.saveDetail('e-1', { place: 'a', url: null, memo: null })
    // when
    await storage.saveDetail('e-1', { place: 'b', url: null, memo: null })
    // then
    expect((await storage.loadDetail('e-1'))?.place).toBe('b')
  })

  it('removeDetail 단건 제거', async () => {
    // given
    await storage.saveDetail('e-1', { place: 'a', url: null, memo: null })
    // when
    await storage.removeDetail('e-1')
    // then
    expect(await storage.loadDetail('e-1')).toBeNull()
  })

  it('reset 은 모든 detail 제거', async () => {
    // given
    await storage.saveDetail('e-1', { place: 'a', url: null, memo: null })
    await storage.saveDetail('e-2', { place: 'b', url: null, memo: null })
    // when
    await storage.reset()
    // then
    expect(await storage.loadDetail('e-1')).toBeNull()
    expect(await storage.loadDetail('e-2')).toBeNull()
  })
})
