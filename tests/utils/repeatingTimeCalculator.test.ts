import { describe, it, expect } from 'vitest'
import {
  nextRepeatingTime,
  enumerateRepeatingTimes,
  shiftEventTime,
  getStartTimestamp,
} from '../../src/utils/repeatingTimeCalculator'
import type { EventTime, Repeating } from '../../src/models'

// Helper: 로컬 Date를 Unix timestamp(초)로 변환
function ts(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): number {
  return Math.floor(new Date(year, month - 1, day, hour, minute, second).getTime() / 1000)
}

describe('shiftEventTime', () => {
  it('at 타입 시간을 interval만큼 시프트한다', () => {
    // given
    const time: EventTime = { time_type: 'at', timestamp: 1000 }
    // when
    const result = shiftEventTime(time, 500)
    // then
    expect(result).toEqual({ time_type: 'at', timestamp: 1500 })
  })

  it('period 타입 시간을 interval만큼 시프트한다', () => {
    // given
    const time: EventTime = { time_type: 'period', period_start: 1000, period_end: 2000 }
    // when
    const result = shiftEventTime(time, 500)
    // then
    expect(result).toEqual({ time_type: 'period', period_start: 1500, period_end: 2500 })
  })

  it('allday 타입 시간을 interval만큼 시프트하되 seconds_from_gmt는 유지한다', () => {
    // given
    const time: EventTime = { time_type: 'allday', period_start: 1000, period_end: 2000, seconds_from_gmt: 32400 }
    // when
    const result = shiftEventTime(time, 86400)
    // then
    expect(result).toEqual({ time_type: 'allday', period_start: 87400, period_end: 88400, seconds_from_gmt: 32400 })
  })
})

describe('nextRepeatingTime - every_day', () => {
  it('interval일 후의 시간을 반환한다', () => {
    // given: 2024-01-15 14:00:00
    const startTs = ts(2024, 1, 15, 14, 0, 0)
    const time: EventTime = { time_type: 'at', timestamp: startTs }
    const repeating: Repeating = {
      start: startTs,
      option: { optionType: 'every_day', interval: 1 },
    }
    // when
    const result = nextRepeatingTime(time, 1, repeating)
    // then: 2024-01-16 14:00:00
    const expectedTs = ts(2024, 1, 16, 14, 0, 0)
    expect(result).not.toBeNull()
    expect(result!.time).toEqual({ time_type: 'at', timestamp: expectedTs })
    expect(result!.turn).toBe(2)
  })

  it('interval=3이면 3일 후를 반환한다', () => {
    // given: 2024-01-15 10:00:00
    const startTs = ts(2024, 1, 15, 10, 0, 0)
    const time: EventTime = { time_type: 'at', timestamp: startTs }
    const repeating: Repeating = {
      start: startTs,
      option: { optionType: 'every_day', interval: 3 },
    }
    // when
    const result = nextRepeatingTime(time, 1, repeating)
    // then: 2024-01-18 10:00:00
    const expectedTs = ts(2024, 1, 18, 10, 0, 0)
    expect(result).not.toBeNull()
    expect(result!.time).toEqual({ time_type: 'at', timestamp: expectedTs })
  })
})

describe('nextRepeatingTime - every_week', () => {
  it('같은 주 다음 요일이 있으면 그 요일로 이동한다', () => {
    // given: 2024-01-15 (월요일=1) → 다음은 수요일(3)
    const startTs = ts(2024, 1, 15, 9, 0, 0)
    const time: EventTime = { time_type: 'at', timestamp: startTs }
    const repeating: Repeating = {
      start: startTs,
      option: { optionType: 'every_week', interval: 1, dayOfWeek: [1, 3, 5], timeZone: 'Asia/Seoul' },
    }
    // when
    const result = nextRepeatingTime(time, 1, repeating)
    // then: 2024-01-17 (수요일) 09:00
    const expectedTs = ts(2024, 1, 17, 9, 0, 0)
    expect(result).not.toBeNull()
    expect(result!.time).toEqual({ time_type: 'at', timestamp: expectedTs })
  })

  it('같은 주 다음 요일이 없으면 interval주 후 첫 요일로 이동한다', () => {
    // given: 2024-01-19 (금요일=5) → 같은 주 다음 없음 → 1주 후 월요일(1)
    const startTs = ts(2024, 1, 19, 9, 0, 0)
    const time: EventTime = { time_type: 'at', timestamp: startTs }
    const repeating: Repeating = {
      start: startTs,
      option: { optionType: 'every_week', interval: 1, dayOfWeek: [1, 3, 5], timeZone: 'Asia/Seoul' },
    }
    // when
    const result = nextRepeatingTime(time, 1, repeating)
    // then: 2024-01-22 (월요일) 09:00
    const expectedTs = ts(2024, 1, 22, 9, 0, 0)
    expect(result).not.toBeNull()
    expect(result!.time).toEqual({ time_type: 'at', timestamp: expectedTs })
  })
})

describe('nextRepeatingTime - every_month (days)', () => {
  it('같은 달에 다음 day가 있으면 그 day로 이동한다', () => {
    // given: 2024-01-10 12:00 → days=[5,15,25]
    const startTs = ts(2024, 1, 10, 12, 0, 0)
    const time: EventTime = { time_type: 'at', timestamp: startTs }
    const repeating: Repeating = {
      start: startTs,
      option: { optionType: 'every_month', interval: 1, monthDaySelection: { days: [5, 15, 25] }, timeZone: 'Asia/Seoul' },
    }
    // when
    const result = nextRepeatingTime(time, 1, repeating)
    // then: 2024-01-15 12:00
    const expectedTs = ts(2024, 1, 15, 12, 0, 0)
    expect(result).not.toBeNull()
    expect(result!.time).toEqual({ time_type: 'at', timestamp: expectedTs })
  })

  it('같은 달에 다음 day가 없으면 interval개월 후 첫 day로 이동한다', () => {
    // given: 2024-01-26 12:00 → days=[5,15,25] → 다음달 5일
    const startTs = ts(2024, 1, 26, 12, 0, 0)
    const time: EventTime = { time_type: 'at', timestamp: startTs }
    const repeating: Repeating = {
      start: startTs,
      option: { optionType: 'every_month', interval: 1, monthDaySelection: { days: [5, 15, 25] }, timeZone: 'Asia/Seoul' },
    }
    // when
    const result = nextRepeatingTime(time, 1, repeating)
    // then: 2024-02-05 12:00
    const expectedTs = ts(2024, 2, 5, 12, 0, 0)
    expect(result).not.toBeNull()
    expect(result!.time).toEqual({ time_type: 'at', timestamp: expectedTs })
  })

  it('31일이 없는 달은 건너뛴다', () => {
    // given: 2024-01-31 12:00 → days=[31] → 2월에 31일 없으므로 3월 31일
    const startTs = ts(2024, 1, 31, 12, 0, 0)
    const time: EventTime = { time_type: 'at', timestamp: startTs }
    const repeating: Repeating = {
      start: startTs,
      option: { optionType: 'every_month', interval: 1, monthDaySelection: { days: [31] }, timeZone: 'Asia/Seoul' },
    }
    // when
    const result = nextRepeatingTime(time, 1, repeating)
    // then: 2024-03-31 12:00
    const expectedTs = ts(2024, 3, 31, 12, 0, 0)
    expect(result).not.toBeNull()
    expect(result!.time).toEqual({ time_type: 'at', timestamp: expectedTs })
  })
})

describe('nextRepeatingTime - every_month (week)', () => {
  it('해당 월의 N째 주 특정 요일을 찾는다', () => {
    // given: 2024-01-08 (2째 주 월요일) → 다음: 2024-02의 2째 월요일 = 2024-02-12
    const startTs = ts(2024, 1, 8, 10, 0, 0)
    const time: EventTime = { time_type: 'at', timestamp: startTs }
    const repeating: Repeating = {
      start: startTs,
      option: {
        optionType: 'every_month',
        interval: 1,
        monthDaySelection: { weekOrdinals: [{ isLast: false, seq: 2 }], weekDays: [1] },
        timeZone: 'Asia/Seoul',
      },
    }
    // when
    const result = nextRepeatingTime(time, 1, repeating)
    // then: 2024-02-12 10:00
    const expectedTs = ts(2024, 2, 12, 10, 0, 0)
    expect(result).not.toBeNull()
    expect(result!.time).toEqual({ time_type: 'at', timestamp: expectedTs })
  })

  it('last 옵션은 마지막 해당 요일을 찾는다', () => {
    // given: 2024-01-29 (마지막 월요일) → 다음: 2024-02 마지막 월요일 = 2024-02-26
    const startTs = ts(2024, 1, 29, 10, 0, 0)
    const time: EventTime = { time_type: 'at', timestamp: startTs }
    const repeating: Repeating = {
      start: startTs,
      option: {
        optionType: 'every_month',
        interval: 1,
        monthDaySelection: { weekOrdinals: [{ isLast: true }], weekDays: [1] },
        timeZone: 'Asia/Seoul',
      },
    }
    // when
    const result = nextRepeatingTime(time, 1, repeating)
    // then: 2024-02-26 10:00
    const expectedTs = ts(2024, 2, 26, 10, 0, 0)
    expect(result).not.toBeNull()
    expect(result!.time).toEqual({ time_type: 'at', timestamp: expectedTs })
  })
})

describe('nextRepeatingTime - every_year_some_day', () => {
  it('interval년 후 같은 월/일을 반환한다', () => {
    // given: 2024-03-20 15:00
    const startTs = ts(2024, 3, 20, 15, 0, 0)
    const time: EventTime = { time_type: 'at', timestamp: startTs }
    const repeating: Repeating = {
      start: startTs,
      option: { optionType: 'every_year_some_day', interval: 1, month: 3, day: 20, timeZone: 'Asia/Seoul' },
    }
    // when
    const result = nextRepeatingTime(time, 1, repeating)
    // then: 2025-03-20 15:00
    const expectedTs = ts(2025, 3, 20, 15, 0, 0)
    expect(result).not.toBeNull()
    expect(result!.time).toEqual({ time_type: 'at', timestamp: expectedTs })
  })
})

describe('nextRepeatingTime - 종료 조건', () => {
  it('end 시간을 초과하면 null을 반환한다', () => {
    // given: 2024-01-15 → 다음: 01-16 but end가 01-15
    const startTs = ts(2024, 1, 15, 14, 0, 0)
    const time: EventTime = { time_type: 'at', timestamp: startTs }
    const repeating: Repeating = {
      start: startTs,
      option: { optionType: 'every_day', interval: 1 },
      end: ts(2024, 1, 15, 23, 59, 59),
    }
    // when
    const result = nextRepeatingTime(time, 1, repeating)
    // then
    expect(result).toBeNull()
  })

  it('end_count를 초과하면 null을 반환한다', () => {
    // given: currentTurn=3, end_count=3 → nextTurn=4 > 3
    const startTs = ts(2024, 1, 15, 14, 0, 0)
    const time: EventTime = { time_type: 'at', timestamp: startTs }
    const repeating: Repeating = {
      start: startTs,
      option: { optionType: 'every_day', interval: 1 },
      end_count: 3,
    }
    // when
    const result = nextRepeatingTime(time, 3, repeating)
    // then
    expect(result).toBeNull()
  })
})

describe('nextRepeatingTime - excludeTurns', () => {
  it('제외된 턴은 건너뛰고 다음 턴을 반환한다', () => {
    // given: turn 2가 제외 → turn 3을 반환
    const startTs = ts(2024, 1, 15, 14, 0, 0)
    const time: EventTime = { time_type: 'at', timestamp: startTs }
    const repeating: Repeating = {
      start: startTs,
      option: { optionType: 'every_day', interval: 1 },
    }
    // when
    const result = nextRepeatingTime(time, 1, repeating, [2])
    // then: turn 2 건너뛰고 turn 3 (2일 후)
    const expectedTs = ts(2024, 1, 17, 14, 0, 0)
    expect(result).not.toBeNull()
    expect(result!.turn).toBe(3)
    expect(result!.time).toEqual({ time_type: 'at', timestamp: expectedTs })
  })

  it('연속 제외 시 반복적으로 건너뛴다', () => {
    // given: turn 2, 3이 제외 → turn 4를 반환
    const startTs = ts(2024, 1, 15, 14, 0, 0)
    const time: EventTime = { time_type: 'at', timestamp: startTs }
    const repeating: Repeating = {
      start: startTs,
      option: { optionType: 'every_day', interval: 1 },
    }
    // when
    const result = nextRepeatingTime(time, 1, repeating, [2, 3])
    // then: turn 4 (3일 후)
    const expectedTs = ts(2024, 1, 18, 14, 0, 0)
    expect(result).not.toBeNull()
    expect(result!.turn).toBe(4)
    expect(result!.time).toEqual({ time_type: 'at', timestamp: expectedTs })
  })
})

describe('enumerateRepeatingTimes', () => {
  it('매일 반복을 기간 끝(rangeEnd)까지 모든 인스턴스로 확장한다', () => {
    // given: 2024-01-15부터 매일 반복, 2024-01-20까지 조회
    const startTs = ts(2024, 1, 15, 9, 0, 0)
    const rangeEnd = ts(2024, 1, 20, 23, 59, 59)
    const time: EventTime = { time_type: 'at', timestamp: startTs }
    const repeating: Repeating = {
      start: startTs,
      option: { optionType: 'every_day', interval: 1 },
    }

    // when
    const result = enumerateRepeatingTimes(time, 1, repeating, undefined, rangeEnd)

    // then: 다음 인스턴스 5개 (1/16, 1/17, 1/18, 1/19, 1/20), turn 2~6
    expect(result).toHaveLength(5)
    expect(result[0].turn).toBe(2)
    expect(result[0].time).toEqual({ time_type: 'at', timestamp: ts(2024, 1, 16, 9, 0, 0) })
    expect(result[4].turn).toBe(6)
    expect(result[4].time).toEqual({ time_type: 'at', timestamp: ts(2024, 1, 20, 9, 0, 0) })
  })

  it('repeating.end로 종료되면 그 이후는 포함하지 않는다', () => {
    // given: 2024-01-15부터 매일, 2024-01-17까지 종료
    const startTs = ts(2024, 1, 15, 9, 0, 0)
    const endTs = ts(2024, 1, 17, 23, 59, 59)
    const rangeEnd = ts(2024, 1, 30, 23, 59, 59)
    const time: EventTime = { time_type: 'at', timestamp: startTs }
    const repeating: Repeating = {
      start: startTs,
      option: { optionType: 'every_day', interval: 1 },
      end: endTs,
    }

    // when
    const result = enumerateRepeatingTimes(time, 1, repeating, undefined, rangeEnd)

    // then: 1/16, 1/17만 포함
    expect(result).toHaveLength(2)
    expect(result[0].time).toEqual({ time_type: 'at', timestamp: ts(2024, 1, 16, 9, 0, 0) })
    expect(result[1].time).toEqual({ time_type: 'at', timestamp: ts(2024, 1, 17, 9, 0, 0) })
  })

  it('exclude_repeatings에 포함된 턴은 건너뛴다', () => {
    // given: 2024-01-15부터 매일, turn 2와 4 제외, 2024-01-19까지 조회
    const startTs = ts(2024, 1, 15, 9, 0, 0)
    const rangeEnd = ts(2024, 1, 19, 23, 59, 59)
    const time: EventTime = { time_type: 'at', timestamp: startTs }
    const repeating: Repeating = {
      start: startTs,
      option: { optionType: 'every_day', interval: 1 },
    }

    // when
    const result = enumerateRepeatingTimes(time, 1, repeating, [2, 4], rangeEnd)

    // then: turn 3(1/17), turn 5(1/19)만 포함
    expect(result).toHaveLength(2)
    expect(result[0].turn).toBe(3)
    expect(result[0].time).toEqual({ time_type: 'at', timestamp: ts(2024, 1, 17, 9, 0, 0) })
    expect(result[1].turn).toBe(5)
    expect(result[1].time).toEqual({ time_type: 'at', timestamp: ts(2024, 1, 19, 9, 0, 0) })
  })

  it('rangeEnd보다 첫 반복이 나중이면 빈 배열을 반환한다', () => {
    // given: 2024-01-15 시작, 2024-01-14까지만 조회
    const startTs = ts(2024, 1, 15, 9, 0, 0)
    const rangeEnd = ts(2024, 1, 14, 23, 59, 59)
    const time: EventTime = { time_type: 'at', timestamp: startTs }
    const repeating: Repeating = {
      start: startTs,
      option: { optionType: 'every_day', interval: 1 },
    }

    // when
    const result = enumerateRepeatingTimes(time, 1, repeating, undefined, rangeEnd)

    // then
    expect(result).toHaveLength(0)
  })

  it('매주 반복을 기간 내 인스턴스로 확장한다', () => {
    // given: 2024-01-15(월)부터 매주 월요일, 2024-02-15까지
    const startTs = ts(2024, 1, 15, 9, 0, 0)
    const rangeEnd = ts(2024, 2, 15, 23, 59, 59)
    const time: EventTime = { time_type: 'at', timestamp: startTs }
    const repeating: Repeating = {
      start: startTs,
      option: { optionType: 'every_week', interval: 1, dayOfWeek: [1], timeZone: 'Asia/Seoul' },
    }

    // when
    const result = enumerateRepeatingTimes(time, 1, repeating, undefined, rangeEnd)

    // then: 1/22, 1/29, 2/5, 2/12 — 4개
    expect(result).toHaveLength(4)
    expect(result[0].time).toEqual({ time_type: 'at', timestamp: ts(2024, 1, 22, 9, 0, 0) })
    expect(result[3].time).toEqual({ time_type: 'at', timestamp: ts(2024, 2, 12, 9, 0, 0) })
  })
})
