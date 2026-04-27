import { describe, it, expect, beforeEach, vi } from 'vitest'

// 캐시 파일이 todoApi/scheduleApi를 모듈 수준에서 import하여 Firebase 초기화가
// 트리거된다. 실제 API 호출은 EventRepository에 주입된 fake로 대체하므로,
// 모듈 로딩 시 Firebase 초기화를 막기 위해 의존 모듈을 미리 mock 처리한다.
vi.mock('../../src/api/todoApi', () => ({ todoApi: {} }))
vi.mock('../../src/api/scheduleApi', () => ({ scheduleApi: {} }))

import { EventRepository } from '../../src/repositories/EventRepository'
import { useCalendarEventsCache } from '../../src/repositories/caches/calendarEventsCache'
import { useCurrentTodosCache } from '../../src/repositories/caches/currentTodosCache'
import { useUncompletedTodosCache } from '../../src/repositories/caches/uncompletedTodosCache'
import type { Todo } from '../../src/models/Todo'
import type { Schedule } from '../../src/models/Schedule'

// ───────────────────────────── 헬퍼 ──────────────────────────────
// 2025-03 기준 timestamp (한국 시간 기준 자정 UTC)
const MAR_01_TS = Math.floor(new Date(2025, 2, 1, 12, 0, 0).getTime() / 1000)
const MAR_15_TS = Math.floor(new Date(2025, 2, 15, 12, 0, 0).getTime() / 1000)

function makeTodo(override: Partial<Todo> & { uuid: string }): Todo {
  return {
    uuid: override.uuid,
    name: override.name ?? '할 일',
    is_current: override.is_current ?? false,
    event_time: override.event_time ?? null,
    ...override,
  }
}

function makeSchedule(override: Partial<Schedule> & { uuid: string }): Schedule {
  return {
    uuid: override.uuid,
    name: override.name ?? '일정',
    event_time: override.event_time ?? { time_type: 'at', timestamp: MAR_01_TS },
    ...override,
  }
}

// ───────────────────────────── Fake API ──────────────────────────────
function makeFakeTodoApi(overrides: Partial<{
  getTodos: (lower: number, upper: number) => Promise<Todo[]>
  getCurrentTodos: () => Promise<Todo[]>
  getUncompletedTodos: () => Promise<Todo[]>
  createTodo: (body: object) => Promise<Todo>
  patchTodo: (id: string, body: object) => Promise<Todo>
  deleteTodo: (id: string) => Promise<{ status: string }>
}> = {}) {
  return {
    getTodos: overrides.getTodos ?? vi.fn(async () => []),
    getCurrentTodos: overrides.getCurrentTodos ?? vi.fn(async () => []),
    getUncompletedTodos: overrides.getUncompletedTodos ?? vi.fn(async () => []),
    createTodo: overrides.createTodo ?? vi.fn(async () => makeTodo({ uuid: 'created' })),
    patchTodo: overrides.patchTodo ?? vi.fn(async () => makeTodo({ uuid: 'patched' })),
    deleteTodo: overrides.deleteTodo ?? vi.fn(async () => ({ status: 'ok' })),
    updateTodo: vi.fn(async () => makeTodo({ uuid: 'updated' })),
    completeTodo: vi.fn(async () => ({ uuid: 'done' })),
    replaceTodo: vi.fn(async () => ({ new_todo: makeTodo({ uuid: 'replaced' }) })),
    getTodo: vi.fn(async () => makeTodo({ uuid: 'fetched' })),
  }
}

function makeFakeScheduleApi(overrides: Partial<{
  getSchedules: (lower: number, upper: number) => Promise<Schedule[]>
  createSchedule: (body: object) => Promise<Schedule>
  patchSchedule: (id: string, body: object) => Promise<Schedule>
  updateSchedule: (id: string, body: object) => Promise<Schedule>
  deleteSchedule: (id: string) => Promise<{ status: string }>
}> = {}) {
  return {
    getSchedules: overrides.getSchedules ?? vi.fn(async () => []),
    createSchedule: overrides.createSchedule ?? vi.fn(async () => makeSchedule({ uuid: 'created-sch' })),
    patchSchedule: overrides.patchSchedule ?? vi.fn(async () => makeSchedule({ uuid: 'patched-sch' })),
    updateSchedule: overrides.updateSchedule ?? vi.fn(async () => makeSchedule({ uuid: 'updated-sch' })),
    deleteSchedule: overrides.deleteSchedule ?? vi.fn(async () => ({ status: 'ok' })),
    getSchedule: vi.fn(async () => makeSchedule({ uuid: 'fetched-sch' })),
    excludeRepeating: vi.fn(async () => makeSchedule({ uuid: 'excluded-sch' })),
  }
}

// ───────────────────────────── 공통 beforeEach ──────────────────────────────
function resetCaches() {
  useCalendarEventsCache.getState().reset()
  useCurrentTodosCache.getState().reset()
  useUncompletedTodosCache.getState().reset()
}

// ───────────────────────────── 테스트 ──────────────────────────────

describe('EventRepository — fetchMonth', () => {
  beforeEach(resetCaches)

  it('fetchMonth 호출 시 해당 월 이벤트가 캘린더 캐시에 반영된다', async () => {
    // given
    const todo = makeTodo({ uuid: 't1', event_time: { time_type: 'at', timestamp: MAR_15_TS } })
    const sch = makeSchedule({ uuid: 's1', event_time: { time_type: 'at', timestamp: MAR_01_TS } })
    const repo = new EventRepository({
      todoApi: makeFakeTodoApi({ getTodos: async () => [todo] }) as any,
      scheduleApi: makeFakeScheduleApi({ getSchedules: async () => [sch] }) as any,
    })

    // when
    await repo.fetchMonth(2025, 2)  // 0-indexed month: 2 = March

    // then: 각 이벤트가 해당 날짜에 저장되어 있어야 한다
    const snapshot = repo.getMonthEventsSnapshot(2025, 2)
    expect(snapshot.some(e => e.event.uuid === 't1')).toBe(true)
    expect(snapshot.some(e => e.event.uuid === 's1')).toBe(true)
  })
})

describe('EventRepository — createTodo', () => {
  beforeEach(resetCaches)

  it('event_time이 있는 todo 생성 시 캘린더 캐시에 추가된다', async () => {
    // given
    const created = makeTodo({
      uuid: 'new-todo',
      is_current: false,
      event_time: { time_type: 'at', timestamp: MAR_15_TS },
    })
    const repo = new EventRepository({
      todoApi: makeFakeTodoApi({ createTodo: async () => created }) as any,
      scheduleApi: makeFakeScheduleApi() as any,
    })

    // when
    await repo.createTodo({ name: '새 할 일', event_time: { time_type: 'at', timestamp: MAR_15_TS } })

    // then: 캘린더 캐시에 들어가 있어야 한다
    const snapshot = repo.getMonthEventsSnapshot(2025, 2)
    expect(snapshot.some(e => e.event.uuid === 'new-todo')).toBe(true)
  })

  it('event_time이 없는 todo 생성 시 캘린더 캐시에 들어가지 않는다', async () => {
    // given
    const created = makeTodo({ uuid: 'no-time-todo', is_current: true, event_time: null })
    const repo = new EventRepository({
      todoApi: makeFakeTodoApi({ createTodo: async () => created }) as any,
      scheduleApi: makeFakeScheduleApi() as any,
    })

    // when
    await repo.createTodo({ name: '시간 없는 할 일' })

    // then: 캘린더 캐시에 없어야 한다
    const allCachedEvents = Array.from(useCalendarEventsCache.getState().eventsByDate.values()).flat()
    expect(allCachedEvents.some(e => e.event.uuid === 'no-time-todo')).toBe(false)
  })

  it('is_current인 todo 생성 시 currentTodos 캐시에 추가된다', async () => {
    // given
    const created = makeTodo({ uuid: 'current-todo', is_current: true, event_time: null })
    const repo = new EventRepository({
      todoApi: makeFakeTodoApi({ createTodo: async () => created }) as any,
      scheduleApi: makeFakeScheduleApi() as any,
    })

    // when
    await repo.createTodo({ name: '현재 할 일', is_current: true })

    // then: currentTodos 캐시에 들어가 있어야 한다
    const snapshot = repo.getCurrentTodosSnapshot()
    expect(snapshot.some(t => t.uuid === 'current-todo')).toBe(true)
  })
})

describe('EventRepository — updateTodo', () => {
  beforeEach(resetCaches)

  it('updateTodo 호출 후 캘린더 캐시가 수정된 이벤트로 갱신된다', async () => {
    // given: 캐시에 기존 todo 추가
    const original = makeTodo({ uuid: 'upd-todo', name: '원래 이름', event_time: { time_type: 'at', timestamp: MAR_15_TS } })
    useCalendarEventsCache.getState().addEvent({ type: 'todo', event: original })

    const updated = makeTodo({ uuid: 'upd-todo', name: '수정된 이름', event_time: { time_type: 'at', timestamp: MAR_15_TS } })
    const repo = new EventRepository({
      todoApi: makeFakeTodoApi({ patchTodo: async () => updated }) as any,
      scheduleApi: makeFakeScheduleApi() as any,
    })

    // when
    await repo.updateTodo('upd-todo', { name: '수정된 이름' })

    // then: 캘린더 캐시에 수정된 이름이 반영되어 있어야 한다
    const snapshot = repo.getMonthEventsSnapshot(2025, 2)
    const found = snapshot.find(e => e.event.uuid === 'upd-todo')
    expect(found?.event.name).toBe('수정된 이름')
  })

  it('updateTodo 후 is_current가 된 todo는 currentTodos 캐시에 추가된다', async () => {
    // given
    const updated = makeTodo({ uuid: 'to-current', is_current: true, event_time: null })
    const repo = new EventRepository({
      todoApi: makeFakeTodoApi({ patchTodo: async () => updated }) as any,
      scheduleApi: makeFakeScheduleApi() as any,
    })

    // when
    await repo.updateTodo('to-current', { is_current: true } as any)

    // then
    const snapshot = repo.getCurrentTodosSnapshot()
    expect(snapshot.some(t => t.uuid === 'to-current')).toBe(true)
  })

  it('updateTodo 후 is_current가 false가 된 todo는 currentTodos 캐시에서 제거된다', async () => {
    // given: 기존에 currentTodos에 있는 todo
    const original = makeTodo({ uuid: 'was-current', is_current: true, event_time: null })
    useCurrentTodosCache.getState().addTodo(original)

    const updated = makeTodo({ uuid: 'was-current', is_current: false, event_time: null })
    const repo = new EventRepository({
      todoApi: makeFakeTodoApi({ patchTodo: async () => updated }) as any,
      scheduleApi: makeFakeScheduleApi() as any,
    })

    // when
    await repo.updateTodo('was-current', { is_current: false } as any)

    // then: currentTodos 캐시에서 제거되어 있어야 한다
    const snapshot = repo.getCurrentTodosSnapshot()
    expect(snapshot.some(t => t.uuid === 'was-current')).toBe(false)
  })
})

describe('EventRepository — deleteTodo', () => {
  beforeEach(resetCaches)

  it('deleteTodo 호출 후 캘린더 캐시에서 해당 todo가 제거된다', async () => {
    // given: 캐시에 기존 todo 추가
    const todo = makeTodo({ uuid: 'del-todo', event_time: { time_type: 'at', timestamp: MAR_15_TS } })
    useCalendarEventsCache.getState().addEvent({ type: 'todo', event: todo })

    const repo = new EventRepository({
      todoApi: makeFakeTodoApi({ deleteTodo: async () => ({ status: 'ok' }) }) as any,
      scheduleApi: makeFakeScheduleApi() as any,
    })

    // when
    await repo.deleteTodo('del-todo')

    // then: 캘린더 캐시에서 제거되어 있어야 한다
    const snapshot = repo.getMonthEventsSnapshot(2025, 2)
    expect(snapshot.some(e => e.event.uuid === 'del-todo')).toBe(false)
  })

  it('deleteTodo 호출 후 currentTodos 캐시에서도 해당 todo가 제거된다', async () => {
    // given: currentTodos에도 있는 경우
    const todo = makeTodo({ uuid: 'del-current', is_current: true, event_time: null })
    useCurrentTodosCache.getState().addTodo(todo)

    const repo = new EventRepository({
      todoApi: makeFakeTodoApi({ deleteTodo: async () => ({ status: 'ok' }) }) as any,
      scheduleApi: makeFakeScheduleApi() as any,
    })

    // when
    await repo.deleteTodo('del-current')

    // then
    const snapshot = repo.getCurrentTodosSnapshot()
    expect(snapshot.some(t => t.uuid === 'del-current')).toBe(false)
  })
})

describe('EventRepository — patchTodoNextOccurrence', () => {
  beforeEach(resetCaches)

  it('patchTodoNextOccurrence 후 캘린더 캐시가 다음 회차 이벤트로 갱신된다', async () => {
    // given: 기존 반복 todo
    const nextEventTime = { time_type: 'at' as const, timestamp: MAR_15_TS }
    const nextTodo = makeTodo({ uuid: 'rep-todo', event_time: nextEventTime })
    const repo = new EventRepository({
      todoApi: makeFakeTodoApi({ patchTodo: async () => nextTodo }) as any,
      scheduleApi: makeFakeScheduleApi() as any,
    })

    // when
    await repo.patchTodoNextOccurrence('rep-todo', nextEventTime, 2)

    // then: 캘린더 캐시에 반영되어 있어야 한다
    const snapshot = repo.getMonthEventsSnapshot(2025, 2)
    expect(snapshot.some(e => e.event.uuid === 'rep-todo')).toBe(true)
  })
})

describe('EventRepository — createSchedule', () => {
  beforeEach(resetCaches)

  it('schedule 생성 시 캘린더 캐시에 추가된다', async () => {
    // given
    const created = makeSchedule({ uuid: 'new-sch', event_time: { time_type: 'at', timestamp: MAR_01_TS } })
    const repo = new EventRepository({
      todoApi: makeFakeTodoApi() as any,
      scheduleApi: makeFakeScheduleApi({ createSchedule: async () => created }) as any,
    })

    // when
    await repo.createSchedule({ name: '새 일정', event_time: { time_type: 'at', timestamp: MAR_01_TS } })

    // then
    const snapshot = repo.getMonthEventsSnapshot(2025, 2)
    expect(snapshot.some(e => e.event.uuid === 'new-sch')).toBe(true)
  })
})

describe('EventRepository — deleteSchedule', () => {
  beforeEach(resetCaches)

  it('deleteSchedule 호출 후 캘린더 캐시에서 해당 schedule이 제거된다', async () => {
    // given: 캐시에 기존 schedule 추가
    const sch = makeSchedule({ uuid: 'del-sch', event_time: { time_type: 'at', timestamp: MAR_01_TS } })
    useCalendarEventsCache.getState().addEvent({ type: 'schedule', event: sch })

    const repo = new EventRepository({
      todoApi: makeFakeTodoApi() as any,
      scheduleApi: makeFakeScheduleApi({ deleteSchedule: async () => ({ status: 'ok' }) }) as any,
    })

    // when
    await repo.deleteSchedule('del-sch')

    // then
    const snapshot = repo.getMonthEventsSnapshot(2025, 2)
    expect(snapshot.some(e => e.event.uuid === 'del-sch')).toBe(false)
  })
})

describe('EventRepository — updateSchedule', () => {
  beforeEach(resetCaches)

  it('schedule patch 후 calendar 캐시가 수정된 이벤트로 갱신된다', async () => {
    // given: 캐시에 기존 schedule 추가
    const original = makeSchedule({ uuid: 'upd-sch', name: '원래 일정', event_time: { time_type: 'at', timestamp: MAR_01_TS } })
    useCalendarEventsCache.getState().addEvent({ type: 'schedule', event: original })

    const updated = makeSchedule({ uuid: 'upd-sch', name: '수정된 일정', event_time: { time_type: 'at', timestamp: MAR_01_TS } })
    const repo = new EventRepository({
      todoApi: makeFakeTodoApi() as any,
      scheduleApi: makeFakeScheduleApi({ updateSchedule: async () => updated }) as any,
    })

    // when
    await repo.updateSchedule('upd-sch', { name: '수정된 일정' })

    // then: 캘린더 캐시에 수정된 이름이 반영되어 있어야 한다
    const snapshot = repo.getMonthEventsSnapshot(2025, 2)
    const found = snapshot.find(e => e.event.uuid === 'upd-sch')
    expect(found?.event.name).toBe('수정된 일정')
  })

  it('schedule patch 후 event_time이 변경된 경우 캐시에 새 시간이 반영된다', async () => {
    // given: 캐시에 기존 schedule 추가
    const original = makeSchedule({ uuid: 'time-sch', event_time: { time_type: 'at', timestamp: MAR_01_TS } })
    useCalendarEventsCache.getState().addEvent({ type: 'schedule', event: original })

    const updated = makeSchedule({ uuid: 'time-sch', event_time: { time_type: 'at', timestamp: MAR_15_TS } })
    const repo = new EventRepository({
      todoApi: makeFakeTodoApi() as any,
      scheduleApi: makeFakeScheduleApi({ updateSchedule: async () => updated }) as any,
    })

    // when
    await repo.updateSchedule('time-sch', { event_time: { time_type: 'at', timestamp: MAR_15_TS } })

    // then: 캐시에서 해당 schedule을 여전히 찾을 수 있어야 한다
    const snapshot = repo.getMonthEventsSnapshot(2025, 2)
    expect(snapshot.some(e => e.event.uuid === 'time-sch')).toBe(true)
  })
})

describe('EventRepository — patchScheduleNextOccurrence', () => {
  beforeEach(resetCaches)

  it('다음 회차로 patch 하면 캐시의 schedule이 새 회차로 교체된다', async () => {
    // given: 캐시에 기존 반복 schedule 추가
    const original = makeSchedule({ uuid: 'rep-sch', event_time: { time_type: 'at', timestamp: MAR_01_TS } })
    useCalendarEventsCache.getState().addEvent({ type: 'schedule', event: original })

    const nextEventTime = { time_type: 'at' as const, timestamp: MAR_15_TS }
    const nextSchedule = makeSchedule({ uuid: 'rep-sch', event_time: nextEventTime })
    const repo = new EventRepository({
      todoApi: makeFakeTodoApi() as any,
      scheduleApi: makeFakeScheduleApi({ updateSchedule: async () => nextSchedule }) as any,
    })

    // when
    await repo.patchScheduleNextOccurrence('rep-sch', nextEventTime)

    // then: 캘린더 캐시에 새 회차 schedule이 반영되어 있어야 한다
    const snapshot = repo.getMonthEventsSnapshot(2025, 2)
    expect(snapshot.some(e => e.event.uuid === 'rep-sch')).toBe(true)
  })
})

describe('EventRepository — fetchCurrentTodos', () => {
  beforeEach(resetCaches)

  it('fetchCurrentTodos 후 currentTodos 캐시에 응답이 반영된다', async () => {
    // given
    const todo1 = makeTodo({ uuid: 'curr-1', is_current: true })
    const todo2 = makeTodo({ uuid: 'curr-2', is_current: true })
    const repo = new EventRepository({
      todoApi: makeFakeTodoApi({ getCurrentTodos: async () => [todo1, todo2] }) as any,
      scheduleApi: makeFakeScheduleApi() as any,
    })

    // when
    await repo.fetchCurrentTodos()

    // then: currentTodos 캐시에 응답 목록이 반영되어 있어야 한다
    const snapshot = repo.getCurrentTodosSnapshot()
    expect(snapshot.some(t => t.uuid === 'curr-1')).toBe(true)
    expect(snapshot.some(t => t.uuid === 'curr-2')).toBe(true)
  })
})

describe('EventRepository — fetchUncompletedTodos', () => {
  beforeEach(resetCaches)

  it('fetchUncompletedTodos 후 uncompletedTodos 캐시에 응답이 반영된다', async () => {
    // given
    const todo1 = makeTodo({ uuid: 'unc-1', is_current: false })
    const todo2 = makeTodo({ uuid: 'unc-2', is_current: false })
    const repo = new EventRepository({
      todoApi: makeFakeTodoApi({ getUncompletedTodos: async () => [todo1, todo2] }) as any,
      scheduleApi: makeFakeScheduleApi() as any,
    })

    // when
    await repo.fetchUncompletedTodos()

    // then: uncompletedTodos 캐시에 응답 목록이 반영되어 있어야 한다
    const snapshot = repo.getUncompletedTodosSnapshot()
    expect(snapshot.some(t => t.uuid === 'unc-1')).toBe(true)
    expect(snapshot.some(t => t.uuid === 'unc-2')).toBe(true)
  })
})
