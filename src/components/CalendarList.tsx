import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import { useEventTagStore } from '../stores/eventTagStore'
import { useTagFilterStore } from '../stores/tagFilterStore'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'

export default function CalendarList() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  const tags = useEventTagStore(s => s.tags)
  const hiddenTagIds = useTagFilterStore(s => s.hiddenTagIds)
  const toggleTag = useTagFilterStore(s => s.toggleTag)

  return (
    <div className="flex flex-col">
      <p className="text-text-secondary text-xs font-medium uppercase tracking-wider mb-3">
        {t('main.event_types', '이벤트 종류')}
      </p>

      <div className="flex flex-col gap-1">
        {Array.from(tags.values()).map(tag => {
          const hidden = hiddenTagIds.has(tag.uuid)
          const color = tag.color_hex ?? '#9ca3af'

          return (
            <div
              key={tag.uuid}
              className={`flex items-center gap-3 py-1.5 cursor-pointer rounded hover:bg-gray-100 px-1 ${hidden ? 'opacity-50' : ''}`}
              onClick={() => toggleTag(tag.uuid)}
            >
              <Checkbox
                checked={!hidden}
                aria-label={hidden ? `${tag.name} 표시` : `${tag.name} 숨기기`}
                className="h-4 w-4 rounded-sm border-2 pointer-events-none"
                style={!hidden ? { backgroundColor: color, borderColor: color } : { borderColor: color }}
                tabIndex={-1}
              />
              <span className="text-text-primary text-sm truncate">{tag.name}</span>
            </div>
          )
        })}
      </div>

      <div className="py-2 mt-2">
        <Button
          variant="link"
          size="sm"
          onClick={() => navigate('/tags', { state: { background: location } })}
          className="text-xs px-0 h-auto"
        >
          {t('tag.manage', '태그 관리')} &gt;
        </Button>
      </div>
    </div>
  )
}
