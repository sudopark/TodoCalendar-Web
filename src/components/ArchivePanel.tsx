import { useEffect, useRef, useState, useMemo, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, RotateCcw, Trash2 } from 'lucide-react'
import { useDoneTodosCache } from '../repositories/caches/doneTodosCache'
import { useToastStore } from '../stores/toastStore'
import { useUiStore } from '../stores/uiStore'
import { ConfirmDialog } from './ConfirmDialog'
import { useResolvedEventTag } from '../hooks/useResolvedEventTag'
import type { DoneTodo } from '../models'

interface DoneTodoRowProps {
  item: DoneTodo
  onRevert: (id: string) => void
  onRequestDelete: (id: string) => void
  onClick?: (item: DoneTodo, anchorRect: DOMRect) => void
}

function DoneTodoRow({ item, onRevert, onRequestDelete, onClick }: DoneTodoRowProps) {
  const { t } = useTranslation()
  const resolved = useResolvedEventTag(item.event_tag_id)

  function handleRowClick(e: MouseEvent<HTMLLIElement>) {
    if (!onClick) return
    const rect = e.currentTarget.getBoundingClientRect()
    onClick(item, rect)
  }

  return (
    <li
      className={`flex items-center gap-3 py-2.5 rounded-md px-2 -mx-2 transition-colors ${onClick ? 'cursor-pointer hover:bg-surface-elevated' : ''}`}
      onClick={handleRowClick}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full ring-2 ring-surface"
        style={{ backgroundColor: resolved.color }}
      />
      <p className="min-w-0 flex-1 truncate text-sm text-fg">{item.name}</p>
      <button
        type="button"
        aria-label={t('todo.revert')}
        onClick={(e) => { e.stopPropagation(); onRevert(item.uuid) }}
        className="shrink-0 p-1.5 rounded-full text-fg-quaternary hover:text-fg hover:bg-surface-elevated transition-colors"
      >
        <RotateCcw className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label={t('common.delete')}
        onClick={(e) => { e.stopPropagation(); onRequestDelete(item.uuid) }}
        className="shrink-0 p-1.5 rounded-full text-fg-quaternary hover:text-danger hover:bg-danger/10 transition-colors"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-section-label font-semibold uppercase tracking-widest text-fg-quaternary shrink-0">{label}</span>
      <div className="flex-1 h-px bg-line" />
    </div>
  )
}

export interface ArchivePanelProps {
  onDoneTodoClick?: (doneTodo: DoneTodo, anchorRect: DOMRect) => void
}

export function ArchivePanel({ onDoneTodoClick }: ArchivePanelProps = {}) {
  const { t, i18n } = useTranslation()
  const exitArchivePanel = useUiStore(s => s.exitArchivePanel)
  const toggleRightPanel = useUiStore(s => s.toggleRightPanel)
  const { items, hasMore, fetchNext, revert, remove, reset } = useDoneTodosCache()
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const groups = useMemo(() => {
    const result = new Map<string, DoneTodo[]>()
    for (const item of items) {
      const dateKey = item.done_at
        ? new Date(item.done_at * 1000).toLocaleDateString(i18n.language)
        : t('todo.no_date')
      const group = result.get(dateKey) ?? []
      group.push(item)
      result.set(dateKey, group)
    }
    return result
  }, [items, i18n.language, t])

  useEffect(() => {
    reset()
    fetchNext()
    return () => { reset() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) fetchNext()
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [fetchNext])

  const handleRevert = async (id: string) => {
    try {
      // cache.revert 가 응답 todo 를 currentTodosCache 에 직접 addTodo — fetchCurrentTodos 의존 제거.
      // BFF 일관성 의존으로 빈 todo 가 노출되던 회귀 차단.
      await revert(id)
    } catch (e) {
      console.warn('되돌리기 실패:', e)
      useToastStore.getState().show('todo.revert_failed', 'error')
    }
  }

  return (
    <div className="w-full h-full flex flex-col bg-surface relative">
      {/* 닫기(X) — 우측 상단 absolute, 아카이브 모드에서도 패널 전체 닫기 */}
      <button
        onClick={toggleRightPanel}
        aria-label={t('common.close')}
        className="absolute top-2 right-3 z-10 p-1.5 rounded-full hover:bg-surface-sunken transition-colors text-fg-quaternary hover:text-fg-secondary"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      {/* 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-6 pt-2 pb-4 flex flex-col">
          {/* 헤더 — 뒤로가기 + 타이틀 */}
          <div className="mb-6 pr-10 flex items-center gap-2">
            <button
              type="button"
              onClick={exitArchivePanel}
              aria-label={t('settings.back', '뒤로')}
              className="shrink-0 -ml-2 flex h-9 w-9 items-center justify-center rounded-full text-fg-quaternary hover:text-fg hover:bg-surface-elevated transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold text-fg">{t('todo.done_list')}</h1>
          </div>

          {items.length === 0 && hasMore === false && (
            <p className="py-8 text-center text-sm text-fg-tertiary">{t('todo.done_empty')}</p>
          )}

          {Array.from(groups.entries()).map(([dateKey, groupItems]) => (
            <section key={dateKey} className="mb-6">
              <SectionHeader label={dateKey} />
              <ul className="divide-y divide-gray-100">
                {groupItems.map(item => (
                  <DoneTodoRow
                    key={item.uuid}
                    item={item}
                    onRevert={handleRevert}
                    onRequestDelete={setConfirmId}
                    onClick={onDoneTodoClick}
                  />
                ))}
              </ul>
            </section>
          ))}

          <div ref={sentinelRef} className="py-2 text-center text-xs text-fg-quaternary">
            {!hasMore && items.length > 0 && t('todo.all_shown')}
          </div>
        </div>
      </div>

      {confirmId && (
        <ConfirmDialog
          message={t('todo.done_delete_confirm')}
          danger
          onConfirm={async () => {
            try {
              await remove(confirmId)
            } catch (e) {
              console.warn('삭제 실패:', e)
              useToastStore.getState().show('todo.delete_failed', 'error')
            }
            setConfirmId(null)
          }}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}
