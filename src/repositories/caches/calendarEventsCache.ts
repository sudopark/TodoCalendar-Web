/**
 * @internal repositories 모듈 내부에서만 사용. 외부 import 금지.
 * Repository 클래스를 통해서만 노출한다.
 */
import { create } from 'zustand'
import { todoApi } from '../../api/todoApi'
import { scheduleApi } from '../../api/scheduleApi'
import { groupEventsByDate, eventTimeToStartDate, eventTimeToEndDate, formatDateKey, yearRange, monthRange } from '../../domain/functions/eventTime'
import type { CalendarEvent } from '../../domain/functions/eventTime'
import type { Todo } from '../../models/Todo'
import type { Schedule } from '../../models/Schedule'

interface CalendarEventsState {
  eventsByDate: Map<string, CalendarEvent[]>
  loading: boolean
  loadedYears: Set<number>
  fetchEventsForYear: (year: number) => Promise<void>
  refreshYears: (years: number[]) => Promise<void>
  addEvent: (event: CalendarEvent) => void
  removeEvent: (uuid: string) => void
  replaceEvent: (uuid: string, next: CalendarEvent) => void
  replaceMonth: (year: number, month: number, todos: Todo[], schedules: Schedule[]) => void
  reset: () => void
}

// 진행 중인 fetch promise 추적 — StrictMode 등으로 동일 년도 fetch가 동시에 호출돼도
// 단일 promise를 공유하도록 한다. 둘 다 loadedYears에 들어가기 전에 시작되어
// 같은 데이터를 두 번 merge하던 race condition 차단.
const fetchInFlight = new Map<number, Promise<void>>()

export const useCalendarEventsCache = create<CalendarEventsState>((set, get) => ({
  eventsByDate: new Map(),
  loading: false,
  loadedYears: new Set(),

  fetchEventsForYear: async (year: number) => {
    if (get().loadedYears.has(year)) return
    const existing = fetchInFlight.get(year)
    if (existing) return existing

    const promise = (async () => {
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
          const existingDayEvents = merged.get(key) ?? []
          merged.set(key, [...existingDayEvents, ...events])
        }
        const newLoadedYears = new Set(get().loadedYears)
        newLoadedYears.add(year)
        set({ eventsByDate: merged, loading: false, loadedYears: newLoadedYears })
      } catch (e) {
        console.warn('이벤트 로드 실패:', e)
        set({ loading: false })
      }
    })()
    fetchInFlight.set(year, promise)
    try {
      await promise
    } finally {
      fetchInFlight.delete(year)
    }
  },

  refreshYears: async (years: number[]) => {
    // 진행 중인 fetch가 있으면 먼저 끝나기를 기다린다 — cleaned 상태를 그 fetch가 덮어쓰지 않도록.
    const pending = years.map(y => fetchInFlight.get(y)).filter((p): p is Promise<void> => p !== undefined)
    if (pending.length > 0) {
      await Promise.allSettled(pending)
    }

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

  // 반복 Schedule은 "시리즈 원본"(turn 1의 event_time + repeating 규칙)을 넘겨야 한다.
  // groupEventsByDate가 기간 내 모든 인스턴스로 확장하고 각 turn의 show_turns를 부여한다.
  // 반복 Todo는 한 번에 하나의 인스턴스만 존재하므로 확장 없이 현재 event_time 날짜에만 배치.
  addEvent: (event: CalendarEvent) => {
    const eventTime = event.type === 'todo'
      ? (event.event.event_time ?? null)
      : event.event.event_time
    if (!eventTime) return

    // 반복 이벤트면 loadedYears 범위 내 모든 인스턴스로 확장하여 배치
    if (event.event.repeating) {
      const loadedYears = get().loadedYears
      const targetYears = loadedYears.size > 0
        ? Array.from(loadedYears)
        : [eventTimeToStartDate(eventTime).getFullYear()]
      const updated = new Map(get().eventsByDate)
      for (const year of targetYears) {
        const range = yearRange(year)
        const todos = event.type === 'todo' ? [event.event] : []
        const schedules = event.type === 'schedule' ? [event.event] : []
        const expanded = groupEventsByDate(todos, schedules, range.lower, range.upper)
        for (const [key, events] of expanded) {
          updated.set(key, [...(updated.get(key) ?? []), ...events])
        }
      }
      set({ eventsByDate: updated })
      return
    }

    // 비반복 이벤트: 기존 방식대로 event_time의 시작~종료 범위 날짜에 배치
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

  // 특정 월의 이벤트를 서버 응답으로 통째로 교체한다.
  // EventRepository.fetchMonth 가 서버 응답을 캐시에 반영할 때 사용.
  // groupEventsByDate 를 통해 반복 이벤트의 모든 인스턴스를 해당 월 내 날짜에 펼친다.
  replaceMonth: (year: number, month: number, todos: Todo[], schedules: Schedule[]) => {
    const range = monthRange(year, month)
    const updated = new Map(get().eventsByDate)

    // 해당 월 날짜 키를 모두 제거
    const lowerDate = new Date(range.lower * 1000)
    lowerDate.setHours(0, 0, 0, 0)
    const upperDate = new Date(range.upper * 1000)
    upperDate.setHours(23, 59, 59, 999)
    const cur = new Date(lowerDate)
    while (cur <= upperDate) {
      updated.delete(formatDateKey(cur))
      cur.setDate(cur.getDate() + 1)
    }

    // 반복 이벤트 포함 모든 인스턴스를 날짜별로 펼쳐서 배치
    const monthEvents = groupEventsByDate(todos, schedules, range.lower, range.upper)
    for (const [key, events] of monthEvents) {
      updated.set(key, [...(updated.get(key) ?? []), ...events])
    }

    set({ eventsByDate: updated })
  },

  reset: () => set({ eventsByDate: new Map(), loading: false, loadedYears: new Set() }),
}))
