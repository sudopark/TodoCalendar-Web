import { useTranslation } from 'react-i18next'
import { useForemostEventStore } from '../stores/foremostEventStore'
import { useResolvedEventTag } from '../hooks/useResolvedEventTag'
import { tagDisplayName } from '../utils/tagDisplay'
import { TimeDescription } from './TimeDescription'
import type { Todo } from '../models/Todo'
import type { Schedule } from '../models/Schedule'
import type { CalendarEvent } from '../utils/eventTimeUtils'

interface ForemostEventBannerProps {
  onEventClick?: (calEvent: CalendarEvent, anchorRect: DOMRect) => void
}

export function ForemostEventBanner({ onEventClick }: ForemostEventBannerProps) {
  const foremostEvent = useForemostEventStore(s => s.foremostEvent)
  const { t } = useTranslation()

  const event = foremostEvent?.event as Todo | Schedule | undefined
  const resolved = useResolvedEventTag(event?.event_tag_id ?? null)

  if (!foremostEvent?.event || !event) return null

  const eventTime = 'event_time' in event ? event.event_time : undefined
  const tagName = tagDisplayName(resolved, t)

  return (
    <section>
      <h3 className="px-1 py-2 text-[22px] font-semibold text-[#323232]">
        {t('event.foremost', 'Foremost Event')}
      </h3>
      <button
        data-testid="foremost-banner"
        className="flex w-full items-stretch gap-2 rounded-[5px] bg-[#f3f4f7] px-3 py-2.5 text-left hover:brightness-95"
        onClick={(e) => {
          const calEvent: CalendarEvent = foremostEvent.is_todo
            ? { type: 'todo', event: event as Todo }
            : { type: 'schedule', event: event as Schedule }
          onEventClick?.(calEvent, e.currentTarget.getBoundingClientRect())
        }}
      >
        <div
          className="shrink-0 self-stretch rounded-full"
          style={{ width: 3, backgroundColor: resolved.color }}
        />
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
