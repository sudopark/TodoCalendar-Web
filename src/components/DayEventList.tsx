import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCalendarEventsStore } from '../stores/calendarEventsStore'
import { useEventTagStore } from '../stores/eventTagStore'
import { useTagFilterStore } from '../stores/tagFilterStore'
import { formatDateKey } from '../utils/eventTimeUtils'
import { CellTimeLabel } from './CellTimeLabel'
import type { CalendarEvent } from '../utils/eventTimeUtils'
import type { EventTime } from '../models'

function EventItem({ calEvent, onNavigate }: { calEvent: CalendarEvent; onNavigate: () => void }) {
  const getColorForTagId = useEventTagStore(s => s.getColorForTagId)

  const { name, event_tag_id, event_time } = calEvent.type === 'todo'
    ? { ...calEvent.event, event_time: calEvent.event.event_time ?? undefined }
    : { ...calEvent.event, event_time: calEvent.event.event_time }

  const color = event_tag_id ? (getColorForTagId(event_tag_id) ?? '#9ca3af') : '#9ca3af'

  return (
    <div
      className="flex items-center gap-2 rounded-[5px] bg-[#f3f4f7] px-2 hover:brightness-95 cursor-pointer"
      style={{ height: 50 }}
      onClick={onNavigate}
    >
      {/* 좌측 시간 영역 52px */}
      <div className="shrink-0" style={{ width: 52 }}>
        <CellTimeLabel type={calEvent.type} eventTime={event_time} />
      </div>

      {/* 컬러바 6px */}
      <div
        className="shrink-0 self-stretch rounded-[3px] my-2"
        style={{ width: 6, backgroundColor: color }}
      />

      {/* 이벤트 정보 */}
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-[#323232]">{name}</p>
        {event_time && event_time.time_type === 'period' && (
          <p className="truncate text-xs text-[#646464]">
            <PeriodDescription eventTime={event_time} />
          </p>
        )}
      </div>
    </div>
  )
}

function PeriodDescription({ eventTime }: { eventTime: EventTime }) {
  if (eventTime.time_type !== 'period') return null
  const start = new Date(eventTime.period_start * 1000)
  const end = new Date(eventTime.period_end * 1000)
  const fmt = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  return <span>{fmt(start)} - {fmt(end)}</span>
}

interface DayEventListProps {
  selectedDate: Date | null
}

export function DayEventList({ selectedDate }: DayEventListProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
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
            onNavigate={() => navigate(`/events/${calEvent.event.uuid}?type=${calEvent.type}`, {
              state: { background: location, eventType: calEvent.type },
            })}
          />
        ))
      )}
    </div>
  )
}
