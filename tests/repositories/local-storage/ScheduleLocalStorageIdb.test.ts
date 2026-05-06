import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { openLocalCacheDb } from '../../../src/repositories/local-storage/database'
import { ScheduleLocalStorageIdb } from '../../../src/repositories/local-storage/ScheduleLocalStorageIdb'
import type { IDBPDatabase } from 'idb'
import type { Schedule } from '../../../src/models/Schedule'

const TEST_UID = 'test-uid'

function scheduleFixture(overrides: Partial<Schedule> = {}): Schedule {
  return {
    uuid: 'sched-1',
    name: '테스트 일정',
    event_tag_id: null,
    event_time: { time_type: 'at', timestamp: 1746000000 },
    repeating: null,
    notification_options: null,
    ...overrides,
  } as Schedule
}

describe('ScheduleLocalStorageIdb', () => {
  let db: IDBPDatabase
  let storage: ScheduleLocalStorageIdb

  beforeEach(async () => {
    db = await openLocalCacheDb(TEST_UID)
    storage = new ScheduleLocalStorageIdb(db)
  })

  afterEach(async () => {
    db.close()
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(`todocal-cache:${TEST_UID}`)
      req.onsuccess = () => resolve()
      req.onerror = () => resolve()
      req.onblocked = () => resolve()
    })
  })

  it('저장한 schedule 을 uuid 로 조회할 수 있다', async () => {
    const sched = scheduleFixture({ uuid: 'a', name: 'first' })
    await storage.saveSchedules([sched])
    expect(await storage.loadSchedule('a')).toEqual(sched)
  })

  it('없는 uuid 조회 시 null 반환', async () => {
    expect(await storage.loadSchedule('missing')).toBeNull()
  })

  it('event_time.timestamp 범위 안의 schedule 만 반환한다', async () => {
    await storage.saveSchedules([
      scheduleFixture({ uuid: 'a', event_time: { time_type: 'at', timestamp: 100 } }),
      scheduleFixture({ uuid: 'b', event_time: { time_type: 'at', timestamp: 200 } }),
      scheduleFixture({ uuid: 'c', event_time: { time_type: 'at', timestamp: 300 } }),
    ])
    const result = await storage.loadSchedules({ lower: 150, upper: 250 })
    expect(result.map((s) => s.uuid)).toEqual(['b'])
  })

  it('updateSchedule 은 동일 uuid 를 덮어쓴다', async () => {
    await storage.saveSchedules([scheduleFixture({ uuid: 'a', name: 'old' })])
    await storage.updateSchedule(scheduleFixture({ uuid: 'a', name: 'new' }))
    expect((await storage.loadSchedule('a'))?.name).toBe('new')
  })

  it('removeSchedules 는 지정 uuid 만 제거한다', async () => {
    await storage.saveSchedules([
      scheduleFixture({ uuid: 'a' }),
      scheduleFixture({ uuid: 'b' }),
    ])
    await storage.removeSchedules(['a'])
    expect(await storage.loadSchedule('a')).toBeNull()
    expect(await storage.loadSchedule('b')).not.toBeNull()
  })

  it('removeSchedulesWith 는 tagId 가 붙은 schedule 을 제거하고 uuid 목록을 반환한다', async () => {
    await storage.saveSchedules([
      scheduleFixture({ uuid: 'a', event_tag_id: 'tag-1' }),
      scheduleFixture({ uuid: 'b', event_tag_id: 'tag-2' }),
    ])
    const removed = await storage.removeSchedulesWith('tag-1')
    expect(removed).toEqual(['a'])
    expect(await storage.loadSchedule('a')).toBeNull()
  })

  it('reset 은 전체 schedule 을 제거한다', async () => {
    await storage.saveSchedules([scheduleFixture({ uuid: 'a' }), scheduleFixture({ uuid: 'b' })])
    await storage.reset()
    expect(await storage.loadSchedule('a')).toBeNull()
    expect(await storage.loadSchedule('b')).toBeNull()
  })
})
