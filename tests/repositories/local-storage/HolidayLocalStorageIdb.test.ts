import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { openLocalCacheDb } from '../../../src/repositories/local-storage/database'
import { HolidayLocalStorageIdb } from '../../../src/repositories/local-storage/HolidayLocalStorageIdb'
import type { IDBPDatabase } from 'idb'
import type { HolidayItem } from '../../../src/models/Holiday'

const TEST_UID = 'test-uid'

const sample: HolidayItem[] = [
  { summary: '신정', start: { date: '2025-01-01' }, end: { date: '2025-01-02' } },
  { summary: '삼일절', start: { date: '2025-03-01' }, end: { date: '2025-03-02' } },
]

describe('HolidayLocalStorageIdb', () => {
  let db: IDBPDatabase
  let storage: HolidayLocalStorageIdb

  beforeEach(async () => {
    db = await openLocalCacheDb(TEST_UID)
    storage = new HolidayLocalStorageIdb(db)
  })

  afterEach(async () => {
    db.close()
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(`todocal-cache:${TEST_UID}`)
      req.onsuccess = req.onerror = req.onblocked = () => resolve()
    })
  })

  it('빈 상태에서 loadYear 는 null', async () => {
    expect(await storage.loadYear(2025)).toBeNull()
  })

  it('saveYear 후 loadYear 라운드트립', async () => {
    await storage.saveYear(2025, sample)
    expect(await storage.loadYear(2025)).toEqual(sample)
  })

  it('saveYear 는 동일 year 를 덮어쓴다', async () => {
    await storage.saveYear(2025, [sample[0]])
    await storage.saveYear(2025, sample)
    expect(await storage.loadYear(2025)).toEqual(sample)
  })

  it('remove 후 loadYear 는 null', async () => {
    await storage.saveYear(2025, sample)
    await storage.remove(2025)
    expect(await storage.loadYear(2025)).toBeNull()
  })

  it('reset 은 모든 year 제거', async () => {
    await storage.saveYear(2025, sample)
    await storage.saveYear(2026, sample)
    await storage.reset()
    expect(await storage.loadYear(2025)).toBeNull()
    expect(await storage.loadYear(2026)).toBeNull()
  })
})
