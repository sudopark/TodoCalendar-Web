import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, ChevronLeft } from 'lucide-react'
import { useEventTagListCache } from '../../../repositories/caches/eventTagListCache'
import { useToastStore } from '../../../stores/toastStore'
import { buildTagRows } from '../../../domain/tag/buildTagRows'
import type { TagRowModel } from '../../../domain/tag/buildTagRows'
import { TagRow } from './TagRow'
import { TagEditPanel } from './TagEditPanel'

type PanelMode =
  | { kind: 'list' }
  | { kind: 'create' }
  | { kind: 'edit'; row: TagRowModel }

interface Props {
  onClose: () => void
}

export function TagManagementPanel({ onClose }: Props) {
  const { t } = useTranslation()
  const tags = useEventTagListCache(s => s.tags)
  const defaultTagColors = useEventTagListCache(s => s.defaultTagColors)
  const fetchAll = useEventTagListCache(s => s.fetchAll)

  const [panel, setPanel] = useState<PanelMode>({ kind: 'list' })

  useEffect(() => {
    fetchAll().catch(e => {
      console.warn('태그 로드 실패:', e)
      useToastStore.getState().show(t('error.data_load_failed'), 'error')
    })
  }, [fetchAll, t])

  const rows = useMemo(
    () => buildTagRows(tags, defaultTagColors, (key: string, fallback?: string) => t(key, fallback ?? key)),
    [tags, defaultTagColors, t],
  )

  if (panel.kind !== 'list') {
    return (
      <TagEditPanel
        mode={panel.kind === 'create' ? { kind: 'create' } : { kind: 'edit', row: panel.row }}
        onBack={() => setPanel({ kind: 'list' })}
      />
    )
  }

  return (
    <div className="flex flex-col">
      {/* 헤더 — 뒤로가기 + 타이틀 + 새 태그 추가 */}
      <div className="flex items-center gap-2 mb-6">
        <button
          type="button"
          onClick={onClose}
          aria-label={t('tag.close_page', '태그 관리 닫기')}
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:text-[#1f1f1f] hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="flex-1 text-lg font-semibold text-[#1f1f1f]">
          {t('tag.event_types', '이벤트 종류')}
        </h2>
        <button
          type="button"
          onClick={() => setPanel({ kind: 'create' })}
          aria-label={t('tag.add_new', '새 태그 추가')}
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:text-[#1f1f1f] hover:bg-gray-50 transition-colors"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* 리스트 — 얇은 row divider */}
      <ul className="divide-y divide-gray-100">
        {rows.map(row => (
          <li key={row.id}>
            <TagRow row={row} onEdit={() => setPanel({ kind: 'edit', row })} />
          </li>
        ))}
      </ul>
    </div>
  )
}
