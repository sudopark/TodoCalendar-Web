import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../../../src/api/holidayApi', () => ({
  holidayApi: {
    getHolidays: vi.fn(),
    getSupportedCountries: vi.fn(),
  },
}))

import { useHolidayCache } from '../../../src/repositories/caches/holidayCache'

describe('holidayCache', () => {
  beforeEach(() => {
    useHolidayCache.setState({ holidays: new Map(), loadedYears: new Set() })
    vi.clearAllMocks()
  })

  describe('setHolidaysForYear', () => {
    it('연도별 공휴일 항목을 캐시에 저장하면 날짜로 공휴일명을 조회할 수 있다', () => {
      // given: 캐시가 비어 있다
      // when: 2026년 공휴일을 직접 캐시에 저장
      useHolidayCache.getState().setHolidaysForYear(2026, [
        { summary: '신정', start: { date: '2026-01-01' }, end: { date: '2026-01-02' } },
        { summary: '삼일절', start: { date: '2026-03-01' }, end: { date: '2026-03-02' } },
      ])

      // then: 해당 날짜에서 공휴일명을 찾을 수 있다
      expect(useHolidayCache.getState().getHolidayNames('2026-01-01')).toEqual(['신정'])
      expect(useHolidayCache.getState().getHolidayNames('2026-03-01')).toEqual(['삼일절'])
      expect(useHolidayCache.getState().getHolidayNames('2026-06-15')).toEqual([])
    })
  })

  describe('clearYear', () => {
    it('특정 연도의 캐시를 제거하면 해당 연도 공휴일 조회가 빈 배열을 반환한다', () => {
      // given: 2025년, 2026년 공휴일이 캐시에 있다
      useHolidayCache.getState().setHolidaysForYear(2025, [
        { summary: '신정', start: { date: '2025-01-01' }, end: { date: '2025-01-02' } },
      ])
      useHolidayCache.getState().setHolidaysForYear(2026, [
        { summary: '신정', start: { date: '2026-01-01' }, end: { date: '2026-01-02' } },
      ])

      // when: 2026년만 제거
      useHolidayCache.getState().clearYear(2026)

      // then: 2025년은 유지되고, 2026년은 비워진다
      expect(useHolidayCache.getState().getHolidayNames('2025-01-01')).toEqual(['신정'])
      expect(useHolidayCache.getState().getHolidayNames('2026-01-01')).toEqual([])
    })
  })

  describe('fetchHolidays (legacy shim)', () => {
    it('공휴일 데이터가 없으면 어떤 날짜를 조회해도 빈 배열을 반환한다', () => {
      // given: 빈 캐시
      // when/then: 임의의 날짜 조회 시 빈 배열
      expect(useHolidayCache.getState().getHolidayNames('2026-01-01')).toEqual([])
    })

    it('fetchHolidays 호출 후 해당 날짜로 공휴일명을 조회할 수 있다', async () => {
      // given: API가 공휴일 데이터를 반환한다
      const { holidayApi } = await import('../../../src/api/holidayApi')
      vi.mocked(holidayApi.getHolidays).mockResolvedValue({
        items: [
          { summary: '신정', start: { date: '2026-01-01' }, end: { date: '2026-01-02' } },
          { summary: '삼일절', start: { date: '2026-03-01' }, end: { date: '2026-03-02' } },
        ],
      })

      // when: 해당 연도의 공휴일을 불러온다
      await useHolidayCache.getState().fetchHolidays(2026)

      // then: 공휴일인 날짜는 이름을 찾을 수 있고, 아닌 날짜는 빈 배열이다
      expect(useHolidayCache.getState().getHolidayNames('2026-01-01')).toEqual(['신정'])
      expect(useHolidayCache.getState().getHolidayNames('2026-03-01')).toEqual(['삼일절'])
      expect(useHolidayCache.getState().getHolidayNames('2026-06-15')).toEqual([])
    })

    it('API 호출이 실패해도 이전에 불러온 공휴일 데이터는 유지된다', async () => {
      // given: 2025년 공휴일이 로드되어 있다
      const { holidayApi } = await import('../../../src/api/holidayApi')
      vi.mocked(holidayApi.getHolidays).mockResolvedValueOnce({
        items: [{ summary: '신정', start: { date: '2025-01-01' }, end: { date: '2025-01-02' } }],
      })
      await useHolidayCache.getState().fetchHolidays(2025)

      // when: 다른 연도 로드가 실패한다
      vi.mocked(holidayApi.getHolidays).mockRejectedValue(new Error('network'))
      await useHolidayCache.getState().fetchHolidays(2026)

      // then: 이전에 로드된 2025년 공휴일은 여전히 조회 가능하다
      expect(useHolidayCache.getState().getHolidayNames('2025-01-01')).toEqual(['신정'])
    })
  })

  describe('refreshHolidays (legacy shim)', () => {
    it('refreshHolidays는 해당 년도 캐시를 무효화하고 재조회한다', async () => {
      // given: 2025년 공휴일이 로드되어 있다
      const { holidayApi } = await import('../../../src/api/holidayApi')
      vi.mocked(holidayApi.getHolidays).mockResolvedValue({
        items: [{ summary: '신정', start: { date: '2025-01-01' }, end: { date: '2025-01-02' } }],
      })
      await useHolidayCache.getState().fetchHolidays(2025)

      // when: 새 데이터로 refreshHolidays 호출
      vi.mocked(holidayApi.getHolidays).mockResolvedValue({
        items: [{ summary: '새해', start: { date: '2025-01-01' }, end: { date: '2025-01-02' } }],
      })
      await useHolidayCache.getState().refreshHolidays([2025])

      // then: 새로운 데이터로 업데이트된다
      expect(useHolidayCache.getState().getHolidayNames('2025-01-01')).toEqual(['새해'])
    })
  })
})
