import { describe, it, expect, beforeEach, vi } from 'vitest'
import { deleteTodoEvent, deleteScheduleEvent } from '../../src/utils/eventDeleteHelper'
import { useCalendarEventsStore } from '../../src/stores/calendarEventsStore'
import { useCurrentTodosStore } from '../../src/stores/currentTodosStore'
import type { Todo } from '../../src/models/Todo'
import type { Schedule } from '../../src/models/Schedule'
import type { EventTime } from '../../src/models/EventTime'
import type { Repeating } from '../../src/models/Repeating'

vi.mock('../../src/api/todoApi', () => ({
  todoApi: {
    deleteTodo: vi.fn(),
    patchTodo: vi.fn(),
  },
}))

vi.mock('../../src/api/scheduleApi', () => ({
  scheduleApi: {
    deleteSchedule: vi.fn(),
    excludeRepeating: vi.fn(),
    updateSchedule: vi.fn(),
  },
}))

// Helper: Unix timestamp(초)로 변환
function ts(year: number, month: number, day: number): number {
  return Math.floor(new Date(year, month - 1, day, 12, 0, 0).getTime() / 1000)
}

function atTime(timestamp: number): EventTime {
  return { time_type: 'at', timestamp }
}

const DAILY_REPEATING: Repeating = {
  start: ts(2025, 1, 1),
  option: { optionType: 'every_day', interval: 1 },
}

describe('deleteTodoEvent', () => {
  beforeEach(() => {
    useCalendarEventsStore.setState({ eventsByDate: new Map(), loading: false, loadedYears: new Set() })
    useCurrentTodosStore.setState({ todos: [] })
    vi.clearAllMocks()
  })

  it('비반복 todo 삭제 → calendarEventsStore, currentTodosStore에서 제거', async () => {
    // given
    const { todoApi } = await import('../../src/api/todoApi')
    vi.mocked(todoApi.deleteTodo).mockResolvedValue({ status: 'ok' })

    const todo: Todo = {
      uuid: 'todo-1',
      name: 'Simple Todo',
      is_current: true,
      event_time: atTime(ts(2025, 3, 15)),
    }
    useCalendarEventsStore.getState().addEvent({ type: 'todo', event: todo })
    useCurrentTodosStore.getState().addTodo(todo)

    // when
    await deleteTodoEvent(todo)

    // then
    const allEvents = [...useCalendarEventsStore.getState().eventsByDate.values()].flat()
    expect(allEvents.some(e => e.event.uuid === 'todo-1')).toBe(false)
    expect(useCurrentTodosStore.getState().todos.some(t => t.uuid === 'todo-1')).toBe(false)
  })

  it('반복 todo "this" 삭제 → 다음 턴으로 업데이트', async () => {
    // given
    const { todoApi } = await import('../../src/api/todoApi')
    const currentTs = ts(2025, 3, 15)
    const nextTs = ts(2025, 3, 16)
    const todo: Todo = {
      uuid: 'todo-rep-1',
      name: 'Repeating Todo',
      is_current: true,
      event_time: atTime(currentTs),
      repeating: DAILY_REPEATING,
      repeating_turn: 5,
    }
    const updatedTodo: Todo = { ...todo, event_time: atTime(nextTs), repeating_turn: 6 }
    vi.mocked(todoApi.patchTodo).mockResolvedValue(updatedTodo)

    useCalendarEventsStore.getState().addEvent({ type: 'todo', event: todo })
    useCurrentTodosStore.getState().addTodo(todo)

    // when
    await deleteTodoEvent(todo, 'this')

    // then: 기존 uuid는 제거, 업데이트된 todo가 다음 날짜에 추가
    const allEvents = [...useCalendarEventsStore.getState().eventsByDate.values()].flat()
    expect(allEvents.some(e => e.event.uuid === 'todo-rep-1' && (e.event as Todo).event_time?.time_type === 'at' && (e.event as Todo).event_time?.timestamp === currentTs)).toBe(false)
    expect(allEvents.some(e => e.event.uuid === 'todo-rep-1')).toBe(true)
    expect(useCurrentTodosStore.getState().todos.some(t => t.uuid === 'todo-rep-1')).toBe(false)
  })

  it('반복 todo를 "this" 범위로 삭제할 때 다음 턴이 없으면 완전히 삭제된다', async () => {
    // given
    const { todoApi } = await import('../../src/api/todoApi')
    vi.mocked(todoApi.deleteTodo).mockResolvedValue({ status: 'ok' })

    const currentTs = ts(2025, 3, 15)
    const currentTurn = 5
    const todo: Todo = {
      uuid: 'todo-rep-last',
      name: 'Repeating Todo Last Turn',
      is_current: true,
      event_time: atTime(currentTs),
      repeating: { ...DAILY_REPEATING, end_count: currentTurn }, // 다음 턴(6) > end_count(5) → nextRepeatingTime returns null
      repeating_turn: currentTurn,
    }
    useCalendarEventsStore.getState().addEvent({ type: 'todo', event: todo })
    useCurrentTodosStore.getState().addTodo(todo)

    // when
    await deleteTodoEvent(todo, 'this')

    // then: 완전히 삭제됨
    const allEvents = [...useCalendarEventsStore.getState().eventsByDate.values()].flat()
    expect(allEvents.some(e => e.event.uuid === 'todo-rep-last')).toBe(false)
    expect(useCurrentTodosStore.getState().todos.some(t => t.uuid === 'todo-rep-last')).toBe(false)
  })

  it('반복 todo "future" 삭제 → 시리즈 종료', async () => {
    // given
    const { todoApi } = await import('../../src/api/todoApi')
    const currentTs = ts(2025, 3, 15)
    const todo: Todo = {
      uuid: 'todo-rep-2',
      name: 'Repeating Todo Future',
      is_current: false,
      event_time: atTime(currentTs),
      repeating: DAILY_REPEATING,
      repeating_turn: 3,
    }
    const endedTodo: Todo = {
      ...todo,
      repeating: { ...DAILY_REPEATING, end: currentTs - 1 },
    }
    vi.mocked(todoApi.patchTodo).mockResolvedValue(endedTodo)

    useCalendarEventsStore.getState().addEvent({ type: 'todo', event: todo })

    // when
    await deleteTodoEvent(todo, 'future')

    // then: 기존 이벤트는 제거되고, ended todo 이벤트 없음 (event_time 유지하면 다시 추가)
    const allEvents = [...useCalendarEventsStore.getState().eventsByDate.values()].flat()
    // endedTodo has event_time so it gets added back
    expect(allEvents.some(e => e.event.uuid === 'todo-rep-2')).toBe(true)
  })

  it('반복 todo를 "all" 범위로 삭제하면 calendarEventsStore와 currentTodosStore에서 완전히 제거된다', async () => {
    // given
    const { todoApi } = await import('../../src/api/todoApi')
    vi.mocked(todoApi.deleteTodo).mockResolvedValue(undefined as any)
    const todo: Todo = {
      uuid: 'todo-rep-all',
      name: 'Daily',
      is_current: true,
      event_time: atTime(ts(2025, 3, 15)),
      repeating: DAILY_REPEATING,
      repeating_turn: 3,
    }
    useCalendarEventsStore.getState().addEvent({ type: 'todo', event: todo })
    useCurrentTodosStore.getState().addTodo(todo)

    // when
    await deleteTodoEvent(todo, 'all')

    // then
    const allEvents = [...useCalendarEventsStore.getState().eventsByDate.values()].flat()
    expect(allEvents.some(e => e.event.uuid === 'todo-rep-all')).toBe(false)
    expect(useCurrentTodosStore.getState().todos.some(t => t.uuid === 'todo-rep-all')).toBe(false)
  })
})

describe('deleteScheduleEvent', () => {
  beforeEach(() => {
    useCalendarEventsStore.setState({ eventsByDate: new Map(), loading: false, loadedYears: new Set() })
    vi.clearAllMocks()
  })

  it('비반복 schedule 삭제 → calendarEventsStore에서 제거', async () => {
    // given
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    vi.mocked(scheduleApi.deleteSchedule).mockResolvedValue({ status: 'ok' })

    const schedule: Schedule = {
      uuid: 'sch-1',
      name: 'Simple Schedule',
      event_time: atTime(ts(2025, 3, 20)),
    }
    useCalendarEventsStore.getState().addEvent({ type: 'schedule', event: schedule })

    // when
    await deleteScheduleEvent(schedule)

    // then
    const allEvents = [...useCalendarEventsStore.getState().eventsByDate.values()].flat()
    expect(allEvents.some(e => e.event.uuid === 'sch-1')).toBe(false)
  })

  // 이슈 #60 관련: "this" 삭제 후에도 나머지 반복 인스턴스가 여러 날짜에 남아있어야 한다
  it('반복 schedule "this" 삭제 후 나머지 turn들이 여러 날짜에 여전히 표시된다 (issue #60 regression)', async () => {
    // given: 매일 반복, 현재 turn 2 삭제
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    const eventTs = ts(2025, 4, 1)
    const schedule: Schedule = {
      uuid: 'sch-rep-multi',
      name: 'Daily Repeating',
      event_time: atTime(eventTs),
      repeating: DAILY_REPEATING,
      show_turns: [2],
      exclude_repeatings: [],
    }
    const excludedSchedule: Schedule = {
      ...schedule,
      exclude_repeatings: [2],
    }
    vi.mocked(scheduleApi.excludeRepeating).mockResolvedValue(excludedSchedule)

    // 여러 turn 인스턴스가 각 날짜에 있는 상태
    for (let turn = 1; turn <= 5; turn++) {
      const dayOffset = turn - 1
      const instanceTs = eventTs + dayOffset * 86400
      useCalendarEventsStore.getState().addEvent({
        type: 'schedule',
        event: { ...schedule, event_time: atTime(instanceTs), show_turns: [turn] },
      })
    }

    // when: turn 2 삭제
    await deleteScheduleEvent(schedule, 'this')

    // then: 다른 turn들은 다른 날짜에 여전히 존재해야 한다
    const state = useCalendarEventsStore.getState()
    // 매일 반복이니까 4/1, 4/3, 4/4, 4/5 등 여러 날짜에 남아야 함 (4/2의 turn 2만 제외)
    const daysWithEvent: string[] = []
    for (const [key, events] of state.eventsByDate) {
      if (events.some(e => e.event.uuid === 'sch-rep-multi')) {
        daysWithEvent.push(key)
      }
    }
    expect(daysWithEvent.length).toBeGreaterThanOrEqual(3)
  })

  it('반복 schedule "this" 삭제 → excludeRepeating으로 회차 제외', async () => {
    // given
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    const eventTs = ts(2025, 4, 1)
    const schedule: Schedule = {
      uuid: 'sch-rep-1',
      name: 'Repeating Schedule',
      event_time: atTime(eventTs),
      repeating: DAILY_REPEATING,
      show_turns: [2],
      exclude_repeatings: [],
    }
    const excludedSchedule: Schedule = {
      ...schedule,
      exclude_repeatings: [2],
    }
    vi.mocked(scheduleApi.excludeRepeating).mockResolvedValue(excludedSchedule)

    useCalendarEventsStore.getState().addEvent({ type: 'schedule', event: schedule })

    // when
    await deleteScheduleEvent(schedule, 'this')

    // then: 기존 이벤트 제거되고 excluded 일정이 추가됨
    const allEvents = [...useCalendarEventsStore.getState().eventsByDate.values()].flat()
    expect(allEvents.some(e => e.event.uuid === 'sch-rep-1')).toBe(true)
    const found = allEvents.find(e => e.event.uuid === 'sch-rep-1')
    expect((found?.event as Schedule).exclude_repeatings).toContain(2)
  })

  it('반복 schedule "all" 삭제 → 완전 삭제', async () => {
    // given
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    vi.mocked(scheduleApi.deleteSchedule).mockResolvedValue({ status: 'ok' })

    const schedule: Schedule = {
      uuid: 'sch-rep-2',
      name: 'Repeating Schedule All',
      event_time: atTime(ts(2025, 4, 5)),
      repeating: DAILY_REPEATING,
    }
    useCalendarEventsStore.getState().addEvent({ type: 'schedule', event: schedule })

    // when
    await deleteScheduleEvent(schedule, 'all')

    // then
    const allEvents = [...useCalendarEventsStore.getState().eventsByDate.values()].flat()
    expect(allEvents.some(e => e.event.uuid === 'sch-rep-2')).toBe(false)
  })

  it('반복 schedule "future" 삭제 → 시리즈 종료', async () => {
    // given
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    const eventTs = ts(2025, 4, 10)
    const schedule: Schedule = {
      uuid: 'sch-rep-3',
      name: 'Repeating Schedule Future',
      event_time: atTime(eventTs),
      repeating: DAILY_REPEATING,
    }
    const endedSchedule: Schedule = {
      ...schedule,
      repeating: { ...DAILY_REPEATING, end: eventTs - 1 },
    }
    vi.mocked(scheduleApi.updateSchedule).mockResolvedValue(endedSchedule)

    useCalendarEventsStore.getState().addEvent({ type: 'schedule', event: schedule })

    // when
    await deleteScheduleEvent(schedule, 'future')

    // then: 기존 이벤트 제거되고, ended 일정이 추가됨
    const allEvents = [...useCalendarEventsStore.getState().eventsByDate.values()].flat()
    expect(allEvents.some(e => e.event.uuid === 'sch-rep-3')).toBe(true)
    const found = allEvents.find(e => e.event.uuid === 'sch-rep-3')
    expect((found?.event as Schedule).repeating?.end).toBe(eventTs - 1)
  })
})
