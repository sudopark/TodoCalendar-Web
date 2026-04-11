import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import { useEventTagStore } from '../stores/eventTagStore'
import { useTagFilterStore } from '../stores/tagFilterStore'

export default function CalendarList() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  const tags = useEventTagStore(s => s.tags)
  const isTagHidden = useTagFilterStore(s => s.isTagHidden)
  const toggleTag = useTagFilterStore(s => s.toggleTag)

  const handleTagManagement = () => {
    navigate('/tags', { state: { background: location } })
  }

  return (
    <div className="flex flex-col">
      <p className="px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
        {t('main.calendar_list', '내 캘린더')}
      </p>

      <div className="flex flex-col">
        {Array.from(tags.values()).map(tag => {
          const hidden = isTagHidden(tag.uuid)
          const dotColor = hidden ? '#d1d5db' : (tag.color_hex ?? '#9ca3af')

          return (
            <div
              key={tag.uuid}
              className={`flex items-center justify-between px-3 py-2 text-sm transition-opacity ${hidden ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: dotColor }}
                />
                <span className="dark:text-gray-200 truncate">{tag.name}</span>
              </div>

              <button
                onClick={() => toggleTag(tag.uuid)}
                aria-label={hidden ? `${tag.name} 표시` : `${tag.name} 숨기기`}
                className="ml-2 rounded p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 flex-shrink-0"
              >
                {hidden ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
          )
        })}
      </div>

      <div className="px-3 py-2 mt-1">
        <button
          onClick={handleTagManagement}
          className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
        >
          {t('tag.manage', '태그 관리')} &gt;
        </button>
      </div>
    </div>
  )
}
