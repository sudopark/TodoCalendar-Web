import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForemostEventStore } from '../stores/foremostEventStore'
import { useEventTagStore } from '../stores/eventTagStore'
import { EventTimeDisplay } from './EventTimeDisplay'
import type { Todo } from '../models/Todo'
import type { Schedule } from '../models/Schedule'

export function ForemostEventBanner() {
  const foremostEvent = useForemostEventStore(s => s.foremostEvent)
  const getColorForTagId = useEventTagStore(s => s.getColorForTagId)
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()

  if (!foremostEvent?.event) return null

  const event = foremostEvent.event as Todo | Schedule
  const color = event.event_tag_id
    ? (getColorForTagId(event.event_tag_id) ?? '#3b82f6')
    : '#3b82f6'

  const eventTime = 'event_time' in event ? event.event_time : undefined
  const eventType = foremostEvent.is_todo ? 'todo' : 'schedule'

  return (
    <button
      data-testid="foremost-banner"
      className="flex w-full items-stretch gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-left hover:bg-blue-100"
      onClick={() => navigate(`/events/${event.uuid}?type=${eventType}`, {
        state: { background: location, eventType },
      })}
    >
      <div className="w-1 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#323232]">{event.name}</p>
        {eventTime && (
          <p className="text-xs text-[#969696]">
            <EventTimeDisplay eventTime={eventTime} />
          </p>
        )}
      </div>
      <span className="text-xs text-blue-400 self-center">{t('event.pinned')}</span>
    </button>
  )
}
