import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useToastStore } from '../../stores/toastStore'
import { buildTagRows } from '../../domain/tag/buildTagRows'
import type { TagRowModel } from '../../domain/tag/buildTagRows'
import { TagListHeader } from './components/TagListHeader'
import { TagRow } from './components/TagRow'
import { TagEditPanel } from './components/TagEditPanel'
import { useTagManagementViewModel } from './useTagManagementViewModel'

type PanelMode =
  | { kind: 'list' }
  | { kind: 'create' }
  | { kind: 'edit'; row: TagRowModel }

export function TagManagementPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const vm = useTagManagementViewModel()

  const [panel, setPanel] = useState<PanelMode>({ kind: 'list' })

  useEffect(() => {
    vm.fetchAll().catch(e => {
      console.warn('태그 로드 실패:', e)
      useToastStore.getState().show('error.data_load_failed', 'error')
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rows = useMemo(
    () => buildTagRows(
      vm.tags,
      vm.defaultTagColors,
      (key: string, fallback?: string) => t(key, fallback ?? key),
    ),
    [vm.tags, vm.defaultTagColors, t],
  )

  if (panel.kind !== 'list') {
    return (
      <TagEditPanel
        mode={panel.kind === 'create' ? { kind: 'create' } : { kind: 'edit', row: panel.row }}
        onClose={() => setPanel({ kind: 'list' })}
      />
    )
  }

  return (
    <div className="flex flex-col">
      <TagListHeader
        onCreate={() => setPanel({ kind: 'create' })}
        onClose={() => navigate(-1)}
      />

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
