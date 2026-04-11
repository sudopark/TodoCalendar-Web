import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForemostEventStore } from '../stores/foremostEventStore'
import { useEventTagStore } from '../stores/eventTagStore'
import { CellTimeLabel } from './CellTimeLabel'
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
    <section>
      <h3 className="px-1 py-2 text-[22px] font-semibold text-[#323232]">
        {t('event.foremost', 'Foremost Event')}
      </h3>
      <button
        data-testid="foremost-banner"
        className="flex w-full items-center gap-2 rounded-[5px] bg-[#f3f4f7] px-2 text-left hover:brightness-95"
        style={{ height: 50 }}
        onClick={() => navigate(`/events/${event.uuid}?type=${eventType}`, {
          state: { background: location, eventType },
        })}
      >
        {/* 좌측 시간 영역 52px */}
        <div className="shrink-0" style={{ width: 52 }}>
          <CellTimeLabel type={eventType} eventTime={eventTime} />
        </div>

        {/* 컬러바 6px */}
        <div
          className="shrink-0 self-stretch rounded-[3px] my-2"
          style={{ width: 6, backgroundColor: color }}
        />

        {/* 이벤트 정보 */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[#323232]">{event.name}</p>
        </div>
      </button>
    </section>
  )
}
