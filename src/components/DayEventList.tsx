import { useTranslation } from 'react-i18next'
import { useCalendarEventsStore } from '../stores/calendarEventsStore'
import { useTagFilterStore } from '../stores/tagFilterStore'
import { useResolvedEventTag } from '../hooks/useResolvedEventTag'
import { tagDisplayName } from '../utils/tagDisplay'
import { TimeDescription } from './TimeDescription'
import { formatDateKey } from '../utils/eventTimeUtils'
import type { CalendarEvent } from '../utils/eventTimeUtils'

function EventItem({ calEvent, onEventClick }: { calEvent: CalendarEvent; onEventClick: (calEvent: CalendarEvent, anchorRect: DOMRect) => void }) {
  const { t } = useTranslation()

  const { name, event_tag_id, event_time } = calEvent.type === 'todo'
    ? { ...calEvent.event, event_time: calEvent.event.event_time ?? undefined }
    : { ...calEvent.event, event_time: calEvent.event.event_time }

  const resolved = useResolvedEventTag(event_tag_id)
  const color = resolved.color
  const tagName = tagDisplayName(resolved, t)

  return (
    <div
      className="flex items-stretch gap-2 rounded-[5px] bg-[#f3f4f7] px-3 py-2.5 hover:brightness-95 cursor-pointer"
      onClick={(e) => onEventClick(calEvent, e.currentTarget.getBoundingClientRect())}
    >
      {/* 컬러바 3px */}
      <div
        className="shrink-0 self-stretch rounded-full"
        style={{ width: 3, backgroundColor: color }}
      />

      {/* 이벤트 정보 3줄 */}
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-semibold text-[#323232]">{name}</p>
        <p className="truncate text-xs text-[#646464]">
          <TimeDescription eventTime={event_time} />
        </p>
        {tagName && (
          <p className="truncate text-[11px] text-[#969696]">{tagName}</p>
        )}
      </div>
    </div>
  )
}

interface DayEventListProps {
  selectedDate: Date | null
  onEventClick: (calEvent: CalendarEvent, anchorRect: DOMRect) => void
}

export function DayEventList({ selectedDate, onEventClick }: DayEventListProps) {
  const { t } = useTranslation()
  const eventsByDate = useCalendarEventsStore(s => s.eventsByDate)
  const isTagHidden = useTagFilterStore(s => s.isTagHidden)

  if (!selectedDate) return null

  const dateKey = formatDateKey(selectedDate)
  const allEvents = (eventsByDate.get(dateKey) ?? []).filter(ev => !isTagHidden(ev.event.event_tag_id))

  const getTimestamp = (ev: CalendarEvent): number => {
    const et = ev.type === 'todo' ? ev.event.event_time : ev.event.event_time
    if (!et) return Infinity
    if (et.time_type === 'at') return et.timestamp
    return et.period_start
  }

  const sorted = [...allEvents].sort((a, b) => getTimestamp(a) - getTimestamp(b))

  return (
    <div className="flex flex-col gap-1.5">
      {sorted.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-sm text-[#969696]">
          {t('event.no_events')}
        </div>
      ) : (
        sorted.map((calEvent, i) => (
          <EventItem
            key={`${calEvent.event.uuid}-${i}`}
            calEvent={calEvent}
            onEventClick={onEventClick}
          />
        ))
      )}
    </div>
  )
}
