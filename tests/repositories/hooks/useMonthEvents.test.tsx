import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('../../../src/api/todoApi', () => ({ todoApi: {} }))
vi.mock('../../../src/api/scheduleApi', () => ({ scheduleApi: {} }))

import { useCalendarEventsCache } from '../../../src/repositories/caches/calendarEventsCache'
import { useMonthEvents } from '../../../src/repositories/hooks/useMonthEvents'
import type { Todo } from '../../../src/models/Todo'
import type { Schedule } from '../../../src/models/Schedule'

// 2025-03 기준 timestamp
const MAR_10_TS = Math.floor(new Date(2025, 2, 10, 12, 0, 0).getTime() / 1000)
const MAR_20_TS = Math.floor(new Date(2025, 2, 20, 12, 0, 0).getTime() / 1000)
const APR_05_TS = Math.floor(new Date(2025, 3, 5, 12, 0, 0).getTime() / 1000)

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
    event_time: override.event_time ?? { time_type: 'at', timestamp: MAR_10_TS },
    ...override,
  }
}

beforeEach(() => {
  useCalendarEventsCache.setState({ eventsByDate: new Map(), loading: false, loadedYears: new Set() })
  vi.clearAllMocks()
})

describe('useMonthEvents', () => {
  it('해당 월의 이벤트만 반환한다 — 다른 월 이벤트는 포함되지 않는다', () => {
    // given: 3월과 4월에 각각 이벤트 배치
    const marchTodo = makeTodo({ uuid: 'mar-t', event_time: { time_type: 'at', timestamp: MAR_10_TS } })
    const aprilTodo = makeTodo({ uuid: 'apr-t', event_time: { time_type: 'at', timestamp: APR_05_TS } })
    useCalendarEventsCache.getState().addEvent({ type: 'todo', event: marchTodo })
    useCalendarEventsCache.getState().addEvent({ type: 'todo', event: aprilTodo })

    // when: 2025년 3월(month=2) 구독
    const { result } = renderHook(() => useMonthEvents(2025, 2))

    // then: 3월 이벤트만 반환, 4월 이벤트는 포함되지 않아야 한다
    expect(result.current.some(e => e.event.uuid === 'mar-t')).toBe(true)
    expect(result.current.some(e => e.event.uuid === 'apr-t')).toBe(false)
  })

  it('캐시에 이벤트가 추가되면 hook 결과도 갱신된다', () => {
    // given: 초기엔 빈 캐시
    const { result } = renderHook(() => useMonthEvents(2025, 2))
    expect(result.current).toHaveLength(0)

    // when: 3월 이벤트 추가
    const newSchedule = makeSchedule({ uuid: 'new-sch', event_time: { time_type: 'at', timestamp: MAR_20_TS } })
    act(() => {
      useCalendarEventsCache.getState().addEvent({ type: 'schedule', event: newSchedule })
    })

    // then: hook 결과에 새 이벤트가 포함되어야 한다
    expect(result.current.some(e => e.event.uuid === 'new-sch')).toBe(true)
  })

  it('replaceMonth 후 반복 schedule의 모든 인스턴스가 포함된다', () => {
    // given: 매일 반복 schedule을 3월 데이터로 채운 캐시
    const startTs = Math.floor(new Date(2025, 2, 1, 10, 0, 0).getTime() / 1000)
    const dailySchedule: Schedule = {
      uuid: 'daily-sch',
      name: '매일 회의',
      event_time: { time_type: 'at', timestamp: startTs },
      repeating: {
        start: startTs,
        option: { optionType: 'every_day', interval: 1 },
      },
    }
    act(() => {
      useCalendarEventsCache.getState().replaceMonth(2025, 2, [], [dailySchedule])
    })

    // when: 3월(month=2) 구독
    const { result } = renderHook(() => useMonthEvents(2025, 2))

    // then: 3/1, 3/15, 3/31 모두 포함되어야 한다
    expect(result.current.some(e => e.event.uuid === 'daily-sch')).toBe(true)
    // 여러 인스턴스(31일치)가 존재해야 한다
    expect(result.current.filter(e => e.event.uuid === 'daily-sch').length).toBeGreaterThan(1)
  })
})
