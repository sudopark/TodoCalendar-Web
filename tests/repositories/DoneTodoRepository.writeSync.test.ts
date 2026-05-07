import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DoneTodoRepository } from '../../src/repositories/DoneTodoRepository'
import { LocalStorageContainer } from '../../src/repositories/local-storage/LocalStorageContainer'
import { useDoneTodosCache } from '../../src/repositories/caches/doneTodosCache'
import { useCalendarEventsCache } from '../../src/repositories/caches/calendarEventsCache'
import { useCurrentTodosCache } from '../../src/repositories/caches/currentTodosCache'
import type { DoneTodo } from '../../src/models/DoneTodo'
import type { Todo } from '../../src/models/Todo'

const TEST_UID = 'done-write'
const doneOf = (uuid: string): DoneTodo => ({ uuid, origin_event_id: 'o-' + uuid, name: 'd-' + uuid, done_at: 1000 } as DoneTodo)
const todoOf = (uuid: string): Todo => ({
  uuid, name: 't-' + uuid, is_current: false, event_tag_id: null,
  event_time: { time_type: 'at', timestamp: 1000 }, repeating: null, notification_options: null,
} as Todo)

async function deleteDb(uid: string) {
  await new Promise<void>((r) => {
    const req = indexedDB.deleteDatabase(`todocal-cache:${uid}`)
    req.onsuccess = req.onerror = req.onblocked = () => r()
  })
}

describe('DoneTodoRepository — mutation LocalStorage write sync', () => {
  let container: LocalStorageContainer
  let doneApi: { getDoneTodos: ReturnType<typeof vi.fn>; deleteDoneTodo: ReturnType<typeof vi.fn>; revertDoneTodo: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    container = new LocalStorageContainer()
    await container.init(TEST_UID)
    doneApi = { getDoneTodos: vi.fn(), deleteDoneTodo: vi.fn(), revertDoneTodo: vi.fn() }
  })

  afterEach(async () => {
    await container.dispose()
    await deleteDb(TEST_UID)
  })

  it('revert 후 LocalStorage 의 doneTodo 가 제거된다', async () => {
    await container.doneTodo().saveDoneTodos([doneOf('d-1')])
    doneApi.revertDoneTodo.mockResolvedValue({ todo: todoOf('o-d-1') })

    const repo = new DoneTodoRepository({ api: doneApi as any, localStorageContainer: container })
    await repo.revert('d-1')

    expect(await container.doneTodo().loadDoneTodo('d-1')).toBeNull()
  })

  it('revert 후 복원된 todo 가 LocalStorage todo 에 저장된다 (I2)', async () => {
    // given
    await container.doneTodo().saveDoneTodos([doneOf('d-1')])
    const restored = todoOf('o-d-1')
    doneApi.revertDoneTodo.mockResolvedValue({ todo: restored })

    const repo = new DoneTodoRepository({ api: doneApi as any, localStorageContainer: container })

    // when
    await repo.revert('d-1')

    // then: 복원된 todo 가 LocalStorage todo store 에 저장됐는지 확인
    expect(await container.todo().loadTodo(restored.uuid)).not.toBeNull()
  })

  it('revert 된 todo 가 event_time 을 가지면 calendarEventsCache 에 추가된다 (I2)', async () => {
    // given: event_time 을 보유한 todo
    const todoWithTime: Todo = {
      ...todoOf('o-d-2'),
      event_time: { time_type: 'at', timestamp: 1000 },
      is_current: false,
    }
    await container.doneTodo().saveDoneTodos([doneOf('d-2')])
    doneApi.revertDoneTodo.mockResolvedValue({ todo: todoWithTime })

    useCalendarEventsCache.getState().reset()
    const repo = new DoneTodoRepository({ api: doneApi as any, localStorageContainer: container })

    // when
    await repo.revert('d-2')

    // then: calendarEventsCache 에 해당 todo 가 포함됨
    const events = useCalendarEventsCache.getState().eventsByDate
    const found = Array.from(events.values()).flat().find(e => e.type === 'todo' && e.event.uuid === todoWithTime.uuid)
    expect(found).toBeDefined()
  })

  it('revert 된 todo 가 is_current 이면 currentTodosCache 에 추가된다 (I2)', async () => {
    // given: is_current 인 todo
    const currentTodo: Todo = { ...todoOf('o-d-3'), is_current: true, event_time: null }
    await container.doneTodo().saveDoneTodos([doneOf('d-3')])
    doneApi.revertDoneTodo.mockResolvedValue({ todo: currentTodo })

    useCurrentTodosCache.getState().reset()
    const repo = new DoneTodoRepository({ api: doneApi as any, localStorageContainer: container })

    // when
    await repo.revert('d-3')

    // then: currentTodosCache 에 해당 todo 가 포함됨
    const todos = useCurrentTodosCache.getState().todos
    expect(todos.find(t => t.uuid === currentTodo.uuid)).toBeDefined()
  })

  it('remove 후 LocalStorage 의 doneTodo 가 제거된다', async () => {
    await container.doneTodo().saveDoneTodos([doneOf('d-1')])
    doneApi.deleteDoneTodo.mockResolvedValue({ status: 'ok' })

    const repo = new DoneTodoRepository({ api: doneApi as any, localStorageContainer: container })
    await repo.remove('d-1')

    expect(await container.doneTodo().loadDoneTodo('d-1')).toBeNull()
  })

  it('localStorageContainer 미주입 호환성', async () => {
    doneApi.deleteDoneTodo.mockResolvedValue({ status: 'ok' })
    const repo = new DoneTodoRepository({ api: doneApi as any })
    await expect(repo.remove('d-1')).resolves.toBeUndefined()
  })
})