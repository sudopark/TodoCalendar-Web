import { useMemo, useEffect } from 'react'
import { useRepositories } from '../../composition/RepositoriesProvider'
import { useUiStore } from '../../stores/uiStore'
import { useTagFilterStore } from '../../stores/tagFilterStore'
import { useCalendarEventsCache } from '../../repositories/caches/calendarEventsCache'
import { useHolidayCache } from '../../repositories/caches/holidayCache'
import { useForemostEventCache } from '../../repositories/caches/foremostEventCache'
import { useEventTagListCache } from '../../repositories/caches/eventTagListCache'
import { useSettingsCache } from '../../repositories/caches/settingsCache'
import { useCurrentTodos } from '../../repositories/hooks/useCurrentTodos'
import { useUncompletedTodos } from '../../repositories/hooks/useUncompletedTodos'
import { useMonthEvents } from '../../repositories/hooks/useMonthEvents'
import { buildCalendarGrid } from '../../calendar/calendarUtils'
import type { CalendarEvent } from '../../domain/functions/eventTime'
import type { ForemostEvent, EventTag } from '../../models'
import type { Todo } from '../../models/Todo'

// MARK: - Interface

export interface MainViewModel {
  // 캘린더 영역
  currentMonth: Date
  monthEvents: CalendarEvent[]
  weekStartDay: number
  eventDisplayLevel: string

  // 우측 패널
  selectedDate: Date | null
  rightPanelOpen: boolean
  foremostEvent: ForemostEvent | null
  currentTodos: Todo[]
  uncompletedTodos: Todo[]
  showUncompletedTodos: boolean

  // 태그 필터
  tags: EventTag[]
  isTagHidden: (tagId: string | null | undefined) => boolean

  // 공휴일
  getHolidayNames: (dateKey: string) => string[]
}

// MARK: - Hook

export function useMainViewModel(): MainViewModel {
  const { eventRepo, holidayRepo, tagRepo, foremostEventRepo } = useRepositories()

  // ── UI 상태 ──────────────────────────────────────────────────────
  const currentMonth = useUiStore(s => s.currentMonth)
  const selectedDate = useUiStore(s => s.selectedDate)
  const rightPanelOpen = useUiStore(s => s.rightPanelOpen)

  // ── 설정 ──────────────────────────────────────────────────────────
  const weekStartDay = useSettingsCache(s => s.calendarAppearance.weekStartDay)
  const eventDisplayLevel = useSettingsCache(s => s.calendarAppearance.eventDisplayLevel)
  const showUncompletedTodos = useSettingsCache(s => s.calendarAppearance.showUncompletedTodos)

  // ── 달력 이벤트 구독 ───────────────────────────────────────────────
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const monthEvents = useMonthEvents(year, month)

  // ── 투두 목록 구독 ─────────────────────────────────────────────────
  const currentTodos = useCurrentTodos()
  const uncompletedTodos = useUncompletedTodos()

  // ── 고정 이벤트 구독 ──────────────────────────────────────────────
  const foremostEvent = useForemostEventCache(s => s.foremostEvent)

  // ── 태그 목록 구독 ─────────────────────────────────────────────────
  const tagsMap = useEventTagListCache(s => s.tags)
  const tags = useMemo(() => Array.from(tagsMap.values()), [tagsMap])
  const isTagHidden = useTagFilterStore(s => s.isTagHidden)

  // ── 공휴일 ────────────────────────────────────────────────────────
  const getHolidayNames = useHolidayCache(s => s.getHolidayNames)

  // ── fetch side effects ────────────────────────────────────────────
  // 캘린더 그리드가 표시하는 연도(들)에 대해 이벤트 + 공휴일 fetch
  const days = useMemo(
    () => buildCalendarGrid(year, month, new Date(), weekStartDay),
    [year, month, weekStartDay],
  )

  useEffect(() => {
    if (days.length === 0) return
    const fetchYears = new Set(days.map(d => d.date.getFullYear()))
    fetchYears.forEach(y => useCalendarEventsCache.getState().fetchEventsForYear(y))
    fetchYears.forEach(y => holidayRepo.fetch(y))
  }, [days, holidayRepo])

  useEffect(() => {
    eventRepo.fetchCurrentTodos()
  }, [eventRepo])

  useEffect(() => {
    eventRepo.fetchUncompletedTodos()
  }, [eventRepo])

  useEffect(() => {
    foremostEventRepo.fetch()
  }, [foremostEventRepo])

  useEffect(() => {
    tagRepo.fetchAll()
  }, [tagRepo])

  return {
    currentMonth,
    monthEvents,
    weekStartDay,
    eventDisplayLevel,
    selectedDate,
    rightPanelOpen,
    foremostEvent,
    currentTodos,
    uncompletedTodos,
    showUncompletedTodos,
    tags,
    isTagHidden,
    getHolidayNames,
  }
}
