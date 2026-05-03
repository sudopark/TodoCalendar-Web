import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { CalendarDay } from './calendarUtils'
import type { CalendarEvent } from '../domain/functions/eventTime'
import { formatDateKey } from '../domain/functions/eventTime'
import { buildWeekEventStack, computeMoreEventCounts, type EventOnWeekRow } from './weekEventStackBuilder'
import { useUiStore } from '../stores/uiStore'
import { useCalendarEventsCache } from '../repositories/caches/calendarEventsCache'
import { useHolidayCache } from '../repositories/caches/holidayCache'
import { useTagFilterStore } from '../stores/tagFilterStore'
import { useSettingsCache } from '../repositories/caches/settingsCache'
import { useResolvedEventTag } from '../hooks/useResolvedEventTag'

const ALL_WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

// 이벤트 바 높이(px) + 간격
const EVENT_ROW_HEIGHT = 20
const EVENT_ROW_GAP = 2
// 날짜 숫자 영역 높이(px)
const DATE_NUMBER_HEIGHT = 28
// 날짜 숫자 아래 이벤트 바 시작 오프셋(px)
const EVENT_AREA_TOP_OFFSET = 4

const TODAY_BG = 'var(--color-action)'

interface MainCalendarGridProps {
  days: CalendarDay[]
  onEventClick?: (calEvent: CalendarEvent, anchorRect: DOMRect) => void
}

function EventTagDot({ tagId }: { tagId: string | null | undefined }) {
  const resolved = useResolvedEventTag(tagId)
  return (
    <span
      className="inline-block h-1 w-1 rounded-full"
      style={{ backgroundColor: resolved.color }}
    />
  )
}

interface EventBarProps {
  ev: EventOnWeekRow
  timeType: 'at' | 'period' | 'allday'
  showEventNames: boolean
  fontSizeWeight: number
  onEventClick?: (calEvent: CalendarEvent, anchorRect: DOMRect) => void
}

function EventBar({ ev, timeType, showEventNames, fontSizeWeight, onEventClick }: EventBarProps) {
  const resolved = useResolvedEventTag(ev.event.event.event_tag_id)
  const color = resolved.color
  const isAtTime = timeType === 'at'

  const fontSize = `${10 + fontSizeWeight}px`

  return (
    <div
      className="flex items-center h-5 rounded px-1.5 py-0.5 leading-tight cursor-pointer pointer-events-auto overflow-hidden text-fg"
      data-testid="event-bar"
      style={{
        gridColumn: `${ev.startCol} / ${ev.endCol + 1}`,
        backgroundColor: isAtTime ? 'transparent' : `${color}22`,
        fontSize,
      }}
      onClick={(e) => {
        e.stopPropagation()
        onEventClick?.(ev.event, e.currentTarget.getBoundingClientRect())
      }}
    >
      <span
        className="inline-block h-[6px] w-[6px] rounded-full mr-1 shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="flex-1 min-w-0 truncate font-medium">
        {showEventNames ? ev.event.event.name : ' '}
      </span>
    </div>
  )
}

export default function MainCalendarGrid({ days, onEventClick }: MainCalendarGridProps) {
  const { t } = useTranslation()
  const selectedDate = useUiStore(s => s.selectedDate)
  const setSelectedDate = useUiStore(s => s.setSelectedDate)
  const eventsByDate = useCalendarEventsCache(s => s.eventsByDate)
  // holidays Map / hiddenTagIds Set 자체를 구독한다 — store 의 getHolidayNames / isTagHidden 함수 참조는
  // set 호출 시에도 변하지 않아, 함수만 구독하면 setHolidaysForYear / toggleTag 후 useMemo 재계산이 트리거되지 않는다.
  const holidaysMap = useHolidayCache(s => s.holidays)
  const getHolidayNames = useCallback(
    (dateKey: string) => holidaysMap.get(dateKey) ?? [],
    [holidaysMap],
  )
  const hiddenTagIds = useTagFilterStore(s => s.hiddenTagIds)
  const isTagHidden = useCallback(
    (tagId: string | null | undefined) => !!tagId && hiddenTagIds.has(tagId),
    [hiddenTagIds],
  )
  const {
    rowHeight,
    weekStartDay,
    accentDays,
    eventDisplayLevel,
    eventFontSizeWeight,
    showEventNames,
  } = useSettingsCache(s => s.calendarAppearance)

  const isMinimal = eventDisplayLevel === 'minimal'
  const isFull = eventDisplayLevel === 'full'

  // 첫 번째 주 컨테이너의 실제 높이를 측정 — medium 모드에서만 의미 있음
  const [actualRowHeight, setActualRowHeight] = useState(rowHeight)
  const firstWeekRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isFull || isMinimal) return
    const el = firstWeekRef.current
    if (!el) return
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setActualRowHeight(entry.contentRect.height)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [isFull, isMinimal])

  // 주 시작 요일에 따라 헤더 키 회전
  const weekdayKeys = useMemo(
    () => [...ALL_WEEKDAY_KEYS.slice(weekStartDay), ...ALL_WEEKDAY_KEYS.slice(0, weekStartDay)],
    [weekStartDay],
  )

  // days를 7일 단위로 주(week) 분할
  const weeks = useMemo(() => {
    const result: CalendarDay[][] = []
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7))
    }
    return result
  }, [days])

  // 숨겨진 태그를 제외한 eventsByDate
  const filteredEventsByDate = useMemo(() => {
    const filtered = new Map<string, CalendarEvent[]>()
    for (const [key, events] of eventsByDate) {
      const visible = events.filter(ev => !isTagHidden(ev.event.event_tag_id))
      if (visible.length > 0) {
        filtered.set(key, visible)
      }
    }
    return filtered
  }, [eventsByDate, isTagHidden])

  // 주별 이벤트 스택 — minimal 모드는 스택 불필요
  const weekStacks = useMemo(
    () => isMinimal ? [] : weeks.map(weekDays => buildWeekEventStack(weekDays, filteredEventsByDate)),
    [isMinimal, weeks, filteredEventsByDate],
  )

  // medium 모드 표시 가능 행 수
  const maxVisibleRows = Math.max(1, Math.floor((actualRowHeight - DATE_NUMBER_HEIGHT - EVENT_AREA_TOP_OFFSET) / (EVENT_ROW_HEIGHT + EVENT_ROW_GAP)))

  const totalWeeks = weeks.length

  // 주 컨테이너 className/style 계산
  function getWeekClass(isLastWeek: boolean): string {
    const base = `relative grid grid-cols-7${!isLastWeek ? ' border-b border-line' : ''}`
    return isFull ? base : `flex-1 ${base}`
  }

  function getWeekStyle(stackRowsLen: number): React.CSSProperties {
    if (isFull) {
      const naturalHeight = DATE_NUMBER_HEIGHT + EVENT_AREA_TOP_OFFSET + stackRowsLen * (EVENT_ROW_HEIGHT + EVENT_ROW_GAP)
      return { minHeight: `${Math.max(rowHeight, naturalHeight)}px` }
    }
    return { minHeight: `${rowHeight}px` }
  }

  return (
    <div className="flex h-full flex-col">
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 pb-2 shrink-0">
        {weekdayKeys.map((key, i) => {
          const dayOfWeek = (weekStartDay + i) % 7
          const accent = (accentDays.sunday && dayOfWeek === 0) || (accentDays.saturday && dayOfWeek === 6)
          return (
            <div
              key={key}
              className={`px-3 py-1.5 text-section-label font-semibold uppercase tracking-widest ${accent ? 'text-[#e8a5a5]' : 'text-fg-quaternary'}`}
            >
              {t(`calendar.weekdays.${key}`, key.toUpperCase())}
            </div>
          )
        })}
      </div>

      {/* 주 단위 반복 */}
      <div className="flex flex-1 flex-col" style={{ minHeight: 0 }}>
        {weeks.map((weekDays, wi) => {
          const stack = weekStacks[wi] ?? { rows: [] }
          const stackRowsLen = stack.rows.length
          const visibleRows = isFull ? stack.rows : stack.rows.slice(0, maxVisibleRows)
          // hidden 이벤트는 row 단위 합계가 아니라 day(col) 별로 집계해 각 셀 위치에 +N 표시 (#102)
          const moreCounts = !isFull
            ? computeMoreEventCounts(stack, maxVisibleRows, weekDays.length)
            : []
          const isLastWeek = wi === totalWeeks - 1

          return (
            <div
              key={wi}
              ref={wi === 0 && !isFull && !isMinimal ? firstWeekRef : undefined}
              className={getWeekClass(isLastWeek)}
              style={getWeekStyle(stackRowsLen)}
            >
              {weekDays.map((day, di) => {
                const isSelected = selectedDate != null && formatDateKey(selectedDate) === day.dateKey
                const holidayNames = getHolidayNames(day.dateKey)
                const isHoliday = holidayNames.length > 0
                const dayOfWeek = day.date.getDay()

                // 해당 날짜의 이벤트
                const dayEvents = filteredEventsByDate.get(day.dateKey) ?? []
                const dotEvents = dayEvents.slice(0, 3)

                const circleBg = day.isToday ? TODAY_BG : undefined
                const ringClass = isSelected && !day.isToday
                  ? 'ring-2 ring-action ring-offset-1 ring-offset-surface'
                  : ''

                const accent = (
                  (accentDays.holiday && isHoliday)
                  || (accentDays.sunday && dayOfWeek === 0)
                  || (accentDays.saturday && dayOfWeek === 6)
                )

                const dateTextColor = day.isToday
                  ? 'text-action-fg font-semibold'
                  : !day.isCurrentMonth
                    ? 'text-fg-quaternary'
                    : accent
                      ? 'text-danger'
                      : 'text-fg'

                return (
                  <div
                    key={di}
                    className="flex flex-col pt-1.5 px-1.5 pb-1 cursor-pointer transition-colors hover:bg-surface-elevated"
                    data-testid="day-cell"
                    data-today={day.isToday || undefined}
                    data-selected={isSelected || undefined}
                    onClick={() => setSelectedDate(day.date)}
                    title={holidayNames.join(', ') || undefined}
                  >
                    <div
                      className={`flex h-7 w-7 items-center justify-center text-sm rounded-full transition-all ${dateTextColor} ${ringClass}`}
                      style={{ backgroundColor: circleBg }}
                    >
                      {day.dayOfMonth}
                    </div>

                    {/* Mobile dots — 항상 표시. minimal 모드에선 데스크톱에서도 표시 */}
                    {dotEvents.length > 0 && (
                      <div
                        className={`mt-0.5 flex gap-0.5 ${isMinimal ? '' : 'md:hidden'}`}
                        data-testid="event-dots"
                      >
                        {dotEvents.map((ev, j) => (
                          <EventTagDot key={j} tagId={ev.event.event_tag_id} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Desktop 이벤트 오버레이 — minimal 모드는 렌더하지 않음 */}
              {!isMinimal && (
                <div
                  className="hidden md:block absolute left-0 right-0 pointer-events-none"
                  style={{ top: `${DATE_NUMBER_HEIGHT + EVENT_AREA_TOP_OFFSET}px` }}
                >
                  {visibleRows.map((row, ri) => (
                    <div
                      key={ri}
                      className="grid grid-cols-7 relative"
                      style={{ height: `${EVENT_ROW_HEIGHT}px`, marginBottom: `${EVENT_ROW_GAP}px` }}
                    >
                      {row.map((ev) => {
                        const timeType = getEventTimeType(ev)
                        const turn = ev.event.type === 'todo'
                          ? ev.event.event.repeating_turn ?? 1
                          : ev.event.event.show_turns?.[0] ?? 1
                        return (
                          <EventBar
                            key={`${ev.event.event.uuid}:${turn}:${ev.startCol}`}
                            ev={ev}
                            timeType={timeType}
                            showEventNames={showEventNames}
                            fontSizeWeight={eventFontSizeWeight}
                            onEventClick={onEventClick}
                          />
                        )
                      })}
                    </div>
                  ))}

                  {moreCounts.length > 0 && (
                    <div className="grid grid-cols-7">
                      {moreCounts.map(({ col, count }) => (
                        <div
                          key={col}
                          className="text-meta font-medium text-fg-tertiary px-1.5 pointer-events-auto"
                          style={{ gridColumn: `${col} / ${col + 1}` }}
                          data-testid="more-events"
                          data-day-col={col}
                        >
                          +{count}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function getEventTimeType(ev: EventOnWeekRow): 'at' | 'period' | 'allday' {
  const calEvent = ev.event
  if (calEvent.type === 'todo') {
    return calEvent.event.event_time?.time_type ?? 'at'
  }
  return calEvent.event.event_time.time_type
}
