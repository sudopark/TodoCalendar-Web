import { describe, it, expect, beforeEach } from 'vitest'
import { useCalendarEventsCache } from '../../../src/repositories/caches/calendarEventsCache'
import type { CalendarEvent } from '../../../src/domain/functions/eventTime'

const MARCH31_TIMESTAMP = 1743375600
const MARCH31_KEY = '2025-03-31'

function makeTodoEvent(uuid: string, name: string, timestamp: number): CalendarEvent {
  return {
    type: 'todo',
    event: { uuid, name, is_current: false, event_time: { time_type: 'at', timestamp } },
  }
}

describe('calendarEventsCache — invalidateYears', () => {
  beforeEach(() => {
    useCalendarEventsCache.setState({ eventsByDate: new Map(), loading: false, loadedYears: new Set() })
  })

  it('invalidateYears 호출 시 해당 연도의 캐시 항목이 제거되고 loadedYears에서도 빠진다', () => {
    // given: 2025년 데이터가 캐시에 있는 상태
    const event = makeTodoEvent('t1', 'Task', MARCH31_TIMESTAMP)
    const populated = new Map([[MARCH31_KEY, [event]]])
    useCalendarEventsCache.setState({ eventsByDate: populated, loadedYears: new Set([2025]) })

    // when: 2025년 무효화
    useCalendarEventsCache.getState().invalidateYears([2025])

    // then: 2025년 항목 없어지고 loadedYears 도 비워짐
    const state = useCalendarEventsCache.getState()
    expect(state.eventsByDate.has(MARCH31_KEY)).toBe(false)
    expect(state.loadedYears.has(2025)).toBe(false)
  })

  it('무효화하지 않은 연도 데이터는 그대로 보존된다', () => {
    // given: 2024·2025 양쪽 데이터가 있는 상태
    const event2024 = makeTodoEvent('t24', 'Old', Math.floor(new Date(2024, 5, 1, 12).getTime() / 1000))
    const event2025 = makeTodoEvent('t25', 'Task', MARCH31_TIMESTAMP)
    const populated = new Map<string, CalendarEvent[]>([
      ['2024-06-01', [event2024]],
      [MARCH31_KEY, [event2025]],
    ])
    useCalendarEventsCache.setState({ eventsByDate: populated, loadedYears: new Set([2024, 2025]) })

    // when: 2025만 무효화
    useCalendarEventsCache.getState().invalidateYears([2025])

    // then: 2024 데이터는 보존, 2025는 제거
    const state = useCalendarEventsCache.getState()
    expect(state.eventsByDate.has('2024-06-01')).toBe(true)
    expect(state.eventsByDate.has(MARCH31_KEY)).toBe(false)
    expect(state.loadedYears.has(2024)).toBe(true)
    expect(state.loadedYears.has(2025)).toBe(false)
  })
})

describe('calendarEventsCache — mutation', () => {
  beforeEach(() => {
    useCalendarEventsCache.setState({ eventsByDate: new Map(), loading: false, loadedYears: new Set() })
  })

  it('addEvent를 호출하면 해당 이벤트를 날짜별 목록에서 조회할 수 있다', () => {
    const newTodo = { uuid: 'new-1', name: '새 할 일', is_current: false, event_time: { time_type: 'at' as const, timestamp: MARCH31_TIMESTAMP } }
    useCalendarEventsCache.getState().addEvent({ type: 'todo', event: newTodo })

    const events = useCalendarEventsCache.getState().eventsByDate.get(MARCH31_KEY)
    expect(events?.some(e => e.event.uuid === 'new-1')).toBe(true)
  })

  it('removeEvent를 호출하면 해당 이벤트를 더 이상 조회할 수 없다', () => {
    // given: 캐시에 todo가 있는 상태
    const event = makeTodoEvent('todo-1', 'Task', MARCH31_TIMESTAMP)
    useCalendarEventsCache.setState({ eventsByDate: new Map([[MARCH31_KEY, [event]]]) })

    // when
    useCalendarEventsCache.getState().removeEvent('todo-1')

    // then
    const events = useCalendarEventsCache.getState().eventsByDate.get(MARCH31_KEY) ?? []
    expect(events.some(e => e.event.uuid === 'todo-1')).toBe(false)
  })

  it('replaceEvent를 호출하면 기존 이벤트가 새 이벤트로 교체된다', () => {
    // given
    const original = makeTodoEvent('todo-1', '원래 이름', MARCH31_TIMESTAMP)
    useCalendarEventsCache.setState({ eventsByDate: new Map([[MARCH31_KEY, [original]]]) })

    // when
    const updated = { uuid: 'todo-1', name: '수정된 이름', is_current: false, event_time: { time_type: 'at' as const, timestamp: MARCH31_TIMESTAMP } }
    useCalendarEventsCache.getState().replaceEvent('todo-1', { type: 'todo', event: updated })

    // then
    const events = useCalendarEventsCache.getState().eventsByDate.get(MARCH31_KEY) ?? []
    expect(events.find(e => e.event.uuid === 'todo-1')?.event.name).toBe('수정된 이름')
  })

  it('replaceMonth 호출 시 단일 todo/schedule이 해당 날짜에 배치된다', () => {
    const MAR_10_TS = Math.floor(new Date(2025, 2, 10, 12, 0, 0).getTime() / 1000)
    const todo = { uuid: 't-rep', name: '할 일', is_current: false, event_time: { time_type: 'at' as const, timestamp: MAR_10_TS } }
    const sch = { uuid: 's-rep', name: '일정', event_time: { time_type: 'at' as const, timestamp: MARCH31_TIMESTAMP } }

    useCalendarEventsCache.getState().replaceMonth(2025, 2, [todo], [sch])

    const state = useCalendarEventsCache.getState()
    expect(state.eventsByDate.get('2025-03-10')?.some(e => e.event.uuid === 't-rep')).toBe(true)
    expect(state.eventsByDate.get('2025-03-31')?.some(e => e.event.uuid === 's-rep')).toBe(true)
  })

  it('replaceMonth 후 반복 schedule의 모든 인스턴스가 해당 월에 보존된다 (Fix 2 회귀 가드)', () => {
    const startTs = Math.floor(new Date(2025, 2, 1, 10, 0, 0).getTime() / 1000)
    const dailySchedule = {
      uuid: 'daily',
      name: '매일',
      event_time: { time_type: 'at' as const, timestamp: startTs },
      repeating: {
        start: startTs,
        option: { optionType: 'every_day' as const, interval: 1 },
      },
    }

    useCalendarEventsCache.getState().replaceMonth(2025, 2, [], [dailySchedule])

    const state = useCalendarEventsCache.getState()
    expect(state.eventsByDate.get('2025-03-01')?.some(e => e.event.uuid === 'daily')).toBe(true)
    expect(state.eventsByDate.get('2025-03-15')?.some(e => e.event.uuid === 'daily')).toBe(true)
    expect(state.eventsByDate.get('2025-03-31')?.some(e => e.event.uuid === 'daily')).toBe(true)
  })

  it('replaceMonth 후 다른 월 데이터는 건드리지 않는다', () => {
    const APR_05_TS = Math.floor(new Date(2025, 3, 5, 12, 0, 0).getTime() / 1000)
    const aprilTodo = { uuid: 'apr-t', name: '4월 할 일', is_current: false, event_time: { time_type: 'at' as const, timestamp: APR_05_TS } }
    useCalendarEventsCache.getState().addEvent({ type: 'todo', event: aprilTodo })

    const marchTodo = { uuid: 'mar-t', name: '3월 할 일', is_current: false, event_time: { time_type: 'at' as const, timestamp: MARCH31_TIMESTAMP } }
    useCalendarEventsCache.getState().replaceMonth(2025, 2, [marchTodo], [])

    const state = useCalendarEventsCache.getState()
    expect(state.eventsByDate.get('2025-04-05')?.some(e => e.event.uuid === 'apr-t')).toBe(true)
    expect(state.eventsByDate.get('2025-03-31')?.some(e => e.event.uuid === 'mar-t')).toBe(true)
  })

  it('빈 배열로 replaceMonth 하면 해당 월이 비워진다', () => {
    const marchTodo = { uuid: 'existing', name: '기존', is_current: false, event_time: { time_type: 'at' as const, timestamp: MARCH31_TIMESTAMP } }
    useCalendarEventsCache.getState().addEvent({ type: 'todo', event: marchTodo })

    useCalendarEventsCache.getState().replaceMonth(2025, 2, [], [])

    const state = useCalendarEventsCache.getState()
    expect(state.eventsByDate.get(MARCH31_KEY)?.some(e => e.event.uuid === 'existing')).toBeFalsy()
  })

  it('reset 호출 시 초기 상태로 돌아간다', () => {
    const event = makeTodoEvent('todo-1', 'Task', MARCH31_TIMESTAMP)
    useCalendarEventsCache.setState({ eventsByDate: new Map([[MARCH31_KEY, [event]]]), loadedYears: new Set([2025]) })

    useCalendarEventsCache.getState().reset()

    const state = useCalendarEventsCache.getState()
    expect(state.eventsByDate.size).toBe(0)
    expect(state.loadedYears.size).toBe(0)
  })
})
