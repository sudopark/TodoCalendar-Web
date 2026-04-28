import { describe, it, expect } from 'vitest'
import {
  eventTimeToStartDate,
  eventTimeToEndDate,
  dateToTimestamp,
  dayRange,
  monthRange,
  yearRange,
  groupEventsByDate,
  formatDateKey,
  eventTimeOverlapsRange,
} from '../../../src/domain/functions/eventTime'
import type { EventTime, Todo, Schedule } from '../../../src/models'

describe('eventTimeToStartDate', () => {
  it('"at" 타입이면 timestamp를 Date로 변환한다', () => {
    const et: EventTime = { time_type: 'at', timestamp: 1700000000 }
    const date = eventTimeToStartDate(et)
    expect(date.getTime()).toBe(1700000000 * 1000)
  })

  it('"period" 타입이면 period_start를 Date로 변환한다', () => {
    const et: EventTime = { time_type: 'period', period_start: 1700000000, period_end: 1700100000 }
    const date = eventTimeToStartDate(et)
    expect(date.getTime()).toBe(1700000000 * 1000)
  })

  it('"allday" 타입이면 period_start + seconds_from_gmt로 변환한다', () => {
    const et: EventTime = { time_type: 'allday', period_start: 1700000000, period_end: 1700086400, seconds_from_gmt: 32400 }
    const date = eventTimeToStartDate(et)
    expect(date.getTime()).toBe((1700000000 + 32400) * 1000)
  })
})

describe('eventTimeToEndDate', () => {
  it('"period" 타입이면 period_end를 Date로 변환한다', () => {
    const et: EventTime = { time_type: 'period', period_start: 1700000000, period_end: 1700100000 }
    const date = eventTimeToEndDate(et)
    expect(date.getTime()).toBe(1700100000 * 1000)
  })
})

describe('dateToTimestamp', () => {
  it('Date를 Unix timestamp(초)로 변환한다', () => {
    const date = new Date(1700000000 * 1000)
    expect(dateToTimestamp(date)).toBe(1700000000)
  })
})

describe('dayRange', () => {
  it('주어진 날짜의 시작~끝 timestamp를 반환한다', () => {
    const date = new Date(2024, 5, 15, 12, 30)
    const range = dayRange(date)
    const start = new Date(range.lower * 1000)
    const end = new Date(range.upper * 1000)
    expect(start.getHours()).toBe(0)
    expect(start.getMinutes()).toBe(0)
    expect(end.getHours()).toBe(23)
    expect(end.getMinutes()).toBe(59)
  })
})

describe('monthRange', () => {
  it('주어진 연/월의 첫째날~마지막날 timestamp를 반환한다', () => {
    const range = monthRange(2024, 1) // February
    const start = new Date(range.lower * 1000)
    const end = new Date(range.upper * 1000)
    expect(start.getDate()).toBe(1)
    expect(start.getMonth()).toBe(1)
    expect(end.getDate()).toBe(29) // 2024 is a leap year
    expect(end.getMonth()).toBe(1)
  })
})

describe('formatDateKey', () => {
  it('날짜를 YYYY-MM-DD 문자열로 변환한다', () => {
    const date = new Date(2024, 0, 5)
    expect(formatDateKey(date)).toBe('2024-01-05')
  })
})

describe('groupEventsByDate', () => {
  it('Todo와 Schedule을 날짜별로 그룹핑한다', () => {
    const lower = dateToTimestamp(new Date(2024, 5, 1))
    const upper = dateToTimestamp(new Date(2024, 5, 30, 23, 59, 59))

    const todos: Todo[] = [
      {
        uuid: 't1',
        name: 'Todo 1',
        is_current: false,
        event_time: { time_type: 'at', timestamp: dateToTimestamp(new Date(2024, 5, 15, 10, 0)) },
      },
    ]
    const schedules: Schedule[] = [
      {
        uuid: 's1',
        name: 'Schedule 1',
        event_time: { time_type: 'period', period_start: dateToTimestamp(new Date(2024, 5, 10, 9, 0)), period_end: dateToTimestamp(new Date(2024, 5, 10, 17, 0)) },
      },
    ]

    const result = groupEventsByDate(todos, schedules, lower, upper)
    expect(result.get('2024-06-15')).toHaveLength(1)
    expect(result.get('2024-06-15')![0].type).toBe('todo')
    expect(result.get('2024-06-10')).toHaveLength(1)
    expect(result.get('2024-06-10')![0].type).toBe('schedule')
  })

  it('기간 이벤트는 여러 날짜에 걸쳐 나타난다', () => {
    const lower = dateToTimestamp(new Date(2024, 5, 1))
    const upper = dateToTimestamp(new Date(2024, 5, 30, 23, 59, 59))

    const schedules: Schedule[] = [
      {
        uuid: 's1',
        name: 'Multi-day',
        event_time: {
          time_type: 'period',
          period_start: dateToTimestamp(new Date(2024, 5, 10, 9, 0)),
          period_end: dateToTimestamp(new Date(2024, 5, 12, 17, 0)),
        },
      },
    ]

    const result = groupEventsByDate([], schedules, lower, upper)
    expect(result.get('2024-06-10')).toHaveLength(1)
    expect(result.get('2024-06-11')).toHaveLength(1)
    expect(result.get('2024-06-12')).toHaveLength(1)
  })

  it('년도 경계를 넘는 multi-day 이벤트는 [lower, upper] 안의 날짜에만 배치된다 (#76)', () => {
    // given: 2025-12-31 ~ 2026-01-02 까지 걸친 schedule
    const schedules: Schedule[] = [
      {
        uuid: 'cross',
        name: 'Cross-year',
        event_time: {
          time_type: 'period',
          period_start: dateToTimestamp(new Date(2025, 11, 31, 10, 0)),
          period_end: dateToTimestamp(new Date(2026, 0, 2, 18, 0)),
        },
      },
    ]

    // when: 2026 year fetch
    const lower = dateToTimestamp(new Date(2026, 0, 1))
    const upper = dateToTimestamp(new Date(2026, 11, 31, 23, 59, 59))
    const result = groupEventsByDate([], schedules, lower, upper)

    // then: 2025-12-31은 배치되지 않고 2026 안의 날짜에만 배치
    expect(result.get('2025-12-31')).toBeUndefined()
    expect(result.get('2026-01-01')).toHaveLength(1)
    expect(result.get('2026-01-02')).toHaveLength(1)
  })

  it('범위 밖의 이벤트는 포함하지 않는다', () => {
    const lower = dateToTimestamp(new Date(2024, 5, 1))
    const upper = dateToTimestamp(new Date(2024, 5, 30, 23, 59, 59))

    const todos: Todo[] = [
      {
        uuid: 't1',
        name: 'Outside',
        is_current: false,
        event_time: { time_type: 'at', timestamp: dateToTimestamp(new Date(2024, 6, 5, 10, 0)) },
      },
    ]

    const result = groupEventsByDate(todos, [], lower, upper)
    expect(result.size).toBe(0)
  })

  it('매일 반복 schedule을 기간 내 모든 날짜에 배치한다', () => {
    // given: 2024-06-10 10시 매일 반복, 2024-06-30까지 조회
    const lower = dateToTimestamp(new Date(2024, 5, 1))
    const upper = dateToTimestamp(new Date(2024, 5, 30, 23, 59, 59))
    const startTs = dateToTimestamp(new Date(2024, 5, 10, 10, 0))

    const schedules: Schedule[] = [
      {
        uuid: 's-repeat',
        name: 'Daily',
        event_time: { time_type: 'at', timestamp: startTs },
        repeating: {
          start: startTs,
          option: { optionType: 'every_day', interval: 1 },
        },
      },
    ]

    // when
    const result = groupEventsByDate([], schedules, lower, upper)

    // then: 6/10 ~ 6/30, 21일 모두 표시되어야 한다
    for (let d = 10; d <= 30; d++) {
      const key = `2024-06-${String(d).padStart(2, '0')}`
      expect(result.get(key), `${key} should have the repeating event`).toHaveLength(1)
    }
  })

  it('반복 todo는 현재 turn(event_time)에만 표시된다 — 완료/건너뛰기 시 서버가 다음 turn으로 이동', () => {
    // given: iOS 앱과 동일하게 Todo는 한 번에 하나의 인스턴스만 존재
    const lower = dateToTimestamp(new Date(2024, 5, 1))
    const upper = dateToTimestamp(new Date(2024, 5, 30, 23, 59, 59))
    const startTs = dateToTimestamp(new Date(2024, 5, 15, 9, 0))

    const todos: Todo[] = [
      {
        uuid: 't-repeat',
        name: 'Weekly Todo',
        is_current: false,
        event_time: { time_type: 'at', timestamp: startTs },
        repeating: {
          start: startTs,
          option: { optionType: 'every_week', interval: 1, dayOfWeek: [6], timeZone: 'Asia/Seoul' },
        },
        repeating_turn: 1,
      },
    ]

    // when
    const result = groupEventsByDate(todos, [], lower, upper)

    // then: 현재 turn(6/15)에만 표시, 다른 주 토요일(6/22, 6/29)은 없다
    expect(result.get('2024-06-15')).toHaveLength(1)
    expect(result.get('2024-06-22')).toBeUndefined()
    expect(result.get('2024-06-29')).toBeUndefined()
  })

  it('반복 이벤트 각 인스턴스는 고유 turn을 가진다', () => {
    // given: 매일 반복, 3개 인스턴스
    const lower = dateToTimestamp(new Date(2024, 5, 1))
    const upper = dateToTimestamp(new Date(2024, 5, 30, 23, 59, 59))
    const startTs = dateToTimestamp(new Date(2024, 5, 10, 10, 0))

    const schedules: Schedule[] = [
      {
        uuid: 's-turn',
        name: 'Daily',
        event_time: { time_type: 'at', timestamp: startTs },
        repeating: {
          start: startTs,
          option: { optionType: 'every_day', interval: 1 },
          end_count: 3,
        },
      },
    ]

    // when
    const result = groupEventsByDate([], schedules, lower, upper)

    // then: 각 인스턴스의 show_turns가 해당 turn 번호를 가진다
    const e1 = result.get('2024-06-10')![0]
    const e2 = result.get('2024-06-11')![0]
    const e3 = result.get('2024-06-12')![0]
    expect((e1.event as Schedule).show_turns).toEqual([1])
    expect((e2.event as Schedule).show_turns).toEqual([2])
    expect((e3.event as Schedule).show_turns).toEqual([3])
  })

  it('exclude_repeatings에 있는 turn은 건너뛴다', () => {
    // given: 매일 반복, turn 2 제외
    const lower = dateToTimestamp(new Date(2024, 5, 1))
    const upper = dateToTimestamp(new Date(2024, 5, 30, 23, 59, 59))
    const startTs = dateToTimestamp(new Date(2024, 5, 10, 10, 0))

    const schedules: Schedule[] = [
      {
        uuid: 's-excl',
        name: 'Daily excl',
        event_time: { time_type: 'at', timestamp: startTs },
        repeating: {
          start: startTs,
          option: { optionType: 'every_day', interval: 1 },
          end_count: 4,
        },
        exclude_repeatings: [2],
      },
    ]

    // when
    const result = groupEventsByDate([], schedules, lower, upper)

    // then: 6/10(turn1), 6/12(turn3), 6/13(turn4) — 6/11은 없어야 한다
    expect(result.get('2024-06-10')).toHaveLength(1)
    expect(result.get('2024-06-11')).toBeUndefined()
    expect(result.get('2024-06-12')).toHaveLength(1)
    expect(result.get('2024-06-13')).toHaveLength(1)
  })
})

describe('yearRange', () => {
  it('주어진 년도의 1월1일 00:00:00 ~ 12월31일 23:59:59 타임스탬프를 반환한다', () => {
    const range = yearRange(2025)
    const expectedLower = Math.floor(new Date(2025, 0, 1, 0, 0, 0, 0).getTime() / 1000)
    const expectedUpper = Math.floor(new Date(2025, 11, 31, 23, 59, 59, 999).getTime() / 1000)
    expect(range.lower).toBe(expectedLower)
    expect(range.upper).toBe(expectedUpper)
  })
})

describe('eventTimeOverlapsRange', () => {
  it('at 이벤트가 범위 안에 있으면 true를 반환한다', () => {
    const et: EventTime = { time_type: 'at', timestamp: 1000 }
    expect(eventTimeOverlapsRange(et, 900, 1100)).toBe(true)
  })

  it('at 이벤트가 범위 밖에 있으면 false를 반환한다', () => {
    const et: EventTime = { time_type: 'at', timestamp: 500 }
    expect(eventTimeOverlapsRange(et, 900, 1100)).toBe(false)
  })
})
