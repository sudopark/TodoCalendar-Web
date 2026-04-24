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
      <div className="flex items-center justify-between mb-2">
        <p className="text-text-secondary text-[10px] font-semibold uppercase tracking-[0.08em]">
          {t('main.event_types', '이벤트 종류')}
        </p>
        <button
          onClick={() => navigate('/tags', { state: { background: location } })}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-text-tertiary hover:text-text-secondary hover:bg-surface-sunken transition-colors"
          aria-label={t('tag.manage', '태그 관리')}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-[11px] font-medium">{t('tag.manage', '관리')}</span>
        </button>
      </div>

      <div className="flex flex-col">
        {allTags.map(tag => {
          const hidden = hiddenTagIds.has(tag.uuid)
          const color = tag.color_hex ?? '#9ca3af'

          return (
            <button
              key={tag.uuid}
              type="button"
              onClick={() => toggleTag(tag.uuid)}
              title={tag.name}
              aria-pressed={!hidden}
              className="group flex items-center gap-2.5 py-1.5 px-2 -mx-2 cursor-pointer rounded-md hover:bg-surface-sunken transition-colors text-left"
            >
              <span
                className="shrink-0 h-4 w-4 rounded-full flex items-center justify-center transition-colors"
                style={!hidden
                  ? { backgroundColor: color }
                  : { boxShadow: `inset 0 0 0 1.5px ${color}`, backgroundColor: 'transparent' }
                }
              >
                {!hidden && (
                  <svg className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span className={`flex-1 text-sm truncate ${hidden ? 'text-text-tertiary' : 'text-text-primary'}`}>
                {tag.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
