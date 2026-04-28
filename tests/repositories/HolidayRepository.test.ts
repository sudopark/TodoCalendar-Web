import { describe, it, expect, beforeEach, vi } from 'vitest'

// Firebase 연쇄 초기화 차단
vi.mock('../../src/firebase', () => ({ auth: {} }))

// holidayApi 모듈 모킹 (holidayCache 내부에서 임포트됨)
vi.mock('../../src/api/holidayApi', () => ({
  holidayApi: {
    getHolidays: vi.fn(),
    getSupportedCountries: vi.fn(),
  },
}))

import { HolidayRepository } from '../../src/repositories/HolidayRepository'
import { useHolidayCache } from '../../src/repositories/caches/holidayCache'
import type { HolidayApi } from '../../src/repositories/HolidayRepository'
import type { HolidayResponse } from '../../src/models'

// ──────────────────────── fake api 빌더 ────────────────────────

function makeFakeHolidayApi(overrides: Partial<HolidayApi> = {}): HolidayApi {
  return {
    getHolidays: overrides.getHolidays ?? vi.fn(async () => ({ items: [] })),
  }
}

function makeHolidayResponse(items: { summary: string; date: string }[]): HolidayResponse {
  return {
    items: items.map(i => ({ summary: i.summary, start: { date: i.date }, end: { date: i.date } })),
  }
}

describe('HolidayRepository', () => {
  beforeEach(() => {
    useHolidayCache.setState({ holidays: new Map(), loadedYears: new Set() })
    vi.clearAllMocks()
  })

  describe('fetch — locale 주입', () => {
    it('initialLocale로 생성하면 fetch 이후 해당 locale의 응답 데이터가 캐시에 반영된다', async () => {
      // given: 'en' locale → 영어 공휴일, 'ko' locale → 한국어 공휴일을 반환하는 fake api
      const responseByLocale: Record<string, HolidayResponse> = {
        en: makeHolidayResponse([{ summary: "New Year's Day", date: '2026-01-01' }]),
        ko: makeHolidayResponse([{ summary: '신정', date: '2026-01-01' }]),
      }
      const fakeApi = makeFakeHolidayApi({
        getHolidays: vi.fn(async (_year: number, locale: string) => responseByLocale[locale] ?? { items: [] }),
      })

      const repo = new HolidayRepository({ api: fakeApi, initialLocale: 'en' })

      // when: 'en' locale로 fetch
      await repo.fetch(2026)

      // then: 영어 공휴일이 캐시에 있다
      expect(repo.getHolidaysSnapshot(2026)).toEqual(
        expect.arrayContaining([expect.objectContaining({ summary: "New Year's Day" })])
      )
    })

    it('setLocale 후 fetch하면 변경된 locale의 응답 데이터가 캐시에 반영된다', async () => {
      // given: locale에 따라 다른 응답을 반환하는 fake api
      const responseByLocale: Record<string, HolidayResponse> = {
        ko: makeHolidayResponse([{ summary: '신정', date: '2026-01-01' }]),
        en: makeHolidayResponse([{ summary: "New Year's Day", date: '2026-01-01' }]),
      }
      const fakeApi = makeFakeHolidayApi({
        getHolidays: vi.fn(async (_year: number, locale: string) => responseByLocale[locale] ?? { items: [] }),
      })

      const repo = new HolidayRepository({ api: fakeApi, initialLocale: 'en' })

      // when: locale을 'ko'로 바꾸고 fetch
      repo.setLocale('ko')
      await repo.fetch(2026)

      // then: 한국어 공휴일이 캐시에 반영된다
      expect(repo.getHolidaysSnapshot(2026)).toEqual(
        expect.arrayContaining([expect.objectContaining({ summary: '신정' })])
      )
    })
  })

  describe('fetch — 캐시 반영', () => {
    it('fetch 후 getHolidaysSnapshot으로 해당 연도 공휴일을 조회할 수 있다', async () => {
      // given: 2026년 공휴일을 반환하는 api
      const fakeApi = makeFakeHolidayApi({
        getHolidays: vi.fn(async () => makeHolidayResponse([
          { summary: '신정', date: '2026-01-01' },
          { summary: '삼일절', date: '2026-03-01' },
        ])),
      })
      const repo = new HolidayRepository({ api: fakeApi, initialLocale: 'en' })

      // when: fetch
      await repo.fetch(2026)

      // then: snapshot에 두 공휴일이 모두 포함된다
      const holidays = repo.getHolidaysSnapshot(2026)
      expect(holidays).toEqual(expect.arrayContaining([
        expect.objectContaining({ summary: '신정', date: '2026-01-01' }),
        expect.objectContaining({ summary: '삼일절', date: '2026-03-01' }),
      ]))
    })

    it('로드되지 않은 연도의 snapshot은 빈 배열을 반환한다', () => {
      // given: 아무것도 fetch하지 않은 repo
      const repo = new HolidayRepository({ api: makeFakeHolidayApi(), initialLocale: 'en' })

      // when: snapshot 조회
      const result = repo.getHolidaysSnapshot(2099)

      // then: 빈 배열
      expect(result).toEqual([])
    })
  })

  describe('fetch — 연도별 독립', () => {
    it('2025년 fetch 후 2026년 fetch해도 2025년 캐시는 보존된다', async () => {
      // given: 연도에 따라 다른 공휴일을 반환
      const responseByYear: Record<number, HolidayResponse> = {
        2025: makeHolidayResponse([{ summary: '2025신정', date: '2025-01-01' }]),
        2026: makeHolidayResponse([{ summary: '2026신정', date: '2026-01-01' }]),
      }
      const fakeApi = makeFakeHolidayApi({
        getHolidays: vi.fn(async (year) => responseByYear[year] ?? { items: [] }),
      })
      const repo = new HolidayRepository({ api: fakeApi, initialLocale: 'en' })

      // when: 2025, 2026 순서로 fetch
      await repo.fetch(2025)
      await repo.fetch(2026)

      // then: 두 연도 모두 캐시에 있다
      expect(repo.getHolidaysSnapshot(2025)).toEqual(
        expect.arrayContaining([expect.objectContaining({ summary: '2025신정' })])
      )
      expect(repo.getHolidaysSnapshot(2026)).toEqual(
        expect.arrayContaining([expect.objectContaining({ summary: '2026신정' })])
      )
    })
  })
})
