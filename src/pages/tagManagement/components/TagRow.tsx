import { useTranslation } from 'react-i18next'
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
    <div className="flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2.5">
      <button
        type="button"
        aria-label={t('tag.toggle_visibility', 'Toggle tag visibility')}
        onClick={() => toggleTag(row.id)}
        className="shrink-0 h-7 w-7 rounded-full flex items-center justify-center transition-colors"
        style={
          !hidden
            ? { backgroundColor: row.color }
            : { border: `2px solid ${row.color}`, backgroundColor: 'transparent' }
        }
      >
        {!hidden && (
          <svg
            data-testid="tag-row-check-filled"
            className="h-4 w-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <span className="flex-1 truncate text-sm text-gray-900 dark:text-gray-100">{row.name}</span>

      <div className="h-5 w-px bg-gray-300/60 dark:bg-gray-600/60" aria-hidden="true" />

      <button
        type="button"
        aria-label={t('tag.open_detail', 'Open tag detail')}
        onClick={onEdit}
        className="shrink-0 p-1 rounded text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    </div>
  )
}
