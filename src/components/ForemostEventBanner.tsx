import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForemostEventStore } from '../stores/foremostEventStore'
import { useEventTagStore } from '../stores/eventTagStore'
import { useTagName } from '../hooks/useTagName'
import { TimeDescription } from './TimeDescription'
import type { Todo } from '../models/Todo'
import type { Schedule } from '../models/Schedule'

export function ForemostEventBanner() {
  const foremostEvent = useForemostEventStore(s => s.foremostEvent)
  const getColorForTagId = useEventTagStore(s => s.getColorForTagId)
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const getTagName = useTagName()

  if (!foremostEvent?.event) return null

  const event = foremostEvent.event as Todo | Schedule
  const color = event.event_tag_id
    ? (getColorForTagId(event.event_tag_id) ?? '#3b82f6')
    : '#3b82f6'

  const eventTime = 'event_time' in event ? event.event_time : undefined
  const eventType = foremostEvent.is_todo ? 'todo' : 'schedule'
  const tagName = getTagName(event.event_tag_id)

  return (
    <section>
      <h3 className="px-1 py-2 text-[22px] font-semibold text-[#323232]">
        {t('event.foremost', 'Foremost Event')}
      </h3>
      <button
        data-testid="foremost-banner"
        className="flex w-full items-stretch gap-2 rounded-[5px] bg-[#f3f4f7] px-3 py-2.5 text-left hover:brightness-95"
        onClick={() => navigate(`/events/${event.uuid}?type=${eventType}`, {
          state: { background: location, eventType },
        })}
      >
        {/* 컬러바 3px */}
        <div
          className="shrink-0 self-stretch rounded-full"
          style={{ width: 3, backgroundColor: color }}
        />

        {/* 이벤트 정보 3줄 */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#323232]">{event.name}</p>
          <p className="truncate text-xs text-[#646464]">
            <TimeDescription eventTime={eventTime} />
          </p>
          {tagName && (
            <p className="truncate text-[11px] text-[#969696]">{tagName}</p>
          )}
        </div>
      </button>
    </section>
  )
}
