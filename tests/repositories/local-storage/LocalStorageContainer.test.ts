import { describe, it, expect, afterEach } from 'vitest'
import { LocalStorageContainer } from '../../../src/repositories/local-storage/LocalStorageContainer'

const UID_A = 'user-a'
const UID_B = 'user-b'

async function deleteDb(uid: string) {
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(`todocal-cache:${uid}`)
    req.onsuccess = req.onerror = req.onblocked = () => resolve()
  })
}

describe('LocalStorageContainer', () => {
  afterEach(async () => {
    await deleteDb(UID_A)
    await deleteDb(UID_B)
  })

  describe('init / dispose', () => {
    it('init 전에 storage getter 호출 시 에러를 던진다', () => {
      const c = new LocalStorageContainer()
      expect(() => c.todo()).toThrow(/not initialized/)
    })

    it('init 후에는 storage getter 가 인스턴스를 반환한다', async () => {
      const c = new LocalStorageContainer()
      await c.init(UID_A)
      expect(c.todo()).toBeDefined()
      expect(c.schedule()).toBeDefined()
      expect(c.eventTag()).toBeDefined()
      expect(c.eventDetail()).toBeDefined()
      expect(c.doneTodo()).toBeDefined()
      expect(c.foremost()).toBeDefined()
      expect(c.holiday()).toBeDefined()
      await c.dispose()
    })

    it('dispose 후엔 storage getter 가 다시 에러를 던진다', async () => {
      const c = new LocalStorageContainer()
      await c.init(UID_A)
      await c.dispose()
      expect(() => c.todo()).toThrow(/not initialized/)
    })
  })

  describe('clearUserStores', () => {
    it('user store 의 데이터는 모두 제거하지만 holidays 는 보존한다', async () => {
      // given
      const c = new LocalStorageContainer()
      await c.init(UID_A)
      await c.todo().saveTodos([
        { uuid: 'a', name: 't', is_current: false, event_tag_id: null,
          event_time: { time_type: 'at', timestamp: 100 }, repeating: null, notification_options: null } as any,
      ])
      await c.holiday().saveYear(2025, [{ summary: '신정', start: { date: '2025-01-01' }, end: { date: '2025-01-02' } } as any])

      // when
      await c.clearUserStores()

      // then
      expect((await c.todo().loadCurrentTodos()).length === 0 && (await c.todo().loadTodo('a')) === null).toBe(true)
      expect(await c.holiday().loadYear(2025)).not.toBeNull()  // 보존

      await c.dispose()
    })
  })

  describe('account 격리', () => {
    it('uid A 에 저장한 데이터는 uid B init 시 보이지 않는다', async () => {
      const a = new LocalStorageContainer()
      await a.init(UID_A)
      await a.todo().saveTodos([
        { uuid: 'a-todo', name: 't', is_current: true, event_tag_id: null,
          event_time: { time_type: 'at', timestamp: 100 }, repeating: null, notification_options: null } as any,
      ])
      await a.dispose()

      const b = new LocalStorageContainer()
      await b.init(UID_B)
      expect(await b.todo().loadCurrentTodos()).toEqual([])
      await b.dispose()
    })
  })
})
