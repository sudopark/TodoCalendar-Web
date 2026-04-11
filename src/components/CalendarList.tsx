import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import { useEventTagStore } from '../stores/eventTagStore'
import { useTagFilterStore } from '../stores/tagFilterStore'

export default function CalendarList() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  const tags = useEventTagStore(s => s.tags)
  const hiddenTagIds = useTagFilterStore(s => s.hiddenTagIds)
  const toggleTag = useTagFilterStore(s => s.toggleTag)

  const handleTagManagement = () => {
    navigate('/tags', { state: { background: location } })
  }

  return (
    <div className="flex flex-col">
      <p className="px-2 py-1.5 text-xs font-medium text-sidebar-text-dim uppercase tracking-wide">
        {t('main.calendar_list', '내 캘린더')}
      </p>

      <div className="flex flex-col">
        {Array.from(tags.values()).map(tag => {
          const hidden = hiddenTagIds.has(tag.uuid)
          const color = tag.color_hex ?? '#9ca3af'

          return (
            <button
              key={tag.uuid}
              onClick={() => toggleTag(tag.uuid)}
              aria-label={hidden ? `${tag.name} 표시` : `${tag.name} 숨기기`}
              className={`flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-white/10 dark:hover:bg-white/5 text-left transition-opacity ${hidden ? 'opacity-50' : ''}`}
            >
              {hidden ? (
                <span
                  className="inline-block h-3.5 w-3.5 rounded-sm flex-shrink-0 border-2"
                  style={{ borderColor: color, backgroundColor: 'transparent' }}
                />
              ) : (
                <span
                  className="inline-block h-3.5 w-3.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
              )}
              <span className="text-sidebar-text truncate">{tag.name}</span>
            </button>
          )
        })}
      </div>

      <div className="px-2 py-1.5 mt-1">
        <button
          onClick={handleTagManagement}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          {t('tag.manage', '태그 관리')} &gt;
        </button>
      </div>
    </div>
  )
}
