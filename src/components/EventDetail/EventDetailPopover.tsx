import { createPortal } from 'react-dom'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Pencil, Trash2, X, Clock, Repeat, Bell, MapPin, FileText, Link2 } from 'lucide-react'
import type { CalendarEvent } from '../../domain/functions/eventTime'
import type { Repeating } from '../../models'
import { useResolvedEventTag } from '../../hooks/useResolvedEventTag'
import { tagDisplayName } from '../../domain/functions/tagDisplay'
import { EventTimeDisplay } from '../EventTimeDisplay'
import { useEventDetailPopoverViewModel } from './useEventDetailPopoverViewModel'
import { formatNotification } from '../../utils/formatNotification'
import { useIsMobile } from '../../hooks/useIsMobile'
import { BottomSheet } from '../ui/BottomSheet'

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

const ACTION_BTN = 'p-1.5 rounded-full text-fg-quaternary hover:text-fg hover:bg-surface-elevated transition-colors'
const INFO_ROW = 'flex items-start gap-2 text-info text-fg-secondary leading-snug'
const INFO_ICON = 'h-4 w-4 text-fg-quaternary mt-0.5 shrink-0'

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
  const isMobile = useIsMobile()
  const vm = useEventDetailPopoverViewModel(calEvent)

  const event = calEvent.event
  const resolved = useResolvedEventTag(event.event_tag_id)
  const tagColor = resolved.color
  const tagName = tagDisplayName(resolved, t)
  const eventTime = event.event_time ?? null
  const repeating = event.repeating ?? null
  const notifications = event.notification_options ?? null

  useEffect(() => {
    if (isMobile) return  // BottomSheet가 처리
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, isMobile])

  const body = (
    <>
      {/* 헤더 — 이벤트 이름 + 액션 3버튼 */}
      <div className="flex items-start gap-2 px-4 pt-3.5 pb-3 border-b border-line">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span
            className="h-2 w-2 shrink-0 rounded-full ring-2 ring-surface-elevated"
            style={{ backgroundColor: tagColor }}
            data-testid="tag-color-dot"
          />
          <h3 className="text-[15px] font-semibold text-fg leading-snug break-words min-w-0">
            {event.name}
          </h3>
        </div>
        <div className="flex gap-0.5 shrink-0 -mr-1">
          <button
            className={ACTION_BTN}
            data-testid="popover-edit-btn"
            aria-label={t('common.edit', '수정')}
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            className={ACTION_BTN}
            data-testid="popover-delete-btn"
            aria-label={t('common.delete', '삭제')}
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            className={ACTION_BTN}
            data-testid="popover-close-btn"
            aria-label={t('common.close', '닫기')}
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 바디 — 태그 pill + info rows */}
      <div className="px-4 py-3 space-y-2.5">
        {tagName && (
          <div data-testid="popover-tag-name">
            <span
              className="inline-block text-meta font-semibold px-1.5 py-0.5 rounded-full leading-none"
              style={{ color: tagColor, backgroundColor: `${tagColor}22` }}
            >
              {tagName}
            </span>
          </div>
        )}

        {eventTime && (
          <div className={INFO_ROW}>
            <Clock className={INFO_ICON} />
            <span className="min-w-0">
              <EventTimeDisplay eventTime={eventTime} />
            </span>
          </div>
        )}

        {repeating && (
          <div className={INFO_ROW} data-testid="repeating-info">
            <Repeat className={INFO_ICON} />
            <span className="min-w-0">{repeatingLabel(repeating, t)}</span>
          </div>
        )}

        {notifications && notifications.length > 0 && (
          <div className={INFO_ROW} data-testid="notification-info">
            <Bell className={INFO_ICON} />
            <span className="min-w-0 break-words">
              {notifications.map(n => formatNotification(n, t)).join(', ')}
            </span>
          </div>
        )}

        {vm.eventDetail?.place && (
          <div className={INFO_ROW}>
            <MapPin className={INFO_ICON} />
            <span className="min-w-0 break-words">{vm.eventDetail.place}</span>
          </div>
        )}

        {vm.eventDetail?.url && (
          <div className={INFO_ROW}>
            <Link2 className={INFO_ICON} />
            <a
              href={vm.eventDetail.url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 text-fg underline underline-offset-2 hover:opacity-60 transition-opacity break-all"
            >
              {vm.eventDetail.url}
            </a>
          </div>
        )}

        {vm.eventDetail?.memo && (
          <div className={INFO_ROW}>
            <FileText className={INFO_ICON} />
            <span className="min-w-0 whitespace-pre-wrap break-words">{vm.eventDetail.memo}</span>
          </div>
        )}
      </div>
    </>
  )

  if (isMobile) {
    return (
      <BottomSheet open onClose={onClose}>
        {body}
      </BottomSheet>
    )
  }

  // 데스크톱: 기존 좌표 anchored 카드
  const THRESHOLD = 300
  const showBelow = window.innerHeight - anchorRect.bottom > THRESHOLD
  const top = showBelow ? anchorRect.bottom + 4 : anchorRect.top - 4
  const translateY = showBelow ? '0' : '-100%'
  const POPOVER_WIDTH = 320
  const leftRaw = anchorRect.left
  const left = Math.min(leftRaw, window.innerWidth - POPOVER_WIDTH - 8)

  const popover = (
    <>
      <div
        className="fixed inset-0 z-30"
        data-testid="popover-backdrop"
        onClick={onClose}
      />
      <div
        className="fixed z-40 rounded-xl shadow-xl bg-surface-elevated border border-line overflow-hidden min-w-[280px] max-w-[320px] animate-in fade-in-0 duration-150"
        style={{ top, left, transform: `translateY(${translateY})` }}
        data-testid="event-detail-popover"
      >
        {body}
      </div>
    </>
  )

  return createPortal(popover, document.body)
}
