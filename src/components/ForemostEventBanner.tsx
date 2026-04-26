import { useTranslation } from 'react-i18next'
import { useForemostEventStore } from '../stores/foremostEventStore'
import { useResolvedEventTag } from '../hooks/useResolvedEventTag'
import { useCalendarAppearanceStore } from '../stores/calendarAppearanceStore'
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
  const fontSizeWeight = useCalendarAppearanceStore(s => s.eventListFontSizeWeight)
  const nameFontSize = `${14 + fontSizeWeight}px`

  const event = foremostEvent?.event as Todo | Schedule | undefined
  const resolved = useResolvedEventTag(event?.event_tag_id ?? null)

  if (!foremostEvent?.event || !event) return null

  const eventTime = 'event_time' in event ? event.event_time : undefined
  const tagName = tagDisplayName(resolved, t)

  return (
    <section>
      <button
        data-testid="foremost-banner"
        className="flex w-full gap-3 cursor-pointer group text-left"
        onClick={(e) => {
          const calEvent: CalendarEvent = foremostEvent.is_todo
            ? { type: 'todo', event: event as Todo }
            : { type: 'schedule', event: event as Schedule }
          onEventClick?.(calEvent, e.currentTarget.getBoundingClientRect())
        }}
      >
        <div className="flex flex-col items-center shrink-0 w-3">
          <div
            className="w-2 h-2 rounded-full shrink-0 mt-1.5 ring-2 ring-white group-hover:scale-125 transition-transform duration-150"
            style={{ backgroundColor: resolved.color }}
          />
        </div>
        <div className="flex-1 min-w-0 py-0.5">
          <p
            className="truncate font-semibold text-[#1f1f1f] leading-snug group-hover:text-black transition-colors duration-150"
            style={{ fontSize: nameFontSize }}
          >{event.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-xs text-[#aaa] leading-none">
              <TimeDescription eventTime={eventTime} />
            </span>
            {tagName && (
              <span
                className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none"
                style={{ color: resolved.color, backgroundColor: `${resolved.color}22` }}
              >
                {tagName}
              </span>
            )}
          </div>
        </div>
      </button>
    </section>
  )
}
