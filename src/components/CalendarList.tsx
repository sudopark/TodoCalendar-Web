import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import { useEventTagStore, DEFAULT_TAG_ID, HOLIDAY_TAG_ID } from '../stores/eventTagStore'
import { useTagFilterStore } from '../stores/tagFilterStore'
import type { EventTag } from '../models'

export default function CalendarList() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  const tags = useEventTagStore(s => s.tags)
  const defaultTagColors = useEventTagStore(s => s.defaultTagColors)
  const hiddenTagIds = useTagFilterStore(s => s.hiddenTagIds)
  const toggleTag = useTagFilterStore(s => s.toggleTag)

  const allTags = useMemo<EventTag[]>(() => {
    const defaultTags: EventTag[] = [
      { uuid: DEFAULT_TAG_ID, name: t('tag.default_name', '기본'), color_hex: defaultTagColors?.default },
      { uuid: HOLIDAY_TAG_ID, name: t('tag.holiday_name', '공휴일'), color_hex: defaultTagColors?.holiday },
    ]
    const userTags = Array.from(tags.values()).filter(
      tag => tag.uuid !== DEFAULT_TAG_ID && tag.uuid !== HOLIDAY_TAG_ID
    )
    return [...defaultTags, ...userTags]
  }, [tags, defaultTagColors, t])

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <p className="text-text-secondary text-xs font-medium uppercase tracking-wider">
          {t('main.event_types', '이벤트 종류')}
        </p>
        <button
          onClick={() => navigate('/tags', { state: { background: location } })}
          className="p-1 rounded hover:bg-gray-100 text-[#969696] hover:text-[#646464] transition-colors"
          aria-label={t('tag.manage', '태그 관리')}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        {allTags.map(tag => {
          const hidden = hiddenTagIds.has(tag.uuid)
          const color = tag.color_hex ?? '#9ca3af'

          return (
            <div
              key={tag.uuid}
              className={`flex items-center gap-3 py-2.5 px-3 cursor-pointer rounded-lg bg-[#f3f4f7] hover:brightness-95 transition-[filter] ${hidden ? 'opacity-50' : ''}`}
              onClick={() => toggleTag(tag.uuid)}
            >
              <div
                className="shrink-0 h-5 w-5 rounded-full flex items-center justify-center"
                style={!hidden
                  ? { backgroundColor: color }
                  : { border: `2px solid ${color}`, backgroundColor: 'transparent' }
                }
              >
                {!hidden && (
                  <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="flex-1 text-sm text-[#323232] truncate">{tag.name}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
