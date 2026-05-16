/**
 * @internal repositories 모듈 내부에서만 사용. 외부 import 금지.
 * Repository 클래스를 통해서만 노출한다.
 */
import { create } from 'zustand'
import { holidayApi } from '../../api/holidayApi'

const STORAGE_KEY = 'holiday_country'

export interface HolidayCountry {
  regionCode: string
  code: string
  name: string
}

const DEFAULT_COUNTRY: HolidayCountry = {
  regionCode: 'kr',
  code: 'south_korea',
  name: 'Republic of Korea',
}

interface PersistedShape {
  regionCode?: string
  code?: string
  name?: string
  // legacy fields
  locale?: string
  region?: string
}

function loadCountry(): HolidayCountry {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return DEFAULT_COUNTRY
    const parsed = JSON.parse(stored) as PersistedShape
    if (parsed.regionCode && parsed.code && parsed.name) {
      return { regionCode: parsed.regionCode, code: parsed.code, name: parsed.name }
    }
    if (parsed.region && parsed.code) {
      return {
        regionCode: parsed.code.toLowerCase(),
        code: parsed.region,
        name: parsed.region,
      }
    }
    return DEFAULT_COUNTRY
  } catch { return DEFAULT_COUNTRY }
}

export interface HolidayCacheState {
  country: HolidayCountry
  availableCountries: HolidayCountry[]
  availableCountriesLoaded: boolean
  holidays: Map<string, string[]>
  loadedYears: Set<number>
  // ── cache primitive operations (used by HolidayRepository) ────────
  setHolidaysForYear: (year: number, items: { summary: string; start: { date: string } }[]) => void
  clearYear: (year: number) => void
  reset: () => void
  // ── country management ─────────────────────────────────────────────
  setCountry: (country: HolidayCountry) => void
  setAvailableCountries: (countries: HolidayCountry[]) => void
  // ── query ──────────────────────────────────────────────────────────
  getHolidayNames: (dateKey: string) => string[]
  // ── legacy business operations (callers migrated to HolidayRepository in T14+) ──
  fetchAvailableCountries: () => Promise<void>
  fetchHolidays: (year: number, locale?: string) => Promise<void>
  refreshHolidays: (years: number[], locale?: string) => Promise<void>
}

let availableCountriesPromise: Promise<void> | null = null

export const useHolidayCache = create<HolidayCacheState>((set, get) => ({
  country: loadCountry(),
  availableCountries: [],
  availableCountriesLoaded: false,
  holidays: new Map(),
  loadedYears: new Set(),

  // ── cache primitive operations ────────────────────────────────────

  setHolidaysForYear: (year, items) => {
    // 같은 year 에 대해 다중 호출(StrictMode 이중 effect, 동시 trigger 등) 되어도
    // 결과가 누적되지 않도록 idempotent replace: 해당 year의 기존 키를 모두 제거 후 채운다.
    const yearPrefix = String(year)
    const newHolidays = new Map<string, string[]>()
    for (const [key, names] of get().holidays) {
      if (!key.startsWith(yearPrefix)) newHolidays.set(key, names)
    }
    const seen = new Map<string, Set<string>>()
    for (const item of items) {
      const dateKey = item.start.date
      const seenForKey = seen.get(dateKey) ?? new Set<string>()
      if (seenForKey.has(item.summary)) continue
      seenForKey.add(item.summary)
      seen.set(dateKey, seenForKey)
      const existing = newHolidays.get(dateKey) ?? []
      newHolidays.set(dateKey, [...existing, item.summary])
    }
    const newLoadedYears = new Set(get().loadedYears)
    newLoadedYears.add(year)
    set({ holidays: newHolidays, loadedYears: newLoadedYears })
  },

  clearYear: (year) => {
    const newHolidays = new Map(get().holidays)
    for (const [key] of newHolidays) {
      if (parseInt(key.substring(0, 4), 10) === year) newHolidays.delete(key)
    }
    const newLoadedYears = new Set(get().loadedYears)
    newLoadedYears.delete(year)
    set({ holidays: newHolidays, loadedYears: newLoadedYears })
  },

  reset: () => set({ holidays: new Map(), loadedYears: new Set() }),

  // ── country management ─────────────────────────────────────────────

  setCountry: (country) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(country))
    set({ country, holidays: new Map(), loadedYears: new Set() })
  },

  setAvailableCountries: (countries) => {
    set({ availableCountries: countries, availableCountriesLoaded: true })
  },

  // ── query ──────────────────────────────────────────────────────────

  getHolidayNames: (dateKey) => {
    return get().holidays.get(dateKey) ?? []
  },

  // ── legacy business operations ──────────────────────────────────────────
  // locale은 인자로 받음 — i18n 직접 참조 없음.
  // 기존 호출자(T14+ 마이그레이션 전)는 locale 없이 호출하므로 기본값 'en' 사용.
  // 정확한 locale 경로는 HolidayRepository를 통해서만 보장된다.

  fetchAvailableCountries: async () => {
    if (get().availableCountriesLoaded) return
    if (availableCountriesPromise) return availableCountriesPromise
    availableCountriesPromise = (async () => {
      try {
        const dtos = await holidayApi.getSupportedCountries()
        const countries: HolidayCountry[] = dtos
          .map(dto => ({ regionCode: dto.regionCode, code: dto.code, name: dto.name }))
          .sort((a, b) => a.name.localeCompare(b.name))
        set({ availableCountries: countries, availableCountriesLoaded: true })
      } catch (e) {
        console.warn('지원 국가 로드 실패:', e)
      } finally {
        availableCountriesPromise = null
      }
    })()
    return availableCountriesPromise
  },

  fetchHolidays: async (year: number, locale = 'en') => {
    if (get().loadedYears.has(year)) return
    const { code } = get().country
    try {
      const response = await holidayApi.getHolidays(year, locale, code)
      get().setHolidaysForYear(year, response.items)
    } catch (e) {
      console.warn('공휴일 로드 실패:', e)
    }
  },

  refreshHolidays: async (years: number[], locale = 'en') => {
    const newLoadedYears = new Set(get().loadedYears)
    const newHolidays = new Map(get().holidays)
    for (const [key] of newHolidays) {
      const keyYear = parseInt(key.substring(0, 4), 10)
      if (years.includes(keyYear)) newHolidays.delete(key)
    }
    years.forEach(y => newLoadedYears.delete(y))
    set({ loadedYears: newLoadedYears, holidays: newHolidays })
    await Promise.all(years.map(y => get().fetchHolidays(y, locale)))
  },
}))
