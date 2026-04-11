import { useTranslation } from 'react-i18next'
import type { CalendarDay } from './calendarUtils'
import type { CalendarEvent } from '../utils/eventTimeUtils'
import { formatDateKey } from '../utils/eventTimeUtils'
import { useUiStore } from '../stores/uiStore'
import { useCalendarEventsStore } from '../stores/calendarEventsStore'
import { useHolidayStore } from '../stores/holidayStore'
import { useEventTagStore } from '../stores/eventTagStore'
import { useTagFilterStore } from '../stores/tagFilterStore'
import { useCalendarAppearanceStore } from '../stores/calendarAppearanceStore'

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

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

  return (
    <div className="flex h-full flex-col">
      {/* Weekday header row */}
      <div className="grid grid-cols-7 border-b border-border-calendar shrink-0">
        {WEEKDAY_KEYS.map((key, i) => (
          <div
            key={key}
            className={`px-3 py-3 text-xs font-medium uppercase tracking-wide ${i === 0 ? 'text-red-400' : 'text-text-secondary'}`}
          >
            {t(`calendar.weekdays.${key}`, key.toUpperCase())}
          </div>
        ))}
      </div>

      {/* Day cells grid */}
      <div className="grid grid-cols-7 flex-1" style={{ gridAutoRows: '1fr' }}>
        {days.map((day, i) => {
          const isSelected = selectedDate && formatDateKey(selectedDate) === day.dateKey
          const holidayNames = getHolidayNames(day.dateKey)
          const isHoliday = holidayNames.length > 0
          const isSunday = day.date.getDay() === 0

          const events = (eventsByDate.get(day.dateKey) ?? []).filter(ev => !isTagHidden(ev.event.event_tag_id))
          const dotColors: string[] = []
          for (const ev of events.slice(0, 3)) {
            const tagId = ev.event.event_tag_id
            const color = tagId ? getColorForTagId(tagId) : undefined
            dotColors.push(color ?? '#9ca3af')
          }

          const textColor = day.isToday
            ? 'font-semibold text-white'
            : !day.isCurrentMonth
              ? 'text-gray-300'
              : (isHoliday || isSunday)
                ? 'text-red-500'
                : 'text-text-primary'

          const bgClass = day.isToday ? 'bg-brand-dark rounded-full' : ''
          const selectedClass = isSelected && !day.isToday ? 'ring-2 ring-brand-dark rounded-full' : ''

          return (
            <div
              key={i}
              className={`flex flex-col p-2 cursor-pointer border-r border-b border-border-calendar hover:bg-gray-50 ${!day.isCurrentMonth ? 'bg-surface-alt' : ''}`}
              data-testid="day-cell"
              style={{ minHeight: `${rowHeight}px`, fontSize: `${fontSize}px` }}
              onClick={() => setSelectedDate(day.date)}
              title={holidayNames.join(', ') || undefined}
            >
              {day.isToday ? (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-dark text-white font-semibold text-sm">
                  {day.dayOfMonth}
                </div>
              ) : (
                <div className={`flex h-7 w-7 items-center justify-center text-sm font-medium ${textColor} ${selectedClass}`}>
                  {day.dayOfMonth}
                </div>
              )}
              {/* Desktop: color bars with event names */}
              {events.length > 0 && (
                <div className="hidden md:block mt-1 space-y-0.5 w-full">
                  {events.slice(0, 2).map((ev, j) => {
                    const tagId = ev.event.event_tag_id
                    const color = tagId ? getColorForTagId(tagId) : '#9ca3af'
                    return (
                      <div
                        key={j}
                        className="truncate rounded px-1.5 py-0.5 text-[10px] leading-tight text-white cursor-pointer"
                        style={{ backgroundColor: color ?? '#9ca3af' }}
                        data-testid="event-bar"
                        onClick={(e) => {
                          e.stopPropagation()
                          onEventClick?.(ev, e.currentTarget.getBoundingClientRect())
                        }}
                      >
                        {showEventNames ? ev.event.name : '\u00A0'}
                      </div>
                    )
                  })}
                  {events.length > 2 && (
                    <div className="text-[9px] text-text-secondary px-0.5">
                      +{events.length - 2}
                    </div>
                  )}
                </div>
              )}
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
      </div>
    </div>
  )
}
