import { create } from 'zustand'
import { todoApi } from '../api/todoApi'
import { scheduleApi } from '../api/scheduleApi'
import { groupEventsByDate, eventTimeToStartDate, eventTimeToEndDate, formatDateKey, yearRange } from '../utils/eventTimeUtils'
import type { CalendarEvent } from '../utils/eventTimeUtils'

interface CalendarEventsState {
  eventsByDate: Map<string, CalendarEvent[]>
  loading: boolean
  loadedYears: Set<number>
  fetchEventsForYear: (year: number) => Promise<void>
  refreshYears: (years: number[]) => Promise<void>
  addEvent: (event: CalendarEvent) => void
  removeEvent: (uuid: string) => void
  replaceEvent: (uuid: string, next: CalendarEvent) => void
  reset: () => void
}

export const useCalendarEventsStore = create<CalendarEventsState>((set, get) => ({
  eventsByDate: new Map(),
  loading: false,
  loadedYears: new Set(),

  fetchEventsForYear: async (year: number) => {
    if (get().loadedYears.has(year)) return
    set({ loading: true })
    try {
      const range = yearRange(year)
      const [todos, schedules] = await Promise.all([
        todoApi.getTodos(range.lower, range.upper),
        scheduleApi.getSchedules(range.lower, range.upper),
      ])
      const yearEvents = groupEventsByDate(todos, schedules, range.lower, range.upper)
      const merged = new Map(get().eventsByDate)
      for (const [key, events] of yearEvents) {
        const existing = merged.get(key) ?? []
        merged.set(key, [...existing, ...events])
      }
      const newLoadedYears = new Set(get().loadedYears)
      newLoadedYears.add(year)
      set({ eventsByDate: merged, loading: false, loadedYears: newLoadedYears })
    } catch (e) {
      console.warn('이벤트 로드 실패:', e)
      set({ loading: false })
    }
  },

  refreshYears: async (years: number[]) => {
    const newLoadedYears = new Set(get().loadedYears)
    years.forEach(y => newLoadedYears.delete(y))
    const cleaned = new Map<string, CalendarEvent[]>()
    const yearSet = new Set(years)
    for (const [key, events] of get().eventsByDate) {
      const keyYear = parseInt(key.substring(0, 4), 10)
      if (!yearSet.has(keyYear)) {
        cleaned.set(key, events)
      }
    }
    set({ loadedYears: newLoadedYears, eventsByDate: cleaned })
    await Promise.all(years.map(y => get().fetchEventsForYear(y)))
  },

  addEvent: (event: CalendarEvent) => {
    const eventTime = event.type === 'todo'
      ? (event.event.event_time ?? null)
      : event.event.event_time
    if (!eventTime) return

    const updated = new Map(get().eventsByDate)
    const start = eventTimeToStartDate(eventTime)
    const end = eventTimeToEndDate(eventTime)
    const cur = new Date(start)
    cur.setHours(0, 0, 0, 0)
    const endDay = new Date(end)
    endDay.setHours(0, 0, 0, 0)
    while (cur <= endDay) {
      const key = formatDateKey(cur)
      updated.set(key, [...(updated.get(key) ?? []), event])
      cur.setDate(cur.getDate() + 1)
    }
    set({ eventsByDate: updated })
  },

  removeEvent: (uuid: string) => {
    const { eventsByDate } = get()
    const updated = new Map<string, CalendarEvent[]>()
    for (const [key, events] of eventsByDate) {
      const filtered = events.filter(e => e.event.uuid !== uuid)
      if (filtered.length > 0) updated.set(key, filtered)
    }
    set({ eventsByDate: updated })
  },

  replaceEvent: (uuid: string, next: CalendarEvent) => {
    get().removeEvent(uuid)
    get().addEvent(next)
  },

  reset: () => set({ eventsByDate: new Map(), loading: false, loadedYears: new Set() }),
}))
