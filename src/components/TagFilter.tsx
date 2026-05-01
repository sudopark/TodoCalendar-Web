import { useTranslation } from 'react-i18next'
import { useEventTagListCache } from '../repositories/caches/eventTagListCache'
import { useTagFilterStore } from '../stores/tagFilterStore'

export function TagFilter() {
  const { t } = useTranslation()
  const tags = useEventTagListCache(s => s.tags)
  const hiddenTagIds = useTagFilterStore(s => s.hiddenTagIds)
  const toggleTag = useTagFilterStore(s => s.toggleTag)

  if (tags.size === 0) return null

  return (
    <div className="px-3 py-2 border-t border-line">
      <p className="text-xs font-medium text-fg-quaternary uppercase tracking-wide mb-2">{t('tag.filter')}</p>
      <div className="flex flex-wrap gap-2">
        {Array.from(tags.values()).map(tag => {
          const isHidden = hiddenTagIds.has(tag.uuid)
          return (
            <button
              key={tag.uuid}
              onClick={() => toggleTag(tag.uuid)}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition ${
                isHidden ? 'bg-surface-sunken text-fg-quaternary line-through' : 'bg-surface-elevated text-fg-secondary'
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: isHidden ? '#d1d5db' : (tag.color_hex ?? '#9ca3af') }}
              />
              {tag.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
