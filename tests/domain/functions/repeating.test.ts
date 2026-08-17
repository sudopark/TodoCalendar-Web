import { describe, it, expect } from 'vitest'
import { DateTime } from 'luxon'
import {
  nextRepeatingTime,
  enumerateRepeatingTimes,
  shiftEventTime,
} from '../../../src/domain/functions/repeating'
import type { EventTime, Repeating, RepeatingOption } from '../../../src/models'

// 서버(TodoCalendar-Functions) repeatTimeEnumerator.test.js 의 Swift 검증 벡터를 미러한다.
// weekday 만 도메인 컨벤션(0=일..6=토)에 맞춰 -1 변환했다 (서버/iOS 는 1=일..7=토).

const SEOUL = 'Asia/Seoul'

// wall-clock 문자열을 주어진 zone 기준 epoch seconds 로. 기본 UTC (서버 테스트와 동일).
function sec(str: string, zone = 'UTC'): number {
  return Math.round(DateTime.fromFormat(str, 'yyyy-MM-dd HH:mm', { zone }).toMillis() / 1000)
}

const at = (t: number): EventTime => ({ time_type: 'at', timestamp: t })
const period = (s: number, e: number): EventTime => ({ time_type: 'period', period_start: s, period_end: e })

function rep(option: RepeatingOption, end?: number, end_count?: number): Repeating {
  return { start: 0, option, end, end_count }
}

describe('shiftEventTime', () => {
  it('at 타입을 interval 만큼 시프트', () => {
    expect(shiftEventTime(at(1000), 500)).toEqual(at(1500))
  })
  it('period 타입을 형태 유지하며 시프트', () => {
    expect(shiftEventTime(period(1000, 2000), 500)).toEqual(period(1500, 2500))
  })
  it('allday seconds_from_gmt 는 유지', () => {
    const t: EventTime = { time_type: 'allday', period_start: 1000, period_end: 2000, seconds_from_gmt: 32400 }
    expect(shiftEventTime(t, 86400)).toEqual({ time_type: 'allday', period_start: 87400, period_end: 88400, seconds_from_gmt: 32400 })
  })
  it('period_end 없는 allday 는 시프트 후에도 undefined (#127)', () => {
    const t = { time_type: 'allday', period_start: 1000, seconds_from_gmt: 32400 } as EventTime
    const r = shiftEventTime(t, 86400)
    expect(r.time_type).toBe('allday')
    if (r.time_type === 'allday') {
      expect(r.period_start).toBe(87400)
      expect(r.period_end).toBeUndefined()
    }
  })
})

describe('nextRepeatingTime — every_day', () => {
  it('interval 1: 1일 뒤, turn 0→1', () => {
    const r = nextRepeatingTime(at(10), 0, rep({ optionType: 'every_day', interval: 1 }))
    expect(r!.time).toEqual(at(10 + 86400))
    expect(r!.turn).toBe(1)
  })
  it('interval 3', () => {
    const r = nextRepeatingTime(at(10), 0, rep({ optionType: 'every_day', interval: 3 }))
    expect(r!.time).toEqual(at(10 + 3 * 86400))
  })
  it('period 형태 유지', () => {
    const r = nextRepeatingTime(period(10, 110), 0, rep({ optionType: 'every_day', interval: 1 }))
    expect(r!.time).toEqual(period(10 + 86400, 110 + 86400))
  })
})

describe('nextRepeatingTime — every_month days([1,15,30,31]) skip', () => {
  const opt: RepeatingOption = { optionType: 'every_month', interval: 1, monthDaySelection: { days: [1, 15, 30, 31] }, timeZone: SEOUL }
  const step = (fromStr: string) => nextRepeatingTime(at(sec(fromStr)), 0, rep(opt))!.time as Extract<EventTime, { time_type: 'at' }>
  it('같은 달 다음 일자', () => {
    expect(step('2023-01-01 01:00').timestamp).toBe(sec('2023-01-15 01:00'))
    expect(step('2023-01-15 01:00').timestamp).toBe(sec('2023-01-30 01:00'))
    expect(step('2023-01-30 01:00').timestamp).toBe(sec('2023-01-31 01:00'))
  })
  it('1/31 → 2/01 (다음 달 첫 반복일 = days[0])', () => {
    expect(step('2023-01-31 01:00').timestamp).toBe(sec('2023-02-01 01:00'))
  })
  it('2/15 → 3/01 (2월 30·31 스킵, clamp 아님)', () => {
    expect(step('2023-02-15 01:00').timestamp).toBe(sec('2023-03-01 01:00'))
  })
  it('interval 2: 1/31 → 3/01', () => {
    const r = nextRepeatingTime(at(sec('2023-01-31 01:00')), 0, rep({ optionType: 'every_month', interval: 2, monthDaySelection: { days: [1, 15, 30, 31] }, timeZone: SEOUL }))!.time
    expect((r as { timestamp: number }).timestamp).toBe(sec('2023-03-01 01:00'))
  })
})

describe('nextRepeatingTime — every_month week (N째/마지막 요일)', () => {
  // 2024-01-08 (1월 2째 월요일) → 2024-02 2째 월요일 = 02-12. (월=1 in 0-6)
  it('N째 주 요일', () => {
    const opt: RepeatingOption = { optionType: 'every_month', interval: 1, monthDaySelection: { weekOrdinals: [{ isLast: false, seq: 2 }], weekDays: [1] }, timeZone: SEOUL }
    const r = nextRepeatingTime(at(sec('2024-01-08 10:00', SEOUL)), 0, rep(opt))!.time
    expect((r as { timestamp: number }).timestamp).toBe(sec('2024-02-12 10:00', SEOUL))
  })
  // 2024-01-29 (1월 마지막 월요일) → 2024-02 마지막 월요일 = 02-26.
  it('마지막 주 요일', () => {
    const opt: RepeatingOption = { optionType: 'every_month', interval: 1, monthDaySelection: { weekOrdinals: [{ isLast: true }], weekDays: [1] }, timeZone: SEOUL }
    const r = nextRepeatingTime(at(sec('2024-01-29 10:00', SEOUL)), 0, rep(opt))!.time
    expect((r as { timestamp: number }).timestamp).toBe(sec('2024-02-26 10:00', SEOUL))
  })
})

describe('nextRepeatingTime — every_year_some_day 2/29 clamp', () => {
  const make = (month: number, day: number, interval: number): RepeatingOption => ({ optionType: 'every_year_some_day', interval, month, day, timeZone: SEOUL })
  it('윤년 2/29 + 1년 → 평년 2/28', () => {
    const r = nextRepeatingTime(at(sec('2020-02-29 01:00')), 0, rep(make(2, 29, 1)))!.time
    expect((r as { timestamp: number }).timestamp).toBe(sec('2021-02-28 01:00'))
  })
  it('2/29 + 4년 → 윤년 2/29', () => {
    const r = nextRepeatingTime(at(sec('2020-02-29 01:00')), 0, rep(make(2, 29, 4)))!.time
    expect((r as { timestamp: number }).timestamp).toBe(sec('2024-02-29 01:00'))
  })
  it('3/1 + 1년 → 다음해 3/1', () => {
    const r = nextRepeatingTime(at(sec('2023-03-01 01:00')), 0, rep(make(3, 1, 1)))!.time
    expect((r as { timestamp: number }).timestamp).toBe(sec('2024-03-01 01:00'))
  })
})

describe('nextRepeatingTime — every_year (months[4,8,12], ord[2,4,last], wd[화,목])', () => {
  // 서버 wd [3,5](화,목 in 1-7) → 0-6 [2,4]
  const opt: RepeatingOption = {
    optionType: 'every_year', interval: 1, months: [4, 8, 12],
    weekOrdinals: [{ isLast: false, seq: 2 }, { isLast: false, seq: 4 }, { isLast: true }],
    dayOfWeek: [2, 4], timeZone: SEOUL,
  }
  const step = (fromStr: string) => (nextRepeatingTime(at(sec(fromStr)), 0, rep(opt))!.time as { timestamp: number }).timestamp
  it('같은 주 다음 요일', () => { expect(step('2023-04-11 01:00')).toBe(sec('2023-04-13 01:00')) })
  it('다음 주 첫 반복요일', () => { expect(step('2023-04-13 01:00')).toBe(sec('2023-04-25 01:00')) })
  it('다음 달 첫 반복 주/요일', () => { expect(step('2023-04-27 01:00')).toBe(sec('2023-08-08 01:00')) })
  it('다음 해 첫 반복 달/주/요일', () => { expect(step('2023-12-28 01:00')).toBe(sec('2024-04-09 01:00')) })
})

describe('nextRepeatingTime — every_week (KST)', () => {
  // 서버 [3,6](화,금 in 1-7) → 0-6 [2,5]. FROM = 화요일
  const FROM = at(sec('2023-04-11 07:00'))
  it('같은 주 다음 요일 (화·금 → 금), interval 무관, turn 1', () => {
    for (const interval of [1, 2, 3, 9]) {
      const r = nextRepeatingTime(FROM, 0, rep({ optionType: 'every_week', interval, dayOfWeek: [2, 5], timeZone: SEOUL }))!
      expect((r.time as { timestamp: number }).timestamp).toBe(sec('2023-04-14 07:00'))
      expect(r.turn).toBe(1)
    }
  })
  it('[화]만 → interval주 후 화요일', () => {
    const next = (interval: number) => (nextRepeatingTime(FROM, 0, rep({ optionType: 'every_week', interval, dayOfWeek: [2], timeZone: SEOUL }))!.time as { timestamp: number }).timestamp
    expect(next(1)).toBe(sec('2023-04-18 07:00'))
    expect(next(2)).toBe(sec('2023-04-25 07:00'))
    expect(next(3)).toBe(sec('2023-05-02 07:00'))
  })
})

describe('enumerateRepeatingTimes — end / count / exclude (turn 미소비)', () => {
  it('rangeEnd 까지 전부 + turn 누적', () => {
    const r = enumerateRepeatingTimes(
      at(sec('2023-05-20 01:00')), 0,
      rep({ optionType: 'every_day', interval: 3 }, sec('2023-06-01 01:00')),
      undefined, sec('2023-06-01 01:00'),
    )
    expect(r.map(x => (x.time as { timestamp: number }).timestamp)).toEqual([
      sec('2023-05-23 01:00'), sec('2023-05-26 01:00'), sec('2023-05-29 01:00'), sec('2023-06-01 01:00'),
    ])
    expect(r.map(x => x.turn)).toEqual([1, 2, 3, 4])
  })

  it('end_count(3): turn 1 시작 → turn 2,3 에서 멈춤', () => {
    const r = enumerateRepeatingTimes(
      at(sec('2023-05-20 01:00')), 1,
      rep({ optionType: 'every_day', interval: 3 }, sec('2024-06-01 01:00'), 3),
      undefined, sec('2024-06-01 01:00'),
    )
    expect(r.map(x => (x.time as { timestamp: number }).timestamp)).toEqual([sec('2023-05-23 01:00'), sec('2023-05-26 01:00')])
    expect(r.map(x => x.turn)).toEqual([2, 3])
  })

  it('exclude: 제외 회차는 turn 을 소비하지 않고 건너뛴다', () => {
    const excludes = [sec('2023-05-26 01:00'), sec('2023-06-01 01:00')]
    const r = enumerateRepeatingTimes(
      at(sec('2023-05-20 01:00')), 1,
      rep({ optionType: 'every_day', interval: 3 }, sec('2024-06-01 01:00'), 4),
      excludes, sec('2024-06-01 01:00'),
    )
    expect(r.map(x => (x.time as { timestamp: number }).timestamp)).toEqual([
      sec('2023-05-23 01:00'), sec('2023-05-29 01:00'), sec('2023-06-04 01:00'),
    ])
    expect(r.map(x => x.turn)).toEqual([2, 3, 4])
  })
})

describe('enumerateRepeatingTimes — repeating.end vs window', () => {
  it('repeating.end 가 window 보다 이르면 end 에서 멈춤', () => {
    const r = enumerateRepeatingTimes(
      at(sec('2023-05-20 01:00')), 0,
      rep({ optionType: 'every_day', interval: 1 }, sec('2023-05-23 01:00')),
      undefined, sec('2023-06-30 01:00'),
    )
    expect(r.map(x => (x.time as { timestamp: number }).timestamp)).toEqual([
      sec('2023-05-21 01:00'), sec('2023-05-22 01:00'), sec('2023-05-23 01:00'),
    ])
  })
  it('window 가 repeating.end 보다 이르면 window 에서 멈춤', () => {
    const r = enumerateRepeatingTimes(
      at(sec('2023-05-20 01:00')), 0,
      rep({ optionType: 'every_day', interval: 1 }, sec('2023-06-30 01:00')),
      undefined, sec('2023-05-22 01:00'),
    )
    expect(r.map(x => (x.time as { timestamp: number }).timestamp)).toEqual([
      sec('2023-05-21 01:00'), sec('2023-05-22 01:00'),
    ])
  })
  it('첫 반복이 window 보다 나중이면 빈 배열', () => {
    const r = enumerateRepeatingTimes(at(sec('2023-05-20 01:00')), 0, rep({ optionType: 'every_day', interval: 1 }), undefined, sec('2023-05-19 01:00'))
    expect(r).toHaveLength(0)
  })
})

describe('nextRepeatingTime — lunar (실제 음력 변환)', () => {
  it('윤달 origin 이어도 throw 없이 평달 fallback 으로 다음 회차 생성', () => {
    // 2023-04-05 KST = 음력 2023 윤2월 15일 → 2024 엔 윤2월 없음 → 평달(2월)로 resolve
    const start = Math.round(DateTime.fromISO('2023-04-05T09:00:00', { zone: SEOUL }).toMillis() / 1000)
    const opt: RepeatingOption = { optionType: 'lunar_calendar_every_year', month: 2, day: 15, timeZone: SEOUL }
    const r = nextRepeatingTime(at(start), 0, rep(opt))
    expect(r).not.toBeNull()
    const got = DateTime.fromMillis((r!.time as { timestamp: number }).timestamp * 1000, { zone: SEOUL }).toFormat('yyyy-MM-dd')
    expect(got).toBe('2024-03-24') // 2024 음력 2월 15일
  })
})

describe('nextRepeatingTime — timeZone 인지 (브라우저 로컬 TZ 무관)', () => {
  // 회귀: vitest 는 TZ=Asia/Seoul 로 돈다. 이벤트 timeZone 이 다르면 그 zone 기준으로 계산해야 한다.
  // NY 2024-02-15 23:30 은 Seoul 로는 02-16 13:30 (날짜가 다름). days=[15] 의 다음 회차는
  // NY 기준 03-15 23:30 이어야 한다 — 로컬(Seoul) 기준이면 16일로 잘못 계산됨.
  it('every_month days 가 이벤트 timeZone(New_York) 기준으로 계산된다', () => {
    const NY = 'America/New_York'
    const start = Math.round(DateTime.fromObject({ year: 2024, month: 2, day: 15, hour: 23, minute: 30 }, { zone: NY }).toMillis() / 1000)
    const expected = Math.round(DateTime.fromObject({ year: 2024, month: 3, day: 15, hour: 23, minute: 30 }, { zone: NY }).toMillis() / 1000)
    const opt: RepeatingOption = { optionType: 'every_month', interval: 1, monthDaySelection: { days: [15] }, timeZone: NY }
    const r = nextRepeatingTime(at(start), 0, rep(opt))!.time
    expect((r as { timestamp: number }).timestamp).toBe(expected)
  })

  it('every_week 요일 판정이 이벤트 timeZone(New_York) 기준이다', () => {
    const NY = 'America/New_York'
    // NY 월요일 22:00 = Seoul 화요일 12:00. 요일 판정이 NY(월)이어야 같은 주 수요일이 나온다.
    const start = Math.round(DateTime.fromObject({ year: 2024, month: 1, day: 15, hour: 22, minute: 0 }, { zone: NY }).toMillis() / 1000) // Mon
    const expected = Math.round(DateTime.fromObject({ year: 2024, month: 1, day: 17, hour: 22, minute: 0 }, { zone: NY }).toMillis() / 1000) // Wed
    const opt: RepeatingOption = { optionType: 'every_week', interval: 1, dayOfWeek: [1, 3, 5], timeZone: NY } // Mon/Wed/Fri
    const r = nextRepeatingTime(at(start), 0, rep(opt))!.time
    expect((r as { timestamp: number }).timestamp).toBe(expected)
  })
})
