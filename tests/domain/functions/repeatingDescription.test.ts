import { describe, it, expect } from 'vitest'
import { describeRepeating } from '../../../src/domain/functions/repeatingDescription'
import type { Repeating } from '../../../src/models'

describe('describeRepeating', () => {
  // --- every_day ---

  it('interval 1인 every_day이면 "매일 반복"을 반환한다', () => {
    // given
    const repeating: Repeating = { start: 0, option: { optionType: 'every_day', interval: 1 } }
    // when
    const result = describeRepeating(repeating)
    // then
    expect(result).toBe('매일 반복')
  })

  it('interval 3인 every_day이면 "3일마다 반복"을 반환한다', () => {
    // given
    const repeating: Repeating = { start: 0, option: { optionType: 'every_day', interval: 3 } }
    // when / then
    expect(describeRepeating(repeating)).toBe('3일마다 반복')
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
    const result = describeRepeating(repeating)
    // then — 날짜 부분은 환경에 따라 달라질 수 있으므로 시작 부분만 검증
    expect(result).toMatch(/^매일 반복, \d{4}년 \d+월 \d+일까지$/)
  })

  it('every_day에 end_count가 있으면 "매일 반복, N회"를 반환한다', () => {
    // given
    const repeating: Repeating = {
      start: 0,
      option: { optionType: 'every_day', interval: 1 },
      end_count: 10,
    }
    // when / then
    expect(describeRepeating(repeating)).toBe('매일 반복, 10회')
  })

  // --- every_week ---

  it('interval 1, 월·수·금 every_week이면 "매주 월·수·금 반복"을 반환한다', () => {
    // given — dayOfWeek: 1=월 3=수 5=금
    const repeating: Repeating = {
      start: 0,
      option: { optionType: 'every_week', interval: 1, dayOfWeek: [1, 3, 5], timeZone: 'UTC' },
    }
    // when / then
    expect(describeRepeating(repeating)).toBe('매주 월·수·금 반복')
  })

  it('interval 2, 화·목 every_week이면 "2주마다 화·목 반복"을 반환한다', () => {
    // given — dayOfWeek: 2=화 4=목
    const repeating: Repeating = {
      start: 0,
      option: { optionType: 'every_week', interval: 2, dayOfWeek: [2, 4], timeZone: 'UTC' },
    }
    // when / then
    expect(describeRepeating(repeating)).toBe('2주마다 화·목 반복')
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
    const result = describeRepeating(repeating)
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
    expect(describeRepeating(repeating)).toBe('매주 월·수·금 반복')
  })

  // --- every_month (days mode) ---

  it('every_month days 모드 15일, interval 1이면 "매월 15일 반복"을 반환한다', () => {
    // given
    const repeating: Repeating = {
      start: 0,
      option: { optionType: 'every_month', interval: 1, monthDaySelection: { days: [15] }, timeZone: 'UTC' },
    }
    // when / then
    expect(describeRepeating(repeating)).toBe('매월 15일 반복')
  })

  it('every_month days 모드, end_count 10이면 "매월 15일 반복, 10회"를 반환한다', () => {
    // given
    const repeating: Repeating = {
      start: 0,
      option: { optionType: 'every_month', interval: 1, monthDaySelection: { days: [15] }, timeZone: 'UTC' },
      end_count: 10,
    }
    // when / then
    expect(describeRepeating(repeating)).toBe('매월 15일 반복, 10회')
  })

  it('every_month days 모드, interval 3이면 "3개월마다 15일 반복"을 반환한다', () => {
    // given
    const repeating: Repeating = {
      start: 0,
      option: { optionType: 'every_month', interval: 3, monthDaySelection: { days: [15] }, timeZone: 'UTC' },
    }
    // when / then
    expect(describeRepeating(repeating)).toBe('3개월마다 15일 반복')
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
    expect(describeRepeating(repeating)).toBe('매월 둘째 화 반복')
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
    expect(describeRepeating(repeating)).toBe('매월 마지막 월 반복')
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
    expect(describeRepeating(repeating)).toBe('매년 3월 둘째 화 반복')
  })

  // --- every_year_some_day ---

  it('every_year_some_day, 7월 4일이면 "매년 7월 4일 반복"을 반환한다', () => {
    // given
    const repeating: Repeating = {
      start: 0,
      option: { optionType: 'every_year_some_day', interval: 1, month: 7, day: 4, timeZone: 'UTC' },
    }
    // when / then
    expect(describeRepeating(repeating)).toBe('매년 7월 4일 반복')
  })

  it('every_year_some_day, interval 2이면 "2년마다 7월 4일 반복"을 반환한다', () => {
    // given
    const repeating: Repeating = {
      start: 0,
      option: { optionType: 'every_year_some_day', interval: 2, month: 7, day: 4, timeZone: 'UTC' },
    }
    // when / then
    expect(describeRepeating(repeating)).toBe('2년마다 7월 4일 반복')
  })

  // --- lunar_calendar_every_year ---

  it('lunar_calendar_every_year, 1월 1일이면 "음력 매년 1월 1일 반복"을 반환한다', () => {
    // given
    const repeating: Repeating = {
      start: 0,
      option: { optionType: 'lunar_calendar_every_year', month: 1, day: 1, timeZone: 'UTC' },
    }
    // when / then
    expect(describeRepeating(repeating)).toBe('음력 매년 1월 1일 반복')
  })
})
