import { useTranslation } from 'react-i18next'
import { Check, Pencil } from 'lucide-react'
import { useTagFilterStore } from '../../../stores/tagFilterStore'
import type { TagRowModel } from '../../../domain/tag/buildTagRows'

interface TagRowProps {
  row: TagRowModel
  onEdit: () => void
}

export function TagRow({ row, onEdit }: TagRowProps) {
  const { t } = useTranslation()
  const hidden = useTagFilterStore(s => s.hiddenTagIds.has(row.id))
  const toggleTag = useTagFilterStore(s => s.toggleTag)

  return (
    <div className="flex items-center gap-3 py-2.5">
      <button
        type="button"
        aria-label={t('tag.toggle_visibility', 'Toggle tag visibility')}
        onClick={() => toggleTag(row.id)}
        className="shrink-0 h-6 w-6 rounded-full flex items-center justify-center transition-all"
        style={
          !hidden
            ? { backgroundColor: row.color }
            : { border: `2px solid ${row.color}`, backgroundColor: 'transparent' }
        }
      >
        {!hidden && (
          <Check
            data-testid="tag-row-check-filled"
            className="h-3.5 w-3.5 text-white"
            strokeWidth={3}
          />
        )}
      </button>

      <span className="flex-1 truncate text-sm text-fg">{row.name}</span>

      <button
        type="button"
        aria-label={t('tag.open_detail', 'Open tag detail')}
        onClick={onEdit}
        className="shrink-0 p-1.5 rounded-full text-gray-400 hover:text-fg hover:bg-gray-50 transition-colors"
      >
        <Pencil className="h-4 w-4" />
      </button>
    </div>
  )
}
