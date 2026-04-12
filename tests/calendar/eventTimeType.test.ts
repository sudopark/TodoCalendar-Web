import { describe, it, expect, vi } from 'vitest'
import { getEventTimeType } from '../../src/calendar/MainCalendarGrid'

vi.mock('../../src/firebase', () => ({ auth: {} }))
vi.mock('../../src/api/todoApi', () => ({
  todoApi: { getTodos: vi.fn(async () => []) },
}))
vi.mock('../../src/api/scheduleApi', () => ({
  scheduleApi: { getSchedules: vi.fn(async () => []) },
}))
import type { EventOnWeekRow } from '../../src/calendar/weekEventStackBuilder'

function makeAtTimeTodo(): EventOnWeekRow {
  return {
    event: {
      type: 'todo',
      event: {
        uuid: 't1',
        name: '시점 할 일',
        is_current: false,
        event_tag_id: null,
        event_time: { time_type: 'at', timestamp: 1700000000 },
      },
    },
    startCol: 1,
    endCol: 1,
  }
}

function makeTodoWithoutEventTime(): EventOnWeekRow {
  return {
    event: {
      type: 'todo',
      event: {
        uuid: 't2',
        name: '이벤트 시간 없는 할 일',
        is_current: false,
        event_tag_id: null,
        event_time: null,
      },
    },
    startCol: 2,
    endCol: 2,
  }
}

function makePeriodSchedule(): EventOnWeekRow {
  return {
    event: {
      type: 'schedule',
      event: {
        uuid: 's1',
        name: '기간 일정',
        event_tag_id: null,
        event_time: { time_type: 'period', period_start: 1700000000, period_end: 1700086400 },
      },
    },
    startCol: 1,
    endCol: 2,
  }
}

function makeAllDaySchedule(): EventOnWeekRow {
  return {
    event: {
      type: 'schedule',
      event: {
        uuid: 's2',
        name: '종일 일정',
        event_tag_id: null,
        event_time: { time_type: 'allday', period_start: 1700000000, period_end: 1700086400, seconds_from_gmt: 32400 },
      },
    },
    startCol: 3,
    endCol: 5,
  }
}

function makeAtTimeSchedule(): EventOnWeekRow {
  return {
    event: {
      type: 'schedule',
      event: {
        uuid: 's3',
        name: '시점 일정',
        event_tag_id: null,
        event_time: { time_type: 'at', timestamp: 1700000000 },
      },
    },
    startCol: 1,
    endCol: 1,
  }
}

describe('getEventTimeType', () => {
  it('todo에 at 타입 event_time이 있으면 at을 반환한다', () => {
    // given
    const ev = makeAtTimeTodo()

    // when
    const result = getEventTimeType(ev)

    // then
    expect(result).toBe('at')
  })

  it('todo에 event_time이 없으면 at을 반환한다', () => {
    // given
    const ev = makeTodoWithoutEventTime()

    // when
    const result = getEventTimeType(ev)

    // then
    expect(result).toBe('at')
  })

  it('schedule에 period 타입 event_time이 있으면 period를 반환한다', () => {
    // given
    const ev = makePeriodSchedule()

    // when
    const result = getEventTimeType(ev)

    // then
    expect(result).toBe('period')
  })

  it('schedule에 allday 타입 event_time이 있으면 allday를 반환한다', () => {
    // given
    const ev = makeAllDaySchedule()

    // when
    const result = getEventTimeType(ev)

    // then
    expect(result).toBe('allday')
  })

  it('schedule에 at 타입 event_time이 있으면 at을 반환한다', () => {
    // given
    const ev = makeAtTimeSchedule()

    // when
    const result = getEventTimeType(ev)

    // then
    expect(result).toBe('at')
  })
})
