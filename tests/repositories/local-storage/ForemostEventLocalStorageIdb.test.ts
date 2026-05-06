import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { openLocalCacheDb } from '../../../src/repositories/local-storage/database'
import { ForemostEventLocalStorageIdb } from '../../../src/repositories/local-storage/ForemostEventLocalStorageIdb'
import type { IDBPDatabase } from 'idb'
import type { ForemostEvent } from '../../../src/models/ForemostEvent'

const TEST_UID = 'test-uid'

describe('ForemostEventLocalStorageIdb', () => {
  let db: IDBPDatabase
  let storage: ForemostEventLocalStorageIdb

  beforeEach(async () => {
    db = await openLocalCacheDb(TEST_UID)
    storage = new ForemostEventLocalStorageIdb(db)
  })

  afterEach(async () => {
    db.close()
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(`todocal-cache:${TEST_UID}`)
      req.onsuccess = req.onerror = req.onblocked = () => resolve()
    })
  })

  it('빈 상태에서 load 는 null', async () => {
    // given: 빈 DB
    // when
    const result = await storage.load()
    // then
    expect(result).toBeNull()
  })

  it('save 후 load 라운드트립', async () => {
    // given
    const ev: ForemostEvent = { event_id: 'fm-1', is_todo: true }
    // when
    await storage.save(ev)
    // then
    expect(await storage.load()).toEqual(ev)
  })

  it('save 두 번이면 마지막 값으로 덮어쓴다', async () => {
    // given
    await storage.save({ event_id: 'a', is_todo: true })
    // when
    await storage.save({ event_id: 'b', is_todo: false })
    // then
    expect((await storage.load())?.event_id).toBe('b')
  })

  it('remove 후 load 는 null', async () => {
    // given
    await storage.save({ event_id: 'a', is_todo: true })
    // when
    await storage.remove()
    // then
    expect(await storage.load()).toBeNull()
  })

  it('reset 은 remove 와 동일', async () => {
    // given
    await storage.save({ event_id: 'a', is_todo: true })
    // when
    await storage.reset()
    // then
    expect(await storage.load()).toBeNull()
  })
})
