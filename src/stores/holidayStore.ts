import { create } from 'zustand'
import i18n from '../i18n'
import { holidayApi } from '../api/holidayApi'

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

interface HolidayState {
  country: HolidayCountry
  availableCountries: HolidayCountry[]
  availableCountriesLoaded: boolean
  holidays: Map<string, string[]>
  loadedYears: Set<number>
  setCountry: (country: HolidayCountry) => void
  fetchAvailableCountries: () => Promise<void>
  fetchHolidays: (year: number) => Promise<void>
  refreshHolidays: (years: number[]) => Promise<void>
  getHolidayNames: (dateKey: string) => string[]
}

let availableCountriesPromise: Promise<void> | null = null

export const useHolidayStore = create<HolidayState>((set, get) => ({
  country: loadCountry(),
  availableCountries: [],
  availableCountriesLoaded: false,
  holidays: new Map(),
  loadedYears: new Set(),

  setCountry: (country: HolidayCountry) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(country))
    set({ country, holidays: new Map(), loadedYears: new Set() })
    // 즉시 fetch하지 않음 — MonthCalendar의 useEffect가 현재 보고 있는 연도로 fetch 위임
  },

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

  fetchHolidays: async (year: number) => {
    if (get().loadedYears.has(year)) return
    const { code } = get().country
    const locale = i18n.language || 'en'
    try {
      const response = await holidayApi.getHolidays(year, locale, code)
      const newHolidays = new Map(get().holidays)
      for (const item of response.items) {
        const dateKey = item.start.date
        const existing = newHolidays.get(dateKey) ?? []
        newHolidays.set(dateKey, [...existing, item.summary])
      }
      const newLoadedYears = new Set(get().loadedYears)
      newLoadedYears.add(year)
      set({ holidays: newHolidays, loadedYears: newLoadedYears })
    } catch (e) {
      console.warn('공휴일 로드 실패:', e)
    }
  },

  refreshHolidays: async (years: number[]) => {
    const newLoadedYears = new Set(get().loadedYears)
    const newHolidays = new Map(get().holidays)
    for (const [key] of newHolidays) {
      const keyYear = parseInt(key.substring(0, 4), 10)
      if (years.includes(keyYear)) newHolidays.delete(key)
    }
    years.forEach(y => newLoadedYears.delete(y))
    set({ loadedYears: newLoadedYears, holidays: newHolidays })
    await Promise.all(years.map(y => get().fetchHolidays(y)))
  },

  getHolidayNames: (dateKey: string) => {
    return get().holidays.get(dateKey) ?? []
  },
}))
