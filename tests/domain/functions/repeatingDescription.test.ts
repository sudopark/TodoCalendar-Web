import { describe, it, expect, beforeAll } from 'vitest'
import type { TFunction } from 'i18next'
import i18n, { loadLanguage } from '../../../src/i18n'
import { describeRepeating } from '../../../src/domain/functions/repeatingDescription'
import type { Repeating } from '../../../src/models'

let ko: TFunction
let en: TFunction

function describeKo(repeating: Repeating): string {
  return describeRepeating(repeating, ko, 'ko')
}

function describeEn(repeating: Repeating): string {
  return describeRepeating(repeating, en, 'en')
}

describe('describeRepeating', () => {
  beforeAll(async () => {
    // given: ko/en 번들이 모두 로드된 상태 — 같은 입력을 두 언어로 대조하기 위해
    await loadLanguage('en')
    await loadLanguage('ko')
    ko = i18n.getFixedT('ko')
    en = i18n.getFixedT('en')
  })

  // --- every_day ---

  it('interval 1인 every_day이면 "매일 반복"을 반환한다', () => {
    // given
    const repeating: Repeating = { start: 0, option: { optionType: 'every_day', interval: 1 } }
    // when
    const result = describeKo(repeating)
    // then
    expect(result).toBe('매일 반복')
  })

  it('interval 3인 every_day이면 "3일마다 반복"을 반환한다', () => {
    // given
    const repeating: Repeating = { start: 0, option: { optionType: 'every_day', interval: 3 } }
    // when / then
    expect(describeKo(repeating)).toBe('3일마다 반복')
  })

  it('en 로케일에서 interval 3인 every_day이면 영어 문장을 반환한다', () => {
    // given
    const repeating: Repeating = { start: 0, option: { optionType: 'every_day', interval: 3 } }
    // when / then
    expect(describeEn(repeating)).toBe('Repeats every 3 days')
  })

  // --- every_day + end conditions ---

  it('every_day에 종료 날짜가 있으면 "매일 반복, yyyy년 M월 D일까지"를 반환한다', () => {
    // given — 2026-12-31 00:00:00 local을 KST(UTC+9)라고 가정하면 실제 ts는 런타임 의존이므로
    // UTC 기준으로 2026-12-31T00:00:00Z 타임스탬프를 직접 계산
    const endTs = Math.floor(new Date('2026-12-31T00:00:00').getTime() / 1000)
    const repeating: Repeating = {
      start: 0,
      option: { optionType: 'every_day', interval: 1 },
      end: endTs,
    }
    // when
    const result = describeKo(repeating)
    // then — 날짜 부분은 환경에 따라 달라질 수 있으므로 시작 부분만 검증
    expect(result).toMatch(/^매일 반복, \d{4}년 \d+월 \d+일까지$/)
  })

  it('en 로케일에서 종료 날짜가 있으면 로케일 날짜 표기로 붙는다', () => {
    // given
    const endTs = Math.floor(new Date('2026-12-31T00:00:00').getTime() / 1000)
    const repeating: Repeating = {
      start: 0,
      option: { optionType: 'every_day', interval: 1 },
      end: endTs,
    }
    // when / then
    expect(describeEn(repeating)).toMatch(/^Repeats daily, until \w+ \d+, \d{4}$/)
  })

  it('every_day에 end_count가 있으면 "매일 반복, N회"를 반환한다', () => {
    // given
    const repeating: Repeating = {
      start: 0,
      option: { optionType: 'every_day', interval: 1 },
      end_count: 10,
    }
    // when / then
    expect(describeKo(repeating)).toBe('매일 반복, 10회')
  })

  it('en 로케일에서 end_count가 있으면 "Repeats daily, 10 times"를 반환한다', () => {
    // given
    const repeating: Repeating = {
      start: 0,
      option: { optionType: 'every_day', interval: 1 },
      end_count: 10,
    }
    // when / then
    expect(describeEn(repeating)).toBe('Repeats daily, 10 times')
  })

  // --- every_week ---

  it('interval 1, 월·수·금 every_week이면 "매주 월·수·금 반복"을 반환한다', () => {
    // given — dayOfWeek: 1=월 3=수 5=금
    const repeating: Repeating = {
      start: 0,
      option: { optionType: 'every_week', interval: 1, dayOfWeek: [1, 3, 5], timeZone: 'UTC' },
    }
    // when / then
    expect(describeKo(repeating)).toBe('매주 월·수·금 반복')
  })

  it('en 로케일에서 월·수·금 every_week이면 영어 요일 약칭으로 표기한다', () => {
    // given
    const repeating: Repeating = {
      start: 0,
      option: { optionType: 'every_week', interval: 1, dayOfWeek: [1, 3, 5], timeZone: 'UTC' },
    }
    // when / then
    expect(describeEn(repeating)).toBe('Repeats weekly on Mon, Wed, Fri')
  })

  it('interval 2, 화·목 every_week이면 "2주마다 화·목 반복"을 반환한다', () => {
    // given — dayOfWeek: 2=화 4=목
    const repeating: Repeating = {
      start: 0,
      option: { optionType: 'every_week', interval: 2, dayOfWeek: [2, 4], timeZone: 'UTC' },
    }
    // when / then
    expect(describeKo(repeating)).toBe('2주마다 화·목 반복')
  })

  it('every_week에 종료 날짜가 있으면 종료 정보가 포함된다', () => {
    // given
    const endTs = Math.floor(new Date('2026-12-31T00:00:00').getTime() / 1000)
    const repeating: Repeating = {
      start: 0,
      option: { optionType: 'every_week', interval: 2, dayOfWeek: [2, 4], timeZone: 'UTC' },
      end: endTs,
    }
    // when
    const result = describeKo(repeating)
    // then
    expect(result).toMatch(/^2주마다 화·목 반복, \d{4}년 \d+월 \d+일까지$/)
  })

  it('요일이 정렬되지 않은 순서여도 오름차순으로 표시된다', () => {
    // given
    const repeating: Repeating = {
      start: 0,
      option: { optionType: 'every_week', interval: 1, dayOfWeek: [5, 1, 3], timeZone: 'UTC' },
    }
    // when / then
    expect(describeKo(repeating)).toBe('매주 월·수·금 반복')
  })

  // --- every_month (days mode) ---

  it('every_month days 모드 15일, interval 1이면 "매월 15일 반복"을 반환한다', () => {
    // given
    const repeating: Repeating = {
      start: 0,
      option: { optionType: 'every_month', interval: 1, monthDaySelection: { days: [15] }, timeZone: 'UTC' },
    }
    // when / then
    expect(describeKo(repeating)).toBe('매월 15일 반복')
  })

  it('en 로케일에서 every_month days 모드 15일이면 "Repeats monthly on day 15"를 반환한다', () => {
    // given
    const repeating: Repeating = {
      start: 0,
      option: { optionType: 'every_month', interval: 1, monthDaySelection: { days: [15] }, timeZone: 'UTC' },
    }
    // when / then
    expect(describeEn(repeating)).toBe('Repeats monthly on day 15')
  })

  it('every_month days 모드, end_count 10이면 "매월 15일 반복, 10회"를 반환한다', () => {
    // given
    const repeating: Repeating = {
      start: 0,
      option: { optionType: 'every_month', interval: 1, monthDaySelection: { days: [15] }, timeZone: 'UTC' },
      end_count: 10,
    }
    // when / then
    expect(describeKo(repeating)).toBe('매월 15일 반복, 10회')
  })

  it('every_month days 모드, interval 3이면 "3개월마다 15일 반복"을 반환한다', () => {
    // given
    const repeating: Repeating = {
      start: 0,
      option: { optionType: 'every_month', interval: 3, monthDaySelection: { days: [15] }, timeZone: 'UTC' },
    }
    // when / then
    expect(describeKo(repeating)).toBe('3개월마다 15일 반복')
  })

  // --- every_month (week mode) ---

  it('every_month 주차 모드, 둘째 화요일이면 "매월 둘째 화 반복"을 반환한다', () => {
    // given
    const repeating: Repeating = {
      start: 0,
      option: {
        optionType: 'every_month',
        interval: 1,
        monthDaySelection: { weekOrdinals: [{ isLast: false, seq: 2 }], weekDays: [2] },
        timeZone: 'UTC',
      },
    }
    // when / then
    expect(describeKo(repeating)).toBe('매월 둘째 화 반복')
  })

  it('en 로케일에서 every_month 주차 모드 둘째 화요일이면 "Repeats monthly on the second Tue"를 반환한다', () => {
    // given
    const repeating: Repeating = {
      start: 0,
      option: {
        optionType: 'every_month',
        interval: 1,
        monthDaySelection: { weekOrdinals: [{ isLast: false, seq: 2 }], weekDays: [2] },
        timeZone: 'UTC',
      },
    }
    // when / then
    expect(describeEn(repeating)).toBe('Repeats monthly on the second Tue')
  })

  it('every_month 주차 모드, 마지막 월요일이면 "매월 마지막 월 반복"을 반환한다', () => {
    // given
    const repeating: Repeating = {
      start: 0,
      option: {
        optionType: 'every_month',
        interval: 1,
        monthDaySelection: { weekOrdinals: [{ isLast: true }], weekDays: [1] },
        timeZone: 'UTC',
      },
    }
    // when / then
    expect(describeKo(repeating)).toBe('매월 마지막 월 반복')
  })

  it('en 로케일에서 마지막 월요일이면 "Repeats monthly on the last Mon"을 반환한다', () => {
    // given
    const repeating: Repeating = {
      start: 0,
      option: {
        optionType: 'every_month',
        interval: 1,
        monthDaySelection: { weekOrdinals: [{ isLast: true }], weekDays: [1] },
        timeZone: 'UTC',
      },
    }
    // when / then
    expect(describeEn(repeating)).toBe('Repeats monthly on the last Mon')
  })

  it('ordinal seq가 라벨 범위를 넘으면 숫자 서수 문구로 대체된다', () => {
    // given — seq 9 는 첫째~다섯째 라벨 범위 밖
    const repeating: Repeating = {
      start: 0,
      option: {
        optionType: 'every_month',
        interval: 1,
        monthDaySelection: { weekOrdinals: [{ isLast: false, seq: 9 }], weekDays: [1] },
        timeZone: 'UTC',
      },
    }
    // when / then
    expect(describeKo(repeating)).toBe('매월 9번째 월 반복')
  })

  // --- every_year ---

  it('every_year, 3월 둘째 화이면 "매년 3월 둘째 화 반복"을 반환한다', () => {
    // given
    const repeating: Repeating = {
      start: 0,
      option: {
        optionType: 'every_year',
        interval: 1,
        months: [3],
        weekOrdinals: [{ isLast: false, seq: 2 }],
        dayOfWeek: [2],
        timeZone: 'UTC',
      },
    }
    // when / then
    expect(describeKo(repeating)).toBe('매년 3월 둘째 화 반복')
  })

  it('en 로케일에서 every_year 3월 둘째 화이면 영어 월 이름으로 표기한다', () => {
    // given
    const repeating: Repeating = {
      start: 0,
      option: {
        optionType: 'every_year',
        interval: 1,
        months: [3],
        weekOrdinals: [{ isLast: false, seq: 2 }],
        dayOfWeek: [2],
        timeZone: 'UTC',
      },
    }
    // when / then
    expect(describeEn(repeating)).toBe('Repeats yearly on the second Tue of March')
  })

  // --- every_year_some_day ---

  it('every_year_some_day, 7월 4일이면 "매년 7월 4일 반복"을 반환한다', () => {
    // given
    const repeating: Repeating = {
      start: 0,
      option: { optionType: 'every_year_some_day', interval: 1, month: 7, day: 4, timeZone: 'UTC' },
    }
    // when / then
    expect(describeKo(repeating)).toBe('매년 7월 4일 반복')
  })

  it('en 로케일에서 every_year_some_day 7월 4일이면 "Repeats yearly on July 4"를 반환한다', () => {
    // given
    const repeating: Repeating = {
      start: 0,
      option: { optionType: 'every_year_some_day', interval: 1, month: 7, day: 4, timeZone: 'UTC' },
    }
    // when / then
    expect(describeEn(repeating)).toBe('Repeats yearly on July 4')
  })

  it('every_year_some_day, interval 2이면 "2년마다 7월 4일 반복"을 반환한다', () => {
    // given
    const repeating: Repeating = {
      start: 0,
      option: { optionType: 'every_year_some_day', interval: 2, month: 7, day: 4, timeZone: 'UTC' },
    }
    // when / then
    expect(describeKo(repeating)).toBe('2년마다 7월 4일 반복')
  })

  // --- lunar_calendar_every_year ---

  it('lunar_calendar_every_year, 1월 1일이면 "음력 매년 1월 1일 반복"을 반환한다', () => {
    // given
    const repeating: Repeating = {
      start: 0,
      option: { optionType: 'lunar_calendar_every_year', month: 1, day: 1, timeZone: 'UTC' },
    }
    // when / then
    expect(describeKo(repeating)).toBe('음력 매년 1월 1일 반복')
  })

  it('en 로케일에서 lunar_calendar_every_year 1월 1일이면 "Repeats yearly on lunar January 1"을 반환한다', () => {
    // given
    const repeating: Repeating = {
      start: 0,
      option: { optionType: 'lunar_calendar_every_year', month: 1, day: 1, timeZone: 'UTC' },
    }
    // when / then
    expect(describeEn(repeating)).toBe('Repeats yearly on lunar January 1')
  })
})
