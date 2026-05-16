/**
 * @internal repositories 모듈 내부에서만 사용. 외부 import 금지.
 * Repository 클래스를 통해서만 노출한다.
 */
import { create } from 'zustand'
import { groupEventsByDate, eventTimeToStartDate, eventTimeToEndDate, formatDateKey, yearRange, monthRange } from '../../domain/functions/eventTime'
import type { CalendarEvent } from '../../domain/functions/eventTime'
import type { Todo } from '../../models/Todo'
import type { Schedule } from '../../models/Schedule'

interface CalendarEventsState {
  eventsByDate: Map<string, CalendarEvent[]>
  loading: boolean
  loadedYears: Set<number>
  // 특정 연도의 캐시를 무효화한다. 실제 re-fetch는 호출처(EventRepository)가 담당한다.
  invalidateYears: (years: number[]) => void
  addEvent: (event: CalendarEvent) => void
  removeEvent: (uuid: string) => void
  replaceEvent: (uuid: string, next: CalendarEvent) => void
  replaceMonth: (year: number, month: number, todos: Todo[], schedules: Schedule[]) => void
  reset: () => void
}

export const useCalendarEventsCache = create<CalendarEventsState>((set, get) => ({
  eventsByDate: new Map(),
  loading: false,
  loadedYears: new Set(),

  invalidateYears: (years: number[]) => {
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
