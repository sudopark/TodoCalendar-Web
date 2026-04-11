import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUiStore } from '../stores/uiStore'
import { formatMonthTitle } from '../calendar/calendarUtils'

export default function TopToolbar() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const toggleSidebar = useUiStore(s => s.toggleSidebar)
  const goToToday = useUiStore(s => s.goToToday)
  const goToPrevMonth = useUiStore(s => s.goToPrevMonth)
  const goToNextMonth = useUiStore(s => s.goToNextMonth)
  const currentMonth = useUiStore(s => s.currentMonth)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const title = formatMonthTitle(year, month)

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b bg-white dark:bg-gray-800">
      <div className="flex items-center gap-2">
        <button
          onClick={toggleSidebar}
          aria-label={t('main.toggle_sidebar', '사이드바 토글')}
          className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <button
          onClick={goToToday}
          aria-label={t('main.today', '오늘')}
          className="rounded px-2.5 py-1 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600"
        >
          {t('main.today', '오늘')}
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={goToPrevMonth}
            aria-label="Previous month"
            className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300"
          >
            ‹
          </button>
          <span className="text-sm font-semibold dark:text-gray-100 min-w-[9rem] text-center">
            {title}
          </span>
          <button
            onClick={goToNextMonth}
            aria-label="Next month"
            className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300"
          >
            ›
          </button>
        </div>
      </div>

      <div className="flex items-center">
        <button
          onClick={() => navigate('/settings')}
          aria-label={t('nav.settings', '설정')}
          className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
