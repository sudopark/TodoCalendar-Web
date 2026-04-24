import { useMemo, useRef, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { CalendarDay } from './calendarUtils'
import type { CalendarEvent } from '../utils/eventTimeUtils'
import { formatDateKey } from '../utils/eventTimeUtils'
import { buildWeekEventStack, type EventOnWeekRow } from './weekEventStackBuilder'
import { useUiStore } from '../stores/uiStore'
import { useCalendarEventsStore } from '../stores/calendarEventsStore'
import { useHolidayStore } from '../stores/holidayStore'
import { useTagFilterStore } from '../stores/tagFilterStore'
import { useCalendarAppearanceStore } from '../stores/calendarAppearanceStore'
import { useResolvedEventTag } from '../hooks/useResolvedEventTag'

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

// 이벤트 바 높이(px) + 간격
const EVENT_ROW_HEIGHT = 20
const EVENT_ROW_GAP = 2
// 날짜 숫자 영역 높이(px)
const DATE_NUMBER_HEIGHT = 28
// 날짜 숫자 아래 이벤트 바 시작 오프셋(px)
const EVENT_AREA_TOP_OFFSET = 4

// 셀 강조 색상
const TODAY_BG = '#1f1f1f'

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
  onEventClick?: (calEvent: CalendarEvent, anchorRect: DOMRect) => void
}

function EventBar({ ev, timeType, showEventNames, onEventClick }: EventBarProps) {
  const resolved = useResolvedEventTag(ev.event.event.event_tag_id)
  const color = resolved.color
  const isAtTime = timeType === 'at'

  return (
    <div
      className="flex items-center h-5 rounded px-1.5 py-0.5 text-[10px] leading-tight cursor-pointer pointer-events-auto overflow-hidden text-[#1f1f1f]"
      data-testid="event-bar"
      style={{
        gridColumn: `${ev.startCol} / ${ev.endCol + 1}`,
        backgroundColor: isAtTime ? 'transparent' : `${color}22`,
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
        {showEventNames ? ev.event.event.name : ' '}
      </span>
    </div>
  )
}

export default function MainCalendarGrid({ days, onEventClick }: MainCalendarGridProps) {
  const { t } = useTranslation()
  const selectedDate = useUiStore(s => s.selectedDate)
  const setSelectedDate = useUiStore(s => s.setSelectedDate)
  const eventsByDate = useCalendarEventsStore(s => s.eventsByDate)
  const getHolidayNames = useHolidayStore(s => s.getHolidayNames)
  const isTagHidden = useTagFilterStore(s => s.isTagHidden)
  const { rowHeight, fontSize, showEventNames } = useCalendarAppearanceStore()

  // 첫 번째 주 컨테이너의 실제 높이를 측정 (flex-1로 인해 minHeight보다 클 수 있음)
  const [actualRowHeight, setActualRowHeight] = useState(rowHeight)
  const firstWeekRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = firstWeekRef.current
    if (!el) return
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setActualRowHeight(entry.contentRect.height)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

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

  // 주별 이벤트 스택 계산
  const weekStacks = useMemo(
    () => weeks.map(weekDays => buildWeekEventStack(weekDays, filteredEventsByDate)),
    [weeks, filteredEventsByDate],
  )

  // 표시 가능한 이벤트 행 수 계산 (실제 셀 높이 기반)
  const maxVisibleRows = Math.max(1, Math.floor((actualRowHeight - DATE_NUMBER_HEIGHT - EVENT_AREA_TOP_OFFSET) / (EVENT_ROW_HEIGHT + EVENT_ROW_GAP)))

  const totalWeeks = weeks.length

  return (
    <div className="flex h-full flex-col">
      {/* 요일 헤더 — SectionHeader와 같은 타이포 언어 */}
      <div className="grid grid-cols-7 pb-2 shrink-0">
        {WEEKDAY_KEYS.map((key, i) => {
          const isWeekend = i === 0 || i === 6
          return (
            <div
              key={key}
              className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest ${isWeekend ? 'text-[#e8a5a5]' : 'text-[#bbb]'}`}
            >
              {t(`calendar.weekdays.${key}`, key.toUpperCase())}
            </div>
          )
        })}
      </div>

      {/* 주 단위 반복 */}
      <div className="flex flex-1 flex-col" style={{ minHeight: 0 }}>
        {weeks.map((weekDays, wi) => {
          const stack = weekStacks[wi]
          const visibleRows = stack.rows.slice(0, maxVisibleRows)
          const hiddenCount = stack.rows.length > maxVisibleRows
            ? stack.rows.slice(maxVisibleRows).reduce((sum, row) => sum + row.length, 0)
            : 0
          const isLastWeek = wi === totalWeeks - 1

          return (
            // flex-1로 균등 높이 분배, 마지막 주는 border-b 없음
            <div
              key={wi}
              ref={wi === 0 ? firstWeekRef : undefined}
              className={`flex-1 relative grid grid-cols-7 ${!isLastWeek ? 'border-b border-gray-100' : ''}`}
              style={{ minHeight: `${rowHeight}px` }}
            >
              {weekDays.map((day, di) => {
                const isSelected = selectedDate != null && formatDateKey(selectedDate) === day.dateKey
                const holidayNames = getHolidayNames(day.dateKey)
                const isHoliday = holidayNames.length > 0
                const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6

                // 해당 날짜의 이벤트 (모바일 dots용)
                const dayEvents = filteredEventsByDate.get(day.dateKey) ?? []
                const visibleDayEvents = dayEvents.slice(0, 3)

                // 날짜 숫자 스타일 결정
                // today: 블랙 fill + 흰 숫자 (강조)
                // selected: 링 아웃라인 (오늘과 차별화)
                // 일반: 텍스트만
                const circleBg = day.isToday ? TODAY_BG : undefined
                const ringClass = isSelected && !day.isToday
                  ? 'ring-2 ring-[#1f1f1f] ring-offset-1 ring-offset-white'
                  : ''

                const dateTextColor = day.isToday
                  ? 'text-white font-semibold'
                  : !day.isCurrentMonth
                    ? 'text-gray-300'
                    : (isHoliday || isWeekend)
                      ? 'text-red-400'
                      : 'text-[#1f1f1f]'

                return (
                  <div
                    key={di}
                    className="flex flex-col pt-1.5 px-1.5 pb-1 cursor-pointer transition-colors hover:bg-gray-50"
                    data-testid="day-cell"
                    data-today={day.isToday || undefined}
                    data-selected={isSelected || undefined}
                    style={{ fontSize: `${fontSize}px` }}
                    onClick={() => setSelectedDate(day.date)}
                    title={holidayNames.join(', ') || undefined}
                  >
                    {/* 날짜 숫자 — today는 fill, selected는 outline */}
                    <div
                      className={`flex h-7 w-7 items-center justify-center text-sm rounded-full transition-all ${dateTextColor} ${ringClass}`}
                      style={{ backgroundColor: circleBg }}
                    >
                      {day.dayOfMonth}
                    </div>

                    {/* Mobile: dots */}
                    {visibleDayEvents.length > 0 && (
                      <div className="md:hidden mt-0.5 flex gap-0.5" data-testid="event-dots">
                        {visibleDayEvents.map((ev, j) => (
                          <EventTagDot key={j} tagId={ev.event.event_tag_id} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Desktop: 이벤트 스팬 행들 (날짜 숫자 아래 절대 위치) */}
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
                          onEventClick={onEventClick}
                        />
                      )
                    })}
                  </div>
                ))}

                {/* +N more 표시 */}
                {hiddenCount > 0 && (
                  <div className="grid grid-cols-7">
                    <div className="col-span-7 text-[10px] font-medium text-[#969696] px-2 pointer-events-auto">
                      +{hiddenCount} more
                    </div>
                  </div>
                )}
              </div>
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
