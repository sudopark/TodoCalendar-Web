import { openDB, type IDBPDatabase } from 'idb'

export const SCHEMA_VERSION = 1

/**
 * 사용자 데이터 object store 목록.
 * signOut/계정 전환 시 이 store 들만 clear 한다.
 * holidays(퍼블릭), meta(스키마 메타) 는 보존.
 */
export const USER_OBJECT_STORES = [
  'todos',
  'schedules',
  'done_todos',
  'event_tags',
  'event_details',
  'foremost_event',
] as const

export type UserObjectStoreName = (typeof USER_OBJECT_STORES)[number]

export function dbNameFor(uid: string): string {
  return `todocal-cache:${uid}`
}

/**
 * uid 별 IndexedDB 를 열고 v1 정책으로 schema 를 보장한다.
 * v1 정책: oldVersion 이 SCHEMA_VERSION 미만이면 user/holidays/meta store 를 다시 생성한다.
 * 운영 안정화 후 점진적 migration 으로 전환.
 */
export async function openLocalCacheDb(uid: string): Promise<IDBPDatabase> {
  return openDB(dbNameFor(uid), SCHEMA_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < SCHEMA_VERSION) {
        for (const name of USER_OBJECT_STORES) {
          if (db.objectStoreNames.contains(name)) {
            db.deleteObjectStore(name)
          }
        }
        if (db.objectStoreNames.contains('holidays')) {
          db.deleteObjectStore('holidays')
        }
        if (db.objectStoreNames.contains('meta')) {
          db.deleteObjectStore('meta')
        }
      }

      const todos = db.createObjectStore('todos', { keyPath: 'uuid' })
      todos.createIndex('time.timestamp', 'event_time.timestamp')
      todos.createIndex('is_current', 'is_current')
      todos.createIndex('event_tag_id', 'event_tag_id')

      const schedules = db.createObjectStore('schedules', { keyPath: 'uuid' })
      schedules.createIndex('time.timestamp', 'event_time.timestamp')
      schedules.createIndex('event_tag_id', 'event_tag_id')

      const doneTodos = db.createObjectStore('done_todos', { keyPath: 'uuid' })
      doneTodos.createIndex('done_at', 'done_at')

      db.createObjectStore('event_tags', { keyPath: 'uuid' })
      db.createObjectStore('event_details', { keyPath: 'event_id' })
      db.createObjectStore('foremost_event')
      db.createObjectStore('holidays', { keyPath: 'year' })
      db.createObjectStore('meta')
    },
  })
}
