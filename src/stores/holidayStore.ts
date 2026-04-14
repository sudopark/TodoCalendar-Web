import { create } from 'zustand'
import { holidayApi } from '../api/holidayApi'

const STORAGE_KEY = 'holiday_country'

export interface HolidayCountry { locale: string; region: string; code: string }

const DEFAULT_COUNTRY: HolidayCountry = { locale: 'ko', region: 'south_korea', code: 'KR' }

function loadCountry(): HolidayCountry {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : DEFAULT_COUNTRY
  } catch { return DEFAULT_COUNTRY }
}

interface HolidayState {
  country: HolidayCountry
  holidays: Map<string, string[]>
  loadedYears: Set<number>
  setCountry: (country: HolidayCountry) => void
  fetchHolidays: (year: number) => Promise<void>
  refreshHolidays: (years: number[]) => Promise<void>
  getHolidayNames: (dateKey: string) => string[]
}

export const useHolidayStore = create<HolidayState>((set, get) => ({
  country: loadCountry(),
  holidays: new Map(),
  loadedYears: new Set(),

  setCountry: (country: HolidayCountry) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(country))
    set({ country, holidays: new Map(), loadedYears: new Set() })
    // 즉시 fetch하지 않음 — MonthCalendar의 useEffect가 현재 보고 있는 연도로 fetch 위임
  },

  fetchHolidays: async (year: number) => {
    if (get().loadedYears.has(year)) return
    const { locale, code } = get().country
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
