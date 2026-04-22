import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useEventTagStore } from '../../stores/eventTagStore'
import { useToastStore } from '../../stores/toastStore'
import { buildTagRows } from '../../domain/tag/buildTagRows'
import { TagListHeader } from './components/TagListHeader'
import { TagRow } from './components/TagRow'
import { TagEditPanel } from './components/TagEditPanel'
import type { TagRowModel } from '../../domain/tag/buildTagRows'

type PanelMode =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; row: TagRowModel }

export function TagManagementPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const tags = useEventTagStore(s => s.tags)
  const defaultTagColors = useEventTagStore(s => s.defaultTagColors)
  const fetchAll = useEventTagStore(s => s.fetchAll)

  const [panel, setPanel] = useState<PanelMode>({ kind: 'closed' })

  useEffect(() => {
    fetchAll().catch(e => {
      console.warn('태그 로드 실패:', e)
      useToastStore.getState().show(t('error.data_load_failed'), 'error')
    })
  }, [fetchAll, t])

  const rows = useMemo(() => buildTagRows(tags, defaultTagColors, t), [tags, defaultTagColors, t])

  const panelOpen = panel.kind !== 'closed'

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="md:grid md:grid-cols-[minmax(0,1fr)_24rem] md:gap-6 md:max-w-5xl md:mx-auto md:p-6">
        {/* 리스트 영역 */}
        <div className="mx-auto w-full max-w-md px-4 py-6 md:p-0 md:col-start-1">
          <TagListHeader
            onCreate={() => setPanel({ kind: 'create' })}
            onClose={() => navigate(-1)}
          />
          <div className="flex flex-col gap-2">
            {rows.map(row => (
              <TagRow key={row.id} row={row} onEdit={() => setPanel({ kind: 'edit', row })} />
            ))}
          </div>
        </div>

        {/* 편집 패널 — 모바일: 전체 덮는 오버레이 / 데스크톱: grid 두 번째 컬럼 */}
        {panelOpen && (
          <div className="fixed inset-0 z-40 bg-white dark:bg-gray-950 overflow-y-auto p-4 md:static md:inset-auto md:z-auto md:bg-transparent md:overflow-visible md:p-0 md:col-start-2">
            <TagEditPanel
              mode={panel.kind === 'create' ? { kind: 'create' } : { kind: 'edit', row: panel.row }}
              onClose={() => setPanel({ kind: 'closed' })}
            />
          </div>
        )}
      </div>
    </div>
  )
}
