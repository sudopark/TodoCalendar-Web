import { useMemo, useEffect, useCallback } from 'react'
import { useRepositories } from '../../composition/RepositoriesProvider'
import { useUiStore } from '../../stores/uiStore'
import { useTagFilterStore } from '../../stores/tagFilterStore'
import { useCalendarEventsCache } from '../../repositories/caches/calendarEventsCache'
import { useHolidayCache } from '../../repositories/caches/holidayCache'
import { useForemostEventCache } from '../../repositories/caches/foremostEventCache'
import { useEventTagListCache } from '../../repositories/caches/eventTagListCache'
import { useSettingsCache, type WeekStartDay, type EventDisplayLevel } from '../../repositories/caches/settingsCache'
import { useOpenEventForm } from '../../hooks/useOpenEventForm'
import { useCurrentTodos } from '../../repositories/hooks/useCurrentTodos'
import { useUncompletedTodos } from '../../repositories/hooks/useUncompletedTodos'
import { useMonthEvents } from '../../repositories/hooks/useMonthEvents'
import { buildCalendarGrid } from '../../calendar/calendarUtils'
import type { CalendarEvent } from '../../domain/functions/eventTime'
import type { ForemostEvent, EventTag } from '../../models'
import type { Todo } from '../../models/Todo'
import type { RightPanelMode } from '../../stores/uiStore'

// MARK: - Interface

export interface MainViewModel {
  // ── 캘린더 영역 ──────────────────────────────────────────────────
  currentMonth: Date
  sidebarMonth: Date
  monthEvents: CalendarEvent[]
  eventsByDate: Map<string, CalendarEvent[]>
  loading: boolean
  weekStartDay: WeekStartDay
  eventDisplayLevel: EventDisplayLevel

  // ── 사이드바 ─────────────────────────────────────────────────────
  sidebarOpen: boolean
  selectedDate: Date | null
  getHolidayNames: (dateKey: string) => string[]

  // ── 우측 패널 ─────────────────────────────────────────────────────
  rightPanelOpen: boolean
  rightPanelMode: RightPanelMode
  foremostEvent: ForemostEvent | null
  currentTodos: Todo[]
  uncompletedTodos: Todo[]
  showUncompletedTodos: boolean
  showHolidayInEventList: boolean
  showLunarCalendar: boolean

  // ── 태그 필터 ─────────────────────────────────────────────────────
  tags: EventTag[]
  isTagHidden: (tagId: string | null | undefined) => boolean

  // ── uiStore 액션 ─────────────────────────────────────────────────
  setSelectedDate: (date: Date) => void
  setSidebarMonth: (date: Date) => void
  toggleSidebar: () => void
  goToPrevMonth: () => void
  goToNextMonth: () => void
  goToToday: () => void
  toggleRightPanel: () => void
  openArchivePanel: () => void
  exitArchivePanel: () => void

  // ── 이벤트 폼 액션 ───────────────────────────────────────────────
  openEventForm: (rect: DOMRect | null, type: 'todo' | 'schedule') => void

  // ── 데이터 refresh ────────────────────────────────────────────────
  refresh: () => void
  reloadUncompletedTodos: () => Promise<void>
}

// MARK: - Hook

export function useMainViewModel(): MainViewModel {
  const { eventRepo, holidayRepo } = useRepositories()

  // ── UI 상태 ──────────────────────────────────────────────────────
  const currentMonth = useUiStore(s => s.currentMonth)
  const sidebarMonth = useUiStore(s => s.sidebarMonth)
  const sidebarOpen = useUiStore(s => s.sidebarOpen)
  const selectedDate = useUiStore(s => s.selectedDate)
  const rightPanelOpen = useUiStore(s => s.rightPanelOpen)
  const rightPanelMode = useUiStore(s => s.rightPanelMode)

  // ── UI 액션 ──────────────────────────────────────────────────────
  const setSelectedDate = useUiStore(s => s.setSelectedDate)
  const setSidebarMonth = useUiStore(s => s.setSidebarMonth)
  const toggleSidebar = useUiStore(s => s.toggleSidebar)
  const goToPrevMonth = useUiStore(s => s.goToPrevMonth)
  const goToNextMonth = useUiStore(s => s.goToNextMonth)
  const goToToday = useUiStore(s => s.goToToday)
  const toggleRightPanel = useUiStore(s => s.toggleRightPanel)
  const openArchivePanel = useUiStore(s => s.openArchivePanel)
  const exitArchivePanel = useUiStore(s => s.exitArchivePanel)

  // ── 이벤트 폼 액션 ───────────────────────────────────────────────
  const openEventForm = useOpenEventForm()

  // ── 설정 ──────────────────────────────────────────────────────────
  const weekStartDay = useSettingsCache(s => s.calendarAppearance.weekStartDay)
  const eventDisplayLevel = useSettingsCache(s => s.calendarAppearance.eventDisplayLevel)
  const showUncompletedTodos = useSettingsCache(s => s.calendarAppearance.showUncompletedTodos)
  const showHolidayInEventList = useSettingsCache(s => s.calendarAppearance.showHolidayInEventList)
  const showLunarCalendar = useSettingsCache(s => s.calendarAppearance.showLunarCalendar)

  // ── 달력 이벤트 구독 ───────────────────────────────────────────────
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const monthEvents = useMonthEvents(year, month)
  const eventsByDate = useCalendarEventsCache(s => s.eventsByDate)
  const loading = useCalendarEventsCache(s => s.loading)

  // ── 투두 목록 구독 ─────────────────────────────────────────────────
  const currentTodos = useCurrentTodos()
  const uncompletedTodos = useUncompletedTodos()

  // ── 고정 이벤트 구독 ──────────────────────────────────────────────
  const foremostEvent = useForemostEventCache(s => s.foremostEvent)

  // ── 태그 목록 구독 ─────────────────────────────────────────────────
  const tagsMap = useEventTagListCache(s => s.tags)
  const tags = useMemo(() => Array.from(tagsMap.values()), [tagsMap])
  // hiddenTagIds Set 자체를 구독해야 toggleTag 시 리렌더가 흐른다.
  // store 의 isTagHidden 함수 참조는 set 호출에도 변하지 않아, 함수만 구독하면 자식 트리에 변경이 전파되지 않는다.
  const hiddenTagIds = useTagFilterStore(s => s.hiddenTagIds)
  const isTagHidden = useCallback(
    (tagId: string | null | undefined) => !!tagId && hiddenTagIds.has(tagId),
    [hiddenTagIds],
  )

  // ── 공휴일 ────────────────────────────────────────────────────────
  // holidays Map 자체를 구독해야 setHolidaysForYear 후 리렌더가 흐른다.
  // store 의 getHolidayNames 함수 참조는 set 호출에도 변하지 않아, 함수만 구독하면
  // hiddenTagIds 회귀와 동일하게 자식 트리에 변경이 전파되지 않는다.
  const holidaysMap = useHolidayCache(s => s.holidays)
  const getHolidayNames = useCallback(
    (dateKey: string) => holidaysMap.get(dateKey) ?? [],
    [holidaysMap],
  )

  // ── fetch side effects ────────────────────────────────────────────
  // 캘린더 그리드가 표시하는 연도(들)에 대해 이벤트 + 공휴일 fetch
  const days = useMemo(
    () => buildCalendarGrid(year, month, new Date(), weekStartDay),
    [year, month, weekStartDay],
  )

  // 캘린더 그리드 year 변경 시 events + holidays fetch.
  // currentTodos / uncompletedTodos / foremost / tags 는 AuthGuard 가 인증 통과 시 일괄 prefetch 하므로
  // 여기서 중복 호출하지 않는다 (#99 — 같은 endpoint 가 2~3벌씩 나가던 문제).
  useEffect(() => {
    if (days.length === 0) return
    const fetchYears = new Set(days.map(d => d.date.getFullYear()))
    fetchYears.forEach(y => useCalendarEventsCache.getState().fetchEventsForYear(y))
    fetchYears.forEach(y => holidayRepo.fetch(y))
  }, [days, holidayRepo])

  // LeftSidebar 월 변경 시 공휴일 fetch — ViewModel 이 통합 처리
  useEffect(() => {
    const sbYear = sidebarMonth.getFullYear()
    const sbMonth = sidebarMonth.getMonth()
    const years = new Set([sbYear])
    if (sbMonth === 0) years.add(sbYear - 1)
    if (sbMonth === 11) years.add(sbYear + 1)
    years.forEach(y => holidayRepo.fetch(y))
  }, [sidebarMonth, holidayRepo])

  // ── 액션 ──────────────────────────────────────────────────────────

  const refresh = useCallback(() => {
    const today = new Date()
    const gridDays = buildCalendarGrid(year, month, today)
    const years = [...new Set(gridDays.map(d => d.date.getFullYear()))]
    useCalendarEventsCache.getState().refreshYears(years)
    useHolidayCache.getState().refreshHolidays(years)
  }, [year, month])

  const reloadUncompletedTodos = useCallback(async () => {
    await eventRepo.fetchUncompletedTodos()
  }, [eventRepo])

  return {
    currentMonth,
    sidebarMonth,
    monthEvents,
    eventsByDate,
    loading,
    weekStartDay,
    eventDisplayLevel,
    sidebarOpen,
    selectedDate,
    getHolidayNames,
    rightPanelOpen,
    rightPanelMode,
    foremostEvent,
    currentTodos,
    uncompletedTodos,
    showUncompletedTodos,
    showHolidayInEventList,
    showLunarCalendar,
    tags,
    isTagHidden,
    setSelectedDate,
    setSidebarMonth,
    toggleSidebar,
    goToPrevMonth,
    goToNextMonth,
    goToToday,
    toggleRightPanel,
    openArchivePanel,
    exitArchivePanel,
    openEventForm,
    refresh,
    reloadUncompletedTodos,
  }
}
