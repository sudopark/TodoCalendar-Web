import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { CalendarEvent } from '../utils/eventTimeUtils'
import type { Repeating, NotificationOption } from '../models'
import { useEventTagStore } from '../stores/eventTagStore'
import { EventTimeDisplay } from './EventTimeDisplay'
import { eventDetailApi } from '../api/eventDetailApi'
import type { EventDetail } from '../models'

// SVG Icons
function PencilIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function RepeatIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function MapPinIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function FileTextIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

// Helpers
function repeatingLabel(repeating: Repeating, t: TFunction): string {
  const { option } = repeating
  switch (option.optionType) {
    case 'every_day': return t('repeat.every_day', { n: option.interval })
    case 'every_week': return t('repeat.every_week', { n: option.interval })
    case 'every_month': return t('repeat.every_month', { n: option.interval })
    case 'every_year': return t('repeat.every_year', { n: option.interval })
    case 'every_year_some_day': return t('repeat.every_year_some_day')
    case 'lunar_calendar_every_year': return `${t('repeat.every_year', { n: 1 })} (${t('repeat.lunar')})`
  }
}

const TIME_PRESET_KEYS: { key: string; seconds: number }[] = [
  { key: 'notif.on_time', seconds: 0 },
  { key: 'notif.1min_before', seconds: -60 },
  { key: 'notif.5min_before', seconds: -300 },
  { key: 'notif.10min_before', seconds: -600 },
  { key: 'notif.15min_before', seconds: -900 },
  { key: 'notif.30min_before', seconds: -1800 },
  { key: 'notif.1hour_before', seconds: -3600 },
  { key: 'notif.2hour_before', seconds: -7200 },
  { key: 'notif.1day_before', seconds: -86400 },
  { key: 'notif.2day_before', seconds: -172800 },
  { key: 'notif.1week_before', seconds: -604800 },
]

const ALLDAY_PRESET_KEYS: { key: string; dayOffset: number; hour: number; minute: number }[] = [
  { key: 'notif.allday_same_day_9am', dayOffset: 0, hour: 9, minute: 0 },
  { key: 'notif.allday_same_day_noon', dayOffset: 0, hour: 12, minute: 0 },
  { key: 'notif.allday_1day_before_9am', dayOffset: -1, hour: 9, minute: 0 },
  { key: 'notif.allday_2day_before_9am', dayOffset: -2, hour: 9, minute: 0 },
  { key: 'notif.allday_1week_before_9am', dayOffset: -7, hour: 9, minute: 0 },
]

function formatNotification(option: NotificationOption, t: TFunction): string {
  if (option.type === 'time') {
    const preset = TIME_PRESET_KEYS.find(p => p.seconds === option.seconds)
    return preset ? t(preset.key) : `${Math.abs(option.seconds)}초 전`
  }
  const preset = ALLDAY_PRESET_KEYS.find(
    p => p.dayOffset === option.dayOffset && p.hour === option.hour && p.minute === option.minute,
  )
  return preset ? t(preset.key) : `${Math.abs(option.dayOffset)}일 전 ${option.hour}:${String(option.minute).padStart(2, '0')}`
}

// Props
export interface EventDetailPopoverProps {
  calEvent: CalendarEvent
  anchorRect: DOMRect
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export function EventDetailPopover({
  calEvent,
  anchorRect,
  onClose,
  onEdit,
  onDelete,
}: EventDetailPopoverProps) {
  const { t } = useTranslation()
  const getColorForTagId = useEventTagStore(s => s.getColorForTagId)
  const [eventDetail, setEventDetail] = useState<EventDetail | null>(null)

  const event = calEvent.event
  const tagColor = event.event_tag_id ? getColorForTagId(event.event_tag_id) : null
  const eventTime = event.event_time ?? null
  const repeating = event.repeating ?? null
  const notifications = event.notification_options ?? null

  useEffect(() => {
    // detail은 선택적 정보 — 없어도 팝오버 표시에 지장 없음
    eventDetailApi.getEventDetail(event.uuid).then(setEventDetail).catch(() => {})
  }, [event.uuid])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Position calculation — show below if enough space, otherwise above
  const THRESHOLD = 300
  const showBelow = window.innerHeight - anchorRect.bottom > THRESHOLD
  const top = showBelow ? anchorRect.bottom + 4 : anchorRect.top - 4
  const translateY = showBelow ? '0' : '-100%'
  // Prevent overflow on the right
  const POPOVER_WIDTH = 300
  const leftRaw = anchorRect.left
  const left = Math.min(leftRaw, window.innerWidth - POPOVER_WIDTH - 8)

  const popover = (
    <>
      {/* Transparent backdrop */}
      <div
        className="fixed inset-0 z-30"
        data-testid="popover-backdrop"
        onClick={onClose}
      />
      {/* Popover card */}
      <div
        className="fixed z-40 rounded-lg shadow-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 min-w-[260px] max-w-[300px]"
        style={{ top, left, transform: `translateY(${translateY})` }}
        data-testid="event-detail-popover"
      >
        {/* Top action buttons */}
        <div className="flex justify-end gap-1 mb-3">
          <button
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            data-testid="popover-edit-btn"
            aria-label={t('common.edit', '수정')}
            onClick={onEdit}
          >
            <PencilIcon />
          </button>
          <button
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            data-testid="popover-delete-btn"
            aria-label={t('common.delete', '삭제')}
            onClick={onDelete}
          >
            <TrashIcon />
          </button>
          <button
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            data-testid="popover-close-btn"
            aria-label={t('common.close', '닫기')}
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Event name row */}
        <div className="flex items-start gap-2 mb-2">
          {tagColor && (
            <span
              className="mt-1 inline-block h-3 w-3 flex-shrink-0 rounded-full"
              style={{ backgroundColor: tagColor }}
              data-testid="tag-color-dot"
            />
          )}
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 break-words">
            {event.name}
          </h3>
        </div>

        {/* Time row */}
        {eventTime && (
          <div className="flex items-start gap-2 mb-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="mt-0.5 flex-shrink-0 text-gray-400">
              <ClockIcon />
            </span>
            <span>
              <EventTimeDisplay eventTime={eventTime} />
            </span>
          </div>
        )}

        {/* Repeating row */}
        {repeating && (
          <div
            className="flex items-start gap-2 mb-2 text-sm text-gray-600 dark:text-gray-400"
            data-testid="repeating-info"
          >
            <span className="mt-0.5 flex-shrink-0 text-gray-400">
              <RepeatIcon />
            </span>
            <span>{repeatingLabel(repeating, t)}</span>
          </div>
        )}

        {/* Notifications row */}
        {notifications && notifications.length > 0 && (
          <div
            className="flex items-start gap-2 mb-2 text-sm text-gray-600 dark:text-gray-400"
            data-testid="notification-info"
          >
            <span className="mt-0.5 flex-shrink-0 text-gray-400">
              <BellIcon />
            </span>
            <span>{notifications.map(n => formatNotification(n, t)).join(', ')}</span>
          </div>
        )}

        {/* Additional info from API */}
        {eventDetail?.place && (
          <div className="flex items-start gap-2 mb-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="mt-0.5 flex-shrink-0 text-gray-400">
              <MapPinIcon />
            </span>
            <span className="break-words">{eventDetail.place}</span>
          </div>
        )}

        {eventDetail?.url && (
          <div className="flex items-start gap-2 mb-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="mt-0.5 flex-shrink-0 text-gray-400">
              <LinkIcon />
            </span>
            <a
              href={eventDetail.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline break-all"
            >
              {eventDetail.url}
            </a>
          </div>
        )}

        {eventDetail?.memo && (
          <div className="flex items-start gap-2 mb-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="mt-0.5 flex-shrink-0 text-gray-400">
              <FileTextIcon />
            </span>
            <span className="whitespace-pre-wrap break-words">{eventDetail.memo}</span>
          </div>
        )}
      </div>
    </>
  )

  return createPortal(popover, document.body)
}
