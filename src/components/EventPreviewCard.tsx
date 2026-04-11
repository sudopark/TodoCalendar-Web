import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { CalendarEvent } from '../utils/eventTimeUtils'
import { useEventTagStore } from '../stores/eventTagStore'
import { EventTimeDisplay } from './EventTimeDisplay'

interface EventPreviewCardProps {
  calEvent: CalendarEvent
  anchorRect: DOMRect
  onClose: () => void
}

export default function EventPreviewCard({ calEvent, anchorRect, onClose }: EventPreviewCardProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const getColorForTagId = useEventTagStore(s => s.getColorForTagId)

  const event = calEvent.event
  const tagColor = event.event_tag_id ? getColorForTagId(event.event_tag_id) : null
  const eventTime = event.event_time

  const showBelow = window.innerHeight - anchorRect.bottom > 200
  const top = showBelow ? anchorRect.bottom : anchorRect.top
  const translateY = showBelow ? '0' : '-100%'
  const left = anchorRect.left

  function handleEdit() {
    const path = calEvent.type === 'todo'
      ? `/todos/${event.uuid}/edit`
      : `/schedules/${event.uuid}/edit`
    navigate(path, { state: { background: location } })
    onClose()
  }

  const card = (
    <>
      {/* Transparent backdrop */}
      <div
        className="fixed inset-0 z-30"
        data-testid="preview-backdrop"
        onClick={onClose}
      />
      {/* Card */}
      <div
        className="fixed z-40 rounded-lg shadow-xl border dark:border-gray-700 bg-white dark:bg-gray-800 p-4 min-w-[240px]"
        style={{ top, left, transform: `translateY(${translateY})` }}
        data-testid="event-preview-card"
      >
        <div className="flex items-start gap-2">
          {tagColor && (
            <span
              className="mt-1 inline-block h-3 w-3 flex-shrink-0 rounded-full"
              style={{ backgroundColor: tagColor }}
              data-testid="tag-color-dot"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {event.name}
            </p>
            {eventTime && (
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                <EventTimeDisplay eventTime={eventTime} />
              </p>
            )}
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            className="rounded-md bg-blue-500 px-3 py-1 text-sm font-medium text-white hover:bg-blue-600"
            onClick={handleEdit}
          >
            {t('main.event_preview_edit', '수정')}
          </button>
        </div>
      </div>
    </>
  )

  return createPortal(card, document.body)
}
