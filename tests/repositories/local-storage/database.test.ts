import { describe, it, expect, afterEach } from 'vitest'
import { openLocalCacheDb, dbNameFor, USER_OBJECT_STORES } from '../../../src/repositories/local-storage/database'

describe('local-storage/database', () => {
  afterEach(async () => {
    indexedDB.deleteDatabase('todocal-cache:test-uid')
  })

  it('uid 별 DB 이름을 todocal-cache:<uid> 형식으로 만든다', () => {
    expect(dbNameFor('test-uid')).toBe('todocal-cache:test-uid')
    expect(dbNameFor('user@example.com')).toBe('todocal-cache:user@example.com')
  })

  it('DB 를 열면 모든 object store 가 생성된다', async () => {
    const db = await openLocalCacheDb('test-uid')
    for (const name of USER_OBJECT_STORES) {
      expect(db.objectStoreNames.contains(name)).toBe(true)
    }
    expect(db.objectStoreNames.contains('holidays')).toBe(true)
    expect(db.objectStoreNames.contains('meta')).toBe(true)
    db.close()
  })

  it('todos store 는 time.timestamp 인덱스를 가진다', async () => {
    const db = await openLocalCacheDb('test-uid')
    const tx = db.transaction('todos', 'readonly')
    const indexNames = Array.from(tx.store.indexNames)
    expect(indexNames).toContain('time.timestamp')
    expect(indexNames).toContain('event_tag_id')
    db.close()
  })

  it('USER_OBJECT_STORES 는 holidays/meta 를 포함하지 않는다 (wipe 정책)', () => {
    expect(USER_OBJECT_STORES).not.toContain('holidays')
    expect(USER_OBJECT_STORES).not.toContain('meta')
    expect(USER_OBJECT_STORES).toContain('todos')
    expect(USER_OBJECT_STORES).toContain('schedules')
    expect(USER_OBJECT_STORES).toContain('done_todos')
    expect(USER_OBJECT_STORES).toContain('event_tags')
    expect(USER_OBJECT_STORES).toContain('event_details')
    expect(USER_OBJECT_STORES).toContain('foremost_event')
  })
})
