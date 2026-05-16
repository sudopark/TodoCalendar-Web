import { createPortal } from 'react-dom'
import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RotateCcw, Trash2, X, Clock, Bell, MapPin, FileText, Link2 } from 'lucide-react'
import type { DoneTodo } from '../../models'
import { displayPlace } from '../../models/EventDetail'
import { useDoneTodoDetailPopoverViewModel } from './useDoneTodoDetailPopoverViewModel'
import { useResolvedEventTag } from '../../hooks/useResolvedEventTag'
import { tagDisplayName } from '../../domain/functions/tagDisplay'
import { ConfirmDialog } from '../ConfirmDialog'
import { EventTimeDisplay } from '../EventTimeDisplay'
import { formatNotification } from '../../utils/formatNotification'
import { useIsMobile } from '../../hooks/useIsMobile'
import { BottomSheet } from '../ui/BottomSheet'

const POPOVER_WIDTH = 320
const THRESHOLD = 200

const ACTION_BTN = 'p-1.5 rounded-full text-fg-quaternary hover:text-fg hover:bg-surface-elevated transition-colors disabled:opacity-50'
const INFO_ROW = 'flex items-start gap-2 text-info text-fg-secondary leading-snug'
const INFO_ICON = 'h-4 w-4 text-fg-quaternary mt-0.5 shrink-0'

export interface DoneTodoDetailPopoverProps {
  doneTodo: DoneTodo
  /** 데스크톱 floating 카드 anchor — 없으면 viewport center로 fallback. 모바일은 무시. */
  anchorRect?: DOMRect
  onClose: () => void
  onReverted: () => void
  onDeleted: () => void
}

export function DoneTodoDetailPopover({
  doneTodo,
  anchorRect,
  onClose,
  onReverted,
  onDeleted,
}: DoneTodoDetailPopoverProps) {
  const { t, i18n } = useTranslation()
  const isMobile = useIsMobile()
  const vm = useDoneTodoDetailPopoverViewModel(doneTodo)
  const resolved = useResolvedEventTag(doneTodo.event_tag_id)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const titleId = useId()

  // ESC 닫기 — ConfirmDialog 가 떠 있는 동안에는 dialog 자체의 ESC 핸들러가 onCancel 을 처리하도록
  // popover 측 ESC 는 showDeleteConfirm guard 로 일시 비활성. dialog 가 닫히면 다시 활성.
  // 모바일에서는 BottomSheet 가 자체적으로 ESC 를 처리하므로 등록 skip.
  useEffect(() => {
    if (isMobile) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !showDeleteConfirm) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, showDeleteConfirm, isMobile])

  const dateLocale = i18n.language === 'en' ? 'en-US' : 'ko-KR'
  const doneTimeText = doneTodo.done_at
    ? new Date(doneTodo.done_at * 1000).toLocaleString(dateLocale, {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null

  // 원래 시간(originEventTime) — EventTimeDisplay 재사용으로 EventDetailPopover 와 포맷 일관성 확보
  const originEventTime = doneTodo.event_time ?? null

  const notifications = doneTodo.notification_options ?? null
  const notificationText = notifications && notifications.length > 0
    ? notifications.map(n => formatNotification(n, t)).filter(Boolean).join(', ')
    : null

  const tagColor = resolved.color
  const tagName = tagDisplayName(resolved, t)
  const placeText = displayPlace(vm.detail?.place)

  const body = (
    <>
      {/* 우상단 3 버튼 */}
      <div className="absolute top-3 right-3 flex items-center gap-1">
        <button
          type="button"
          aria-label={t('todo.revert', '되돌리기')}
          disabled={vm.isReverting}
          onClick={async () => {
            // 실패 시 popover 는 그대로 두고 토스트만 노출 — 사용자 재시도 동선 보존
            const ok = await vm.revert()
            if (ok) onReverted()
          }}
          className={ACTION_BTN}
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label={t('common.delete', '삭제')}
          disabled={vm.isDeleting}
          onClick={() => setShowDeleteConfirm(true)}
          className={`${ACTION_BTN} hover:text-danger hover:bg-danger/10`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label={t('common.close', '닫기')}
          onClick={onClose}
          className={ACTION_BTN}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 이름 + 태그 */}
      <p id={titleId} className="pr-24 text-lg font-semibold text-fg">{doneTodo.name}</p>
      <div className="mt-1 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tagColor }} />
        <span className="text-xs text-fg-secondary">{tagName}</span>
      </div>

      {/* 본문: 시간 / 알림 / url / memo / place */}
      <div className="mt-4 space-y-2">
        {doneTimeText && (
          <div className={INFO_ROW}>
            <Clock className={INFO_ICON} />
            <div>
              <p className="text-section-label uppercase tracking-wider text-fg-quaternary">{t('todo.done_at_label', '완료 시각')}</p>
              <p>{doneTimeText}</p>
            </div>
          </div>
        )}
        {originEventTime && (
          <div className={INFO_ROW}>
            <Clock className={INFO_ICON} />
            <div>
              <p className="text-section-label uppercase tracking-wider text-fg-quaternary">{t('todo.original_time_label', '원래 시간')}</p>
              <p><EventTimeDisplay eventTime={originEventTime} /></p>
            </div>
          </div>
        )}
        {notificationText && (
          <div className={INFO_ROW}>
            <Bell className={INFO_ICON} />
            <p>{notificationText}</p>
          </div>
        )}
        {vm.detail?.url && (
          <div className={INFO_ROW}>
            <Link2 className={INFO_ICON} />
            <a
              href={vm.detail.url}
              target="_blank"
              rel="noreferrer"
              className="text-fg underline underline-offset-2 hover:opacity-60 transition-opacity truncate"
            >
              {vm.detail.url}
            </a>
          </div>
        )}
        {vm.detail?.memo && (
          <div className={INFO_ROW}>
            <FileText className={INFO_ICON} />
            <p className="whitespace-pre-wrap">{vm.detail.memo}</p>
          </div>
        )}
        {placeText && (
          <div className={INFO_ROW}>
            <MapPin className={INFO_ICON} />
            <p>{placeText}</p>
          </div>
        )}
      </div>
    </>
  )

  if (isMobile) {
    return (
      <>
        <BottomSheet open onClose={onClose} aria-labelledby={titleId}>{body}</BottomSheet>
        {showDeleteConfirm && (
          <ConfirmDialog
            message={t('todo.done_delete_confirm')}
            danger
            onConfirm={async () => {
              const ok = await vm.remove()
              setShowDeleteConfirm(false)
              // 실패 시에는 popover 를 닫지 않아 사용자가 재시도하거나 확인할 수 있게 한다
              if (ok) onDeleted()
            }}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        )}
      </>
    )
  }

  // 데스크톱: 좌표 anchored 카드. anchorRect 부재 시 viewport center fallback.
  const showBelow = anchorRect ? window.innerHeight - anchorRect.bottom > THRESHOLD : true
  const top = anchorRect
    ? (showBelow ? anchorRect.bottom + 4 : anchorRect.top - 4)
    : window.innerHeight / 2
  const translateY = anchorRect ? (showBelow ? '0' : '-100%') : '-50%'
  const leftRaw = anchorRect ? anchorRect.left : (window.innerWidth - POPOVER_WIDTH) / 2
  const left = Math.min(leftRaw, window.innerWidth - POPOVER_WIDTH - 16)

  const popover = (
    <>
      {/* 백드롭 */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        data-testid="done-todo-detail-backdrop"
      />
      {/* 카드 — EventDetailPopover 와 톤 정합 (rounded-xl, shadow-xl, gray-100 border, 폭 320) */}
      <div
        className="fixed z-50 bg-surface-elevated rounded-xl shadow-xl border border-line p-5"
        style={{ top, left, transform: `translateY(${translateY})`, width: POPOVER_WIDTH }}
        data-testid="done-todo-detail-popover"
      >
        <h2 className="sr-only">{t('todo.done_detail_title', '완료된 할 일')}</h2>
        {body}
      </div>

      {showDeleteConfirm && (
        <ConfirmDialog
          message={t('todo.done_delete_confirm')}
          danger
          onConfirm={async () => {
            const ok = await vm.remove()
            setShowDeleteConfirm(false)
            // 실패 시에는 popover 를 닫지 않아 사용자가 재시도하거나 확인할 수 있게 한다
            if (ok) onDeleted()
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  )

  return createPortal(popover, document.body)
}
