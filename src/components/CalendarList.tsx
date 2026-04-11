import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import { useEventTagStore } from '../stores/eventTagStore'
import { useTagFilterStore } from '../stores/tagFilterStore'
import { Checkbox } from '@/components/ui/checkbox'

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
      <p className="text-sidebar-text-dim text-xs font-medium uppercase tracking-wider mb-3">
        {t('main.calendar_list', '내 캘린더')}
      </p>

      <div className="flex flex-col">
        {Array.from(tags.values()).map(tag => {
          const hidden = hiddenTagIds.has(tag.uuid)
          const color = tag.color_hex ?? '#9ca3af'

          return (
            <div
              key={tag.uuid}
              className={`flex items-center gap-3 py-1.5 cursor-pointer ${hidden ? 'opacity-50' : ''}`}
              onClick={() => toggleTag(tag.uuid)}
            >
              <div
                style={{ color }}
                className="[&_[data-slot=checkbox]]:data-[state=checked]:bg-current [&_[data-slot=checkbox]]:data-[state=checked]:border-current"
              >
                <Checkbox
                  checked={!hidden}
                  onCheckedChange={() => toggleTag(tag.uuid)}
                  aria-label={hidden ? `${tag.name} 표시` : `${tag.name} 숨기기`}
                  style={!hidden ? { backgroundColor: color, borderColor: color } : { borderColor: color }}
                />
              </div>
              <span className="text-sidebar-text text-sm truncate">{tag.name}</span>
            </div>
          )
        })}
      </div>

      <div className="py-1.5 mt-1">
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
