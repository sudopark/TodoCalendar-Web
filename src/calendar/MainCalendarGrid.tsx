import { useMemo, useRef, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { CalendarDay } from './calendarUtils'
import type { CalendarEvent } from '../utils/eventTimeUtils'
import { formatDateKey } from '../utils/eventTimeUtils'
import { buildWeekEventStack, type EventOnWeekRow } from './weekEventStackBuilder'
import { useUiStore } from '../stores/uiStore'
import { useCalendarEventsStore } from '../stores/calendarEventsStore'
import { useHolidayStore } from '../stores/holidayStore'
import { useEventTagStore } from '../stores/eventTagStore'
import { useTagFilterStore } from '../stores/tagFilterStore'
import { useCalendarAppearanceStore } from '../stores/calendarAppearanceStore'

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

// 이벤트 바 높이(px) + 간격
const EVENT_ROW_HEIGHT = 20
const EVENT_ROW_GAP = 2
// 날짜 숫자 영역 높이(px)
const DATE_NUMBER_HEIGHT = 28
// 날짜 숫자 아래 이벤트 바 시작 오프셋(px)
const EVENT_AREA_TOP_OFFSET = 4

// 셀 강조 색상 (iOS 레퍼런스)
const SELECTED_BG = '#303646'
const TODAY_BG = '#f4f4f4'

interface MainCalendarGridProps {
  days: CalendarDay[]
  onEventClick?: (calEvent: CalendarEvent, anchorRect: DOMRect) => void
}

export default function MainCalendarGrid({ days, onEventClick }: MainCalendarGridProps) {
  const { t } = useTranslation()
  const selectedDate = useUiStore(s => s.selectedDate)
  const setSelectedDate = useUiStore(s => s.setSelectedDate)
  const eventsByDate = useCalendarEventsStore(s => s.eventsByDate)
  const getHolidayNames = useHolidayStore(s => s.getHolidayNames)
  const getColorForTagId = useEventTagStore(s => s.getColorForTagId)
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
      {/* 요일 헤더 — 하단 보더만, 외곽 보더 없음 */}
      <div className="grid grid-cols-7 border-b border-border-calendar shrink-0">
        {WEEKDAY_KEYS.map((key, i) => (
          <div
            key={key}
            className={`px-3 py-2 text-xs font-medium uppercase tracking-wide ${i === 0 ? 'text-red-400' : 'text-text-secondary'}`}
          >
            {t(`calendar.weekdays.${key}`, key.toUpperCase())}
          </div>
        ))}
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
              className={`flex-1 relative grid grid-cols-7 ${!isLastWeek ? 'border-b border-border-calendar' : ''}`}
              style={{ minHeight: `${rowHeight}px` }}
            >
              {weekDays.map((day, di) => {
                const isSelected = selectedDate != null && formatDateKey(selectedDate) === day.dateKey
                const holidayNames = getHolidayNames(day.dateKey)
                const isHoliday = holidayNames.length > 0
                const isSunday = day.date.getDay() === 0
                const isLastCol = di === 6

                // 해당 날짜의 이벤트 (모바일 dots용)
                const dayEvents = filteredEventsByDate.get(day.dateKey) ?? []
                const dotColors: string[] = []
                for (const ev of dayEvents.slice(0, 3)) {
                  const tagId = ev.event.event_tag_id
                  const color = tagId ? getColorForTagId(tagId) : undefined
                  dotColors.push(color ?? '#9ca3af')
                }

                // 셀 배경 결정
                const cellBg = isSelected
                  ? SELECTED_BG
                  : day.isToday
                    ? TODAY_BG
                    : undefined

                // 날짜 텍스트 색 결정
                const dateTextColor = isSelected
                  ? 'text-white'
                  : day.isToday
                    ? 'text-[#323232] font-semibold'
                    : !day.isCurrentMonth
                      ? 'text-gray-300'
                      : (isHoliday || isSunday)
                        ? 'text-red-500'
                        : 'text-[#323232]'

                return (
                  <div
                    key={di}
                    className={`flex flex-col pt-1.5 px-1.5 pb-1 cursor-pointer hover:brightness-95 transition-[filter] ${isLastCol ? '' : 'border-r border-border-calendar'} ${!day.isCurrentMonth && !isSelected ? 'bg-surface-alt' : ''}`}
                    data-testid="day-cell"
                    data-today={day.isToday || undefined}
                    data-selected={isSelected || undefined}
                    style={{
                      backgroundColor: cellBg,
                      fontSize: `${fontSize}px`,
                    }}
                    onClick={() => setSelectedDate(day.date)}
                    title={holidayNames.join(', ') || undefined}
                  >
                    {/* 날짜 숫자 */}
                    <div className={`flex h-7 w-7 items-center justify-center text-sm font-medium ${dateTextColor}`}>
                      {day.dayOfMonth}
                    </div>

                    {/* Mobile: dots */}
                    {dotColors.length > 0 && (
                      <div className="md:hidden mt-0.5 flex gap-0.5" data-testid="event-dots">
                        {dotColors.map((color, j) => (
                          <span
                            key={j}
                            className="inline-block h-1 w-1 rounded-full"
                            style={{ backgroundColor: color }}
                          />
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
                      const color = getEventColor(ev, getColorForTagId)
                      const isAtTime = timeType === 'at'

                      return (
                        <div
                          key={ev.event.event.uuid}
                          className={`flex items-center rounded px-1.5 py-0.5 text-[10px] leading-tight cursor-pointer pointer-events-auto overflow-hidden ${
                            isAtTime ? 'text-[#45454a]' : 'text-white'
                          }`}
                          data-testid="event-bar"
                          style={{
                            gridColumn: `${ev.startCol} / ${ev.endCol + 1}`,
                            backgroundColor: isAtTime ? 'transparent' : color,
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            onEventClick?.(ev.event, e.currentTarget.getBoundingClientRect())
                          }}
                        >
                          <span
                            className="inline-block h-[6px] w-[6px] rounded-full mr-1 shrink-0"
                            style={{ backgroundColor: isAtTime ? color : 'rgba(255,255,255,0.8)' }}
                          />
                          {isAtTime
                            ? <span className="truncate min-w-0">{showEventNames ? ev.event.event.name : '\u00A0'}</span>
                            : (showEventNames ? ev.event.event.name : '\u00A0')
                          }
                        </div>
                      )
                    })}
                  </div>
                ))}

                {/* +N more 표시 */}
                {hiddenCount > 0 && (
                  <div className="grid grid-cols-7">
                    <div className="col-span-7 text-[9px] text-text-secondary px-2 pointer-events-auto">
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

function getEventColor(
  ev: EventOnWeekRow,
  getColorForTagId: (tagId: string) => string | null | undefined,
): string {
  const tagId = ev.event.event.event_tag_id
  if (tagId) {
    return getColorForTagId(tagId) ?? '#9ca3af'
  }
  return '#9ca3af'
}

export function getEventTimeType(ev: EventOnWeekRow): 'at' | 'period' | 'allday' {
  const calEvent = ev.event
  if (calEvent.type === 'todo') {
    return calEvent.event.event_time?.time_type ?? 'at'
  }
  return calEvent.event.event_time.time_type
}
