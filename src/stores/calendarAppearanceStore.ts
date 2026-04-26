import { create } from 'zustand'

const STORAGE_KEY = 'calendar_appearance'

export type EventDisplayLevel = 'minimal' | 'medium' | 'full'
export type WeekStartDay = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface AccentDays {
  holiday: boolean
  saturday: boolean
  sunday: boolean
}

interface CalendarAppearance {
  // 캘린더 외관
  weekStartDay: WeekStartDay
  accentDays: AccentDays
  // 캘린더 내 이벤트 표시
  eventDisplayLevel: EventDisplayLevel
  rowHeight: number
  eventFontSizeWeight: number // -7 ~ 0 ~ +7
  showEventNames: boolean
  // 우측 패널(이벤트 리스트) 표시 옵션
  eventListFontSizeWeight: number // -7 ~ 0 ~ +7
  showHolidayInEventList: boolean
  showLunarCalendar: boolean
  showUncompletedTodos: boolean
}

const DEFAULTS: CalendarAppearance = {
  weekStartDay: 0,
  accentDays: { holiday: true, saturday: false, sunday: true },
  eventDisplayLevel: 'medium',
  rowHeight: 70,
  eventFontSizeWeight: 0,
  showEventNames: true,
  eventListFontSizeWeight: 0,
  showHolidayInEventList: true,
  showLunarCalendar: false,
  showUncompletedTodos: true,
}

function load(): CalendarAppearance {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return DEFAULTS
    const parsed = JSON.parse(stored)
    return { ...DEFAULTS, ...parsed }
  } catch {
    return DEFAULTS
  }
}

interface CalendarAppearanceState extends CalendarAppearance {
  setAppearance: (updates: Partial<CalendarAppearance>) => void
  resetToDefaults: () => void
}

export const useCalendarAppearanceStore = create<CalendarAppearanceState>((set, get) => ({
  ...load(),
  setAppearance: updates => {
    const next = { ...get(), ...updates }
    const persistable: CalendarAppearance = {
      weekStartDay: next.weekStartDay,
      accentDays: next.accentDays,
      eventDisplayLevel: next.eventDisplayLevel,
      rowHeight: next.rowHeight,
      eventFontSizeWeight: next.eventFontSizeWeight,
      showEventNames: next.showEventNames,
      eventListFontSizeWeight: next.eventListFontSizeWeight,
      showHolidayInEventList: next.showHolidayInEventList,
      showLunarCalendar: next.showLunarCalendar,
      showUncompletedTodos: next.showUncompletedTodos,
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable))
    } catch {
      // quota / private mode
    }
    set(updates)
  },
  resetToDefaults: () => {
    localStorage.removeItem(STORAGE_KEY)
    set(DEFAULTS)
  },
}))
