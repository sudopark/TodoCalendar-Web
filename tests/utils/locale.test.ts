import {
  formatTimeOfDay, formatTimeRange, formatMonthDay, formatMonthLong,
  formatMonthYearLong, formatFullDate, formatWeekdayLong, formatDateTimeMedium,
  weekdayShortLabels, weekdayLongLabels,
} from '../../src/utils/locale'

// 2026-04-27 14:30 KST (vitest TZ 는 Asia/Seoul 고정)
const AT = new Date('2026-04-27T05:30:00Z')

describe('formatTimeOfDay', () => {
  test('로케일마다 다른 시각 표기를 낸다', () => {
    // given / when
    const de = formatTimeOfDay(AT, 'de')
    const en = formatTimeOfDay(AT, 'en')
    // then — de 는 24시간제, en 은 12시간제
    expect(de).toBe('14:30')
    expect(en).toContain('2:30')
    expect(de).not.toBe(en)
  })

  test('timeZone 을 주면 그 타임존 기준으로 낸다', () => {
    // hour:'numeric' 은 zero-pad 안 함 — 05시가 아니라 5시로 표기됨
    expect(formatTimeOfDay(AT, 'de', 'UTC')).toBe('5:30')
  })
})

describe('formatTimeRange', () => {
  test('시작과 끝을 en dash 로 잇는다', () => {
    const end = new Date('2026-04-27T06:00:00Z')
    expect(formatTimeRange(AT, end, 'de')).toBe('14:30 – 15:00')
  })
})

describe('formatMonthDay', () => {
  test('로케일 관례대로 월·일 순서가 갈린다', () => {
    expect(formatMonthDay(AT, 'en')).toBe('Apr 27')
    expect(formatMonthDay(AT, 'ko')).toBe('4월 27일')
  })

  test('timeZone 을 주면 그 타임존 기준 날짜를 낸다', () => {
    const midnightKst = new Date('2026-04-26T15:00:00Z')
    expect(formatMonthDay(midnightKst, 'en', 'UTC')).toBe('Apr 26')
  })
})

describe('formatMonthLong / formatMonthYearLong', () => {
  test('언어별 월 이름을 낸다', () => {
    expect(formatMonthLong(AT, 'en')).toBe('April')
    expect(formatMonthLong(AT, 'de')).toBe('April')
    expect(formatMonthLong(AT, 'ko')).toBe('4월')
  })

  test('연도까지 붙인다', () => {
    expect(formatMonthYearLong(AT, 'en')).toBe('April 2026')
  })
})

describe('formatFullDate / formatWeekdayLong', () => {
  test('언어별 전체 날짜와 요일을 낸다', () => {
    expect(formatFullDate(AT, 'en')).toBe('April 27, 2026')
    expect(formatFullDate(AT, 'ko')).toBe('2026년 4월 27일')
    expect(formatWeekdayLong(AT, 'en')).toBe('Monday')
    expect(formatWeekdayLong(AT, 'ko')).toBe('월요일')
  })
})

describe('formatDateTimeMedium', () => {
  test('날짜와 시각을 함께 낸다', () => {
    const result = formatDateTimeMedium(AT, 'en')
    expect(result).toContain('2026')
    expect(result).toContain('2:30')
  })
})

describe('weekdayShortLabels', () => {
  test('일요일 시작이면 첫 라벨이 일요일이다', () => {
    expect(weekdayShortLabels('en', 0)).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])
    expect(weekdayShortLabels('ko', 0)).toEqual(['일', '월', '화', '수', '목', '금', '토'])
  })

  test('월요일 시작이면 회전된 순서로 낸다', () => {
    expect(weekdayShortLabels('en', 1)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
  })

  test('지원 언어 어디서든 7개 비어있지 않은 라벨을 낸다', () => {
    for (const lng of ['ja', 'de', 'hr', 'hi', 'zh-Hant', 'pt-BR']) {
      const labels = weekdayShortLabels(lng, 0)
      expect(labels).toHaveLength(7)
      expect(labels.every(l => l.length > 0)).toBe(true)
    }
  })
})

describe('weekdayLongLabels', () => {
  test('Date.getDay() 인덱스와 맞물린다', () => {
    const labels = weekdayLongLabels('en')
    expect(labels[0]).toBe('Sunday')
    expect(labels[1]).toBe('Monday')
    expect(labels[6]).toBe('Saturday')
  })
})
