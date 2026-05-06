import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { openLocalCacheDb } from '../../../src/repositories/local-storage/database'
import { TodoLocalStorageIdb } from '../../../src/repositories/local-storage/TodoLocalStorageIdb'
import type { IDBPDatabase } from 'idb'
import type { Todo } from '../../../src/models/Todo'

const TEST_UID = 'test-uid'

function todoFixture(overrides: Partial<Todo> = {}): Todo {
  return {
    uuid: 'todo-1',
    name: '테스트',
    is_current: false,
    event_tag_id: null,
    event_time: { time_type: 'at', timestamp: 1746000000 },
    repeating: null,
    notification_options: null,
    ...overrides,
  } as Todo
}

describe('TodoLocalStorageIdb', () => {
  let db: IDBPDatabase
  let storage: TodoLocalStorageIdb

  beforeEach(async () => {
    db = await openLocalCacheDb(TEST_UID)
    storage = new TodoLocalStorageIdb(db)
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

  describe('saveTodos / loadTodo', () => {
    it('저장한 todo 를 uuid 로 조회할 수 있다', async () => {
      // given
      const todo = todoFixture({ uuid: 'a', name: 'first' })
      // when
      await storage.saveTodos([todo])
      const loaded = await storage.loadTodo('a')
      // then
      expect(loaded).toEqual(todo)
    })

    it('없는 uuid 조회 시 null 을 반환한다', async () => {
      // given: empty storage
      // when
      const result = await storage.loadTodo('missing')
      // then
      expect(result).toBeNull()
    })
  })

  describe('loadTodos (range)', () => {
    it('event_time.timestamp 가 범위 안에 든 todo 만 반환한다', async () => {
      // given
      await storage.saveTodos([
        todoFixture({ uuid: 'a', event_time: { time_type: 'at', timestamp: 100 } }),
        todoFixture({ uuid: 'b', event_time: { time_type: 'at', timestamp: 200 } }),
        todoFixture({ uuid: 'c', event_time: { time_type: 'at', timestamp: 300 } }),
      ])
      // when
      const result = await storage.loadTodos({ lower: 150, upper: 250 })
      // then
      expect(result.map((t) => t.uuid).sort()).toEqual(['b'])
    })

    it('범위 밖이면 빈 배열을 반환한다', async () => {
      // given
      await storage.saveTodos([todoFixture({ uuid: 'a', event_time: { time_type: 'at', timestamp: 100 } })])
      // when
      const result = await storage.loadTodos({ lower: 200, upper: 300 })
      // then
      expect(result).toEqual([])
    })

    it('period 타입 todo 의 [period_start, period_end] 가 범위와 겹치면 반환한다', async () => {
      // given: period_start=100, period_end=300 → [150, 250] 와 겹침
      await storage.saveTodos([
        todoFixture({ uuid: 'overlap', event_time: { time_type: 'period', period_start: 100, period_end: 300 } }),
        todoFixture({ uuid: 'no-overlap', event_time: { time_type: 'period', period_start: 400, period_end: 600 } }),
      ])
      // when
      const result = await storage.loadTodos({ lower: 150, upper: 250 })
      // then
      expect(result.map((t) => t.uuid)).toEqual(['overlap'])
    })

    it('allday 타입 todo 가 범위와 겹치면 반환한다', async () => {
      // given: period_start=86400 (UTC 1970-01-02 00:00), seconds_from_gmt=0
      // adjStart=86400, adjEnd=86400+86399=172799 → [0, 200000] 와 겹침
      await storage.saveTodos([
        todoFixture({
          uuid: 'allday-overlap',
          event_time: { time_type: 'allday', period_start: 86400, seconds_from_gmt: 0 },
        }),
        todoFixture({
          uuid: 'allday-no-overlap',
          event_time: { time_type: 'allday', period_start: 500000, seconds_from_gmt: 0 },
        }),
      ])
      // when
      const result = await storage.loadTodos({ lower: 0, upper: 200000 })
      // then
      expect(result.map((t) => t.uuid)).toEqual(['allday-overlap'])
    })
  })

  describe('loadCurrentTodos', () => {
    it('is_current=true 인 todo 만 반환한다', async () => {
      // given
      await storage.saveTodos([
        todoFixture({ uuid: 'a', is_current: true }),
        todoFixture({ uuid: 'b', is_current: false }),
        todoFixture({ uuid: 'c', is_current: true }),
      ])
      // when
      const result = await storage.loadCurrentTodos()
      // then
      expect(result.map((t) => t.uuid).sort()).toEqual(['a', 'c'])
    })
  })

  describe('loadUncompletedTodos', () => {
    it('event_time.timestamp <= now 이고 is_current=false 인 todo 만 반환한다', async () => {
      // given
      const now = 1000
      await storage.saveTodos([
        todoFixture({ uuid: 'past-uncomplete', is_current: false, event_time: { time_type: 'at', timestamp: 500 } }),
        todoFixture({ uuid: 'past-current', is_current: true, event_time: { time_type: 'at', timestamp: 500 } }),
        todoFixture({ uuid: 'future', is_current: false, event_time: { time_type: 'at', timestamp: 2000 } }),
      ])
      // when
      const result = await storage.loadUncompletedTodos(now)
      // then
      expect(result.map((t) => t.uuid)).toEqual(['past-uncomplete'])
    })
  })

  describe('updateTodo', () => {
    it('동일 uuid 의 기존 todo 를 덮어쓴다', async () => {
      // given
      await storage.saveTodos([todoFixture({ uuid: 'a', name: 'old' })])
      // when
      await storage.updateTodo(todoFixture({ uuid: 'a', name: 'new' }))
      const loaded = await storage.loadTodo('a')
      // then
      expect(loaded?.name).toBe('new')
    })
  })

  describe('removeTodos', () => {
    it('지정한 uuid 들만 제거하고 나머지는 유지한다', async () => {
      // given
      await storage.saveTodos([
        todoFixture({ uuid: 'a' }),
        todoFixture({ uuid: 'b' }),
        todoFixture({ uuid: 'c' }),
      ])
      // when
      await storage.removeTodos(['a', 'c'])
      // then
      expect(await storage.loadTodo('a')).toBeNull()
      expect(await storage.loadTodo('b')).not.toBeNull()
      expect(await storage.loadTodo('c')).toBeNull()
    })

    it('빈 배열을 받으면 아무것도 안 한다', async () => {
      // given
      await storage.saveTodos([todoFixture({ uuid: 'a' })])
      // when
      await storage.removeTodos([])
      // then
      expect(await storage.loadTodo('a')).not.toBeNull()
    })
  })

  describe('removeTodosWith (tagId)', () => {
    it('특정 tagId 가 붙은 todo 만 삭제하고 삭제된 uuid 를 반환한다', async () => {
      // given
      await storage.saveTodos([
        todoFixture({ uuid: 'a', event_tag_id: 'tag-1' }),
        todoFixture({ uuid: 'b', event_tag_id: 'tag-2' }),
        todoFixture({ uuid: 'c', event_tag_id: 'tag-1' }),
      ])
      // when
      const removed = await storage.removeTodosWith('tag-1')
      // then
      expect(removed.sort()).toEqual(['a', 'c'])
      expect(await storage.loadTodo('a')).toBeNull()
      expect(await storage.loadTodo('b')).not.toBeNull()
    })
  })

  describe('reset', () => {
    it('모든 todo 를 제거한다', async () => {
      // given
      await storage.saveTodos([todoFixture({ uuid: 'a' }), todoFixture({ uuid: 'b' })])
      // when
      await storage.reset()
      // then
      expect(await storage.loadTodo('a')).toBeNull()
      expect(await storage.loadTodo('b')).toBeNull()
    })
  })
})
