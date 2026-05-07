import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EventRepository } from '../../src/repositories/EventRepository'
import { LocalStorageContainer } from '../../src/repositories/local-storage/LocalStorageContainer'
import type { Todo } from '../../src/models/Todo'
import type { Schedule } from '../../src/models/Schedule'

const TEST_UID = 'write-sync-test'

function todoOf(uuid: string, overrides: Partial<Todo> = {}): Todo {
  return {
    uuid, name: `t-${uuid}`,
    is_current: false,
    event_tag_id: null,
    event_time: { time_type: 'at', timestamp: 1000 },
    repeating: null,
    notification_options: null,
    ...overrides,
  } as Todo
}

function scheduleOf(uuid: string, overrides: Partial<Schedule> = {}): Schedule {
  return {
    uuid, name: `s-${uuid}`,
    event_tag_id: null,
    event_time: { time_type: 'at', timestamp: 1000 },
    repeating: null,
    notification_options: null,
    ...overrides,
  } as Schedule
}

async function deleteDb(uid: string) {
  await new Promise<void>((r) => {
    const req = indexedDB.deleteDatabase(`todocal-cache:${uid}`)
    req.onsuccess = req.onerror = req.onblocked = () => r()
  })
}

function makeFakeApis() {
  return {
    todoApi: {
      getTodos: vi.fn().mockResolvedValue([]),
      getCurrentTodos: vi.fn().mockResolvedValue([]),
      getUncompletedTodos: vi.fn().mockResolvedValue([]),
      getTodo: vi.fn(),
      createTodo: vi.fn(), updateTodo: vi.fn(), patchTodo: vi.fn(),
      completeTodo: vi.fn(), replaceTodo: vi.fn(), deleteTodo: vi.fn(),
    },
    scheduleApi: {
      getSchedules: vi.fn().mockResolvedValue([]),
      getSchedule: vi.fn(),
      createSchedule: vi.fn(), updateSchedule: vi.fn(),
      excludeRepeating: vi.fn(), deleteSchedule: vi.fn(),
    },
  }
}

describe('EventRepository — Todo mutation LocalStorage write sync', () => {
  let container: LocalStorageContainer

  beforeEach(async () => {
    container = new LocalStorageContainer()
    await container.init(TEST_UID)
  })

  afterEach(async () => {
    await container.dispose()
    await deleteDb(TEST_UID)
  })

  it('createTodo 응답값이 LocalStorage 에 저장된다', async () => {
    const created = todoOf('new-1', { is_current: true })
    const { todoApi, scheduleApi } = makeFakeApis()
    todoApi.createTodo.mockResolvedValue(created)

    const repo = new EventRepository({
      todoApi: todoApi as any, scheduleApi: scheduleApi as any,
      localStorageContainer: container,
    })

    await repo.createTodo({ name: 'new-1' } as any)

    expect(await container.todo().loadTodo('new-1')).toEqual(created)
  })

  it('updateTodo 응답값이 LocalStorage 의 동일 uuid 를 덮어쓴다', async () => {
    await container.todo().saveTodos([todoOf('a', { name: 'old' })])
    const updated = todoOf('a', { name: 'new' })
    const { todoApi, scheduleApi } = makeFakeApis()
    todoApi.patchTodo.mockResolvedValue(updated)

    const repo = new EventRepository({
      todoApi: todoApi as any, scheduleApi: scheduleApi as any,
      localStorageContainer: container,
    })

    await repo.updateTodo('a', { name: 'new' })

    expect((await container.todo().loadTodo('a'))?.name).toBe('new')
  })

  it('deleteTodo 응답 후 LocalStorage 에서도 제거된다', async () => {
    await container.todo().saveTodos([todoOf('a')])
    const { todoApi, scheduleApi } = makeFakeApis()
    todoApi.deleteTodo.mockResolvedValue({ status: 'ok' })

    const repo = new EventRepository({
      todoApi: todoApi as any, scheduleApi: scheduleApi as any,
      localStorageContainer: container,
    })

    await repo.deleteTodo('a')

    expect(await container.todo().loadTodo('a')).toBeNull()
  })

  it('localStorageContainer 미주입이면 LocalStorage 작업 없이 Remote + 메모리만 동작 (호환성)', async () => {
    const created = todoOf('only-remote', { is_current: true })
    const { todoApi, scheduleApi } = makeFakeApis()
    todoApi.createTodo.mockResolvedValue(created)

    const repo = new EventRepository({
      todoApi: todoApi as any, scheduleApi: scheduleApi as any,
    })

    await expect(repo.createTodo({ name: 'only-remote' } as any)).resolves.toEqual(created)
  })

  it('LocalStorage 작업 실패가 mutation 흐름을 깨지 않는다 (silent fail)', async () => {
    await container.dispose()

    const created = todoOf('a', { is_current: true })
    const { todoApi, scheduleApi } = makeFakeApis()
    todoApi.createTodo.mockResolvedValue(created)

    const repo = new EventRepository({
      todoApi: todoApi as any, scheduleApi: scheduleApi as any,
      localStorageContainer: container,
    })

    await expect(repo.createTodo({ name: 'a' } as any)).resolves.toEqual(created)
  })
})

describe('EventRepository — Schedule mutation LocalStorage write sync', () => {
  let container: LocalStorageContainer

  beforeEach(async () => {
    container = new LocalStorageContainer()
    await container.init(TEST_UID)
  })

  afterEach(async () => {
    await container.dispose()
    await deleteDb(TEST_UID)
  })

  it('createSchedule 응답값이 LocalStorage 에 저장된다', async () => {
    const created = scheduleOf('s-1')
    const { todoApi, scheduleApi } = makeFakeApis()
    scheduleApi.createSchedule.mockResolvedValue(created)

    const repo = new EventRepository({
      todoApi: todoApi as any, scheduleApi: scheduleApi as any,
      localStorageContainer: container,
    })
    await repo.createSchedule({ name: 's-1' } as any)

    expect(await container.schedule().loadSchedule('s-1')).toEqual(created)
  })

  it('updateSchedule 응답값이 LocalStorage 의 동일 uuid 를 덮어쓴다', async () => {
    await container.schedule().saveSchedules([scheduleOf('a', { name: 'old' })])
    const updated = scheduleOf('a', { name: 'new' })
    const { todoApi, scheduleApi } = makeFakeApis()
    scheduleApi.updateSchedule.mockResolvedValue(updated)

    const repo = new EventRepository({
      todoApi: todoApi as any, scheduleApi: scheduleApi as any,
      localStorageContainer: container,
    })
    await repo.updateSchedule('a', { name: 'new' })

    expect((await container.schedule().loadSchedule('a'))?.name).toBe('new')
  })

  it('deleteSchedule 응답 후 LocalStorage 에서도 제거된다', async () => {
    await container.schedule().saveSchedules([scheduleOf('a')])
    const { todoApi, scheduleApi } = makeFakeApis()
    scheduleApi.deleteSchedule.mockResolvedValue({ status: 'ok' })

    const repo = new EventRepository({
      todoApi: todoApi as any, scheduleApi: scheduleApi as any,
      localStorageContainer: container,
    })
    await repo.deleteSchedule('a')

    expect(await container.schedule().loadSchedule('a')).toBeNull()
  })

  it('excludeScheduleRepeating 응답값이 LocalStorage 의 동일 uuid 를 덮어쓴다', async () => {
    await container.schedule().saveSchedules([scheduleOf('a')])
    const updated = scheduleOf('a', { name: 'after-exclude' })
    const { todoApi, scheduleApi } = makeFakeApis()
    scheduleApi.excludeRepeating.mockResolvedValue(updated)

    const repo = new EventRepository({
      todoApi: todoApi as any, scheduleApi: scheduleApi as any,
      localStorageContainer: container,
    })
    await repo.excludeScheduleRepeating('a', [3])

    expect((await container.schedule().loadSchedule('a'))?.name).toBe('after-exclude')
  })
})

describe('EventRepository.completeTodo — LocalStorage write sync', () => {
  let container: LocalStorageContainer

  beforeEach(async () => {
    container = new LocalStorageContainer()
    await container.init(TEST_UID)
  })

  afterEach(async () => {
    await container.dispose()
    await deleteDb(TEST_UID)
  })

  it('단일(비반복) todo 완료 시 LocalStorage 의 todo 제거 + doneTodo 저장', async () => {
    const todo = todoOf('a', { is_current: true })
    await container.todo().saveTodos([todo])

    const doneEvent = { uuid: 'done-a', origin_event_id: 'a', name: 't-a', done_at: 5000 }
    const { todoApi, scheduleApi } = makeFakeApis()
    todoApi.completeTodo.mockResolvedValue(doneEvent)

    const repo = new EventRepository({
      todoApi: todoApi as any, scheduleApi: scheduleApi as any,
      localStorageContainer: container,
    })

    await repo.completeTodo(todo)

    expect(await container.todo().loadTodo('a')).toBeNull()
    expect(await container.doneTodo().loadDoneTodo('done-a')).toEqual(doneEvent)
  })

  it('반복 todo "이번만" 완료 시 todo 가 다음 회차로 갱신, doneTodo 저장', async () => {
    const repeating = { option: { optionType: 'every_day' as const, interval: 1 } } as any
    const todo = todoOf('a', {
      is_current: true,
      repeating,
      repeating_turn: 1,
      event_time: { time_type: 'at', timestamp: 1000 },
    })
    await container.todo().saveTodos([todo])

    const doneEvent = { uuid: 'done-a', origin_event_id: 'a', name: 't-a', done_at: 1000 }
    const { todoApi, scheduleApi } = makeFakeApis()
    todoApi.completeTodo.mockResolvedValue(doneEvent)

    const repo = new EventRepository({
      todoApi: todoApi as any, scheduleApi: scheduleApi as any,
      localStorageContainer: container,
    })

    await repo.completeTodo(todo, 'this')

    const after = await container.todo().loadTodo('a')
    expect(after).not.toBeNull()
    expect((after?.event_time as any)?.timestamp).toBeGreaterThan(1000)
    expect(await container.doneTodo().loadDoneTodo('done-a')).toEqual(doneEvent)
  })

  it("반복 'future' 완료 시 todo 제거 + doneTodo 저장", async () => {
    const repeating = { option: { optionType: 'every_day' as const, interval: 1 } } as any
    const todo = todoOf('a', {
      is_current: true,
      repeating,
      repeating_turn: 1,
      event_time: { time_type: 'at', timestamp: 1000 },
    })
    await container.todo().saveTodos([todo])

    const doneEvent = { uuid: 'done-a', origin_event_id: 'a', name: 't-a', done_at: 1000 }
    const { todoApi, scheduleApi } = makeFakeApis()
    todoApi.completeTodo.mockResolvedValue(doneEvent)
    todoApi.patchTodo.mockResolvedValue(todo)

    const repo = new EventRepository({
      todoApi: todoApi as any, scheduleApi: scheduleApi as any,
      localStorageContainer: container,
    })

    await repo.completeTodo(todo, 'future')

    expect(await container.todo().loadTodo('a')).toBeNull()
    expect(await container.doneTodo().loadDoneTodo('done-a')).toEqual(doneEvent)
  })
})

describe('EventRepository — patch/replaceThisScope LocalStorage write sync', () => {
  let container: LocalStorageContainer

  beforeEach(async () => {
    container = new LocalStorageContainer()
    await container.init(TEST_UID)
  })

  afterEach(async () => {
    await container.dispose()
    await deleteDb(TEST_UID)
  })

  it('patchTodoNextOccurrence 응답값이 LocalStorage 의 동일 uuid 를 덮어쓴다', async () => {
    await container.todo().saveTodos([
      todoOf('a', { repeating_turn: 1, event_time: { time_type: 'at', timestamp: 1000 } }),
    ])
    const advanced = todoOf('a', { repeating_turn: 2, event_time: { time_type: 'at', timestamp: 86400 } })
    const { todoApi, scheduleApi } = makeFakeApis()
    todoApi.patchTodo.mockResolvedValue(advanced)

    const repo = new EventRepository({
      todoApi: todoApi as any, scheduleApi: scheduleApi as any,
      localStorageContainer: container,
    })
    await repo.patchTodoNextOccurrence('a', { time_type: 'at', timestamp: 86400 } as any, 2)

    expect((await container.todo().loadTodo('a'))?.repeating_turn).toBe(2)
  })

  it('replaceTodoThisScope: 원본 todo 제거 + new_todo / next_repeating 저장', async () => {
    await container.todo().saveTodos([todoOf('a')])
    const newTodo = todoOf('new-todo', { event_time: { time_type: 'at', timestamp: 2000 } })
    const nextRepeating = todoOf('next-rep', { event_time: { time_type: 'at', timestamp: 3000 } })
    const { todoApi, scheduleApi } = makeFakeApis()
    todoApi.replaceTodo.mockResolvedValue({ new_todo: newTodo, next_repeating: nextRepeating })

    const repo = new EventRepository({
      todoApi: todoApi as any, scheduleApi: scheduleApi as any,
      localStorageContainer: container,
    })
    await repo.replaceTodoThisScope('a', { new: { name: 'replaced' } } as any)

    expect(await container.todo().loadTodo('a')).toBeNull()
    expect(await container.todo().loadTodo('new-todo')).not.toBeNull()
    expect(await container.todo().loadTodo('next-rep')).not.toBeNull()
  })

  it('replaceTodoThisScope: next_repeating 이 없을 때도 정상 동작', async () => {
    await container.todo().saveTodos([todoOf('a')])
    const newTodo = todoOf('new-todo')
    const { todoApi, scheduleApi } = makeFakeApis()
    todoApi.replaceTodo.mockResolvedValue({ new_todo: newTodo, next_repeating: undefined })

    const repo = new EventRepository({
      todoApi: todoApi as any, scheduleApi: scheduleApi as any,
      localStorageContainer: container,
    })
    await repo.replaceTodoThisScope('a', { new: { name: 'replaced' } } as any)

    expect(await container.todo().loadTodo('a')).toBeNull()
    expect(await container.todo().loadTodo('new-todo')).not.toBeNull()
  })
})