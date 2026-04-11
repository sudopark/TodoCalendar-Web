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
    <div className="flex h-16 items-center justify-between px-6 border-b border-border-light bg-white dark:bg-gray-800 dark:border-gray-700 shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          aria-label={t('main.toggle_sidebar', '사이드바 토글')}
          className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <span className="text-2xl font-extrabold text-brand dark:text-blue-400">
          To-do Calendar
        </span>

        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={goToPrevMonth}
            aria-label="Previous month"
            className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-lg font-bold text-text-primary dark:text-gray-100 min-w-[9rem] text-center">
            {title}
          </span>
          <button
            onClick={goToNextMonth}
            aria-label="Next month"
            className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <button
          onClick={goToToday}
          aria-label={t('main.today', '오늘')}
          className="relative pb-0.5 text-sm font-bold text-brand dark:text-blue-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-brand dark:after:bg-blue-400"
        >
          {t('main.today', '오늘')}
        </button>
      </div>

      <div className="flex items-center">
        <button
          onClick={() => navigate('/settings')}
          aria-label={t('nav.settings', '설정')}
          className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
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
