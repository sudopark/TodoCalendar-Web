import { createPortal } from 'react-dom'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RotateCcw, Trash2, X, Clock, Bell, MapPin, FileText, Link2 } from 'lucide-react'
import type { DoneTodo } from '../../models'
import { useDoneTodoDetailPopoverViewModel } from './useDoneTodoDetailPopoverViewModel'
import { useResolvedEventTag } from '../../hooks/useResolvedEventTag'
import { tagDisplayName } from '../../domain/functions/tagDisplay'
import { ConfirmDialog } from '../ConfirmDialog'
import { formatNotification } from '../../utils/formatNotification'

const POPOVER_WIDTH = 360
const THRESHOLD = 200

const ACTION_BTN = 'p-1.5 rounded-full text-gray-400 hover:text-[#1f1f1f] hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50'
const INFO_ROW = 'flex items-start gap-2 text-[13px] text-[#6b6b6b] dark:text-gray-300 leading-snug'
const INFO_ICON = 'h-4 w-4 text-[#bbb] mt-0.5 shrink-0'

export interface DoneTodoDetailPopoverProps {
  doneTodo: DoneTodo
  anchorRect: DOMRect
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
  const vm = useDoneTodoDetailPopoverViewModel(doneTodo)
  const resolved = useResolvedEventTag(doneTodo.event_tag_id)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // ESC 닫기 — ConfirmDialog 가 열려 있을 때는 dialog 가 stopPropagation 책임
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !showDeleteConfirm) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, showDeleteConfirm])

  // 위치 계산 — EventDetailPopover 와 동일 inline 패턴
  const showBelow = window.innerHeight - anchorRect.bottom > THRESHOLD
  const top = showBelow ? anchorRect.bottom + 4 : anchorRect.top - 4
  const translateY = showBelow ? '0' : '-100%'
  const leftRaw = anchorRect.left
  const left = Math.min(leftRaw, window.innerWidth - POPOVER_WIDTH - 16)

  const dateLocale = i18n.language === 'en' ? 'en-US' : 'ko-KR'
  const doneTimeText = doneTodo.done_at
    ? new Date(doneTodo.done_at * 1000).toLocaleString(dateLocale, {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null

  const originTimeText = useMemo(() => {
    if (!doneTodo.event_time) return null
    const time = doneTodo.event_time
    if (time.time_type === 'at') {
      return new Date(time.timestamp * 1000).toLocaleString(dateLocale)
    }
    if (time.time_type === 'allday') {
      return new Date(time.period_start * 1000).toLocaleDateString(dateLocale)
    }
    if (time.time_type === 'period') {
      return `${new Date(time.period_start * 1000).toLocaleString(dateLocale)} ~ ${new Date(time.period_end * 1000).toLocaleString(dateLocale)}`
    }
    return null
  }, [doneTodo.event_time, dateLocale])

  const notifications = doneTodo.notification_options ?? null
  const notificationText = notifications && notifications.length > 0
    ? notifications.map(n => formatNotification(n, t)).filter(Boolean).join(', ')
    : null

  const tagColor = resolved.color
  const tagName = tagDisplayName(resolved, t)

  const popover = (
    <>
      {/* 백드롭 */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        data-testid="done-todo-detail-backdrop"
      />
      {/* 카드 */}
      <div
        className="fixed z-50 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-border-light p-5"
        style={{ top, left, transform: `translateY(${translateY})`, width: POPOVER_WIDTH }}
        data-testid="done-todo-detail-popover"
      >
        <h2 className="sr-only">{t('todo.done_detail_title', '완료된 할 일')}</h2>

        {/* 우상단 3 버튼 */}
        <div className="absolute top-3 right-3 flex items-center gap-1">
          <button
            type="button"
            aria-label={t('todo.revert', '되돌리기')}
            disabled={vm.isReverting}
            onClick={async () => {
              await vm.revert()
              onReverted()
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
            className={`${ACTION_BTN} hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30`}
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
        <p className="pr-24 text-lg font-semibold text-[#1f1f1f] dark:text-gray-100">{doneTodo.name}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tagColor }} />
          <span className="text-xs text-[#6b6b6b] dark:text-gray-400">{tagName}</span>
        </div>

        {/* 본문: 시간 / 알림 / url / memo / place */}
        <div className="mt-4 space-y-2">
          {doneTimeText && (
            <div className={INFO_ROW}>
              <Clock className={INFO_ICON} />
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[#bbb]">{t('todo.done_at_label', '완료 시각')}</p>
                <p>{doneTimeText}</p>
              </div>
            </div>
          )}
          {originTimeText && (
            <div className={INFO_ROW}>
              <Clock className={INFO_ICON} />
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[#bbb]">{t('todo.original_time_label', '원래 시간')}</p>
                <p>{originTimeText}</p>
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
                className="text-blue-600 dark:text-blue-400 hover:underline truncate"
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
          {vm.detail?.place && (
            <div className={INFO_ROW}>
              <MapPin className={INFO_ICON} />
              <p>{vm.detail.place}</p>
            </div>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmDialog
          message={t('todo.done_delete_confirm')}
          danger
          onConfirm={async () => {
            await vm.remove()
            setShowDeleteConfirm(false)
            onDeleted()
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  )

  return createPortal(popover, document.body)
}
