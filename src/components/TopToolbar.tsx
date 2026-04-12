import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUiStore } from '../stores/uiStore'
import { formatMonthTitle } from '../calendar/calendarUtils'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SIDEBAR_WIDTH_CLASS } from '../constants/layout'

export default function TopToolbar() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const toggleSidebar = useUiStore(s => s.toggleSidebar)
  const goToToday = useUiStore(s => s.goToToday)
  const goToPrevMonth = useUiStore(s => s.goToPrevMonth)
  const goToNextMonth = useUiStore(s => s.goToNextMonth)
  const currentMonth = useUiStore(s => s.currentMonth)
  const sidebarOpen = useUiStore(s => s.sidebarOpen)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const title = formatMonthTitle(year, month)

  return (
    <div className="flex h-16 items-center bg-slate-50 shrink-0">
      {/* 좌측 영역: 사이드바 너비와 동기화 (햄버거 + 로고) */}
      <div
        className={cn(
          'shrink-0 flex items-center overflow-hidden transition-all duration-200',
          sidebarOpen ? SIDEBAR_WIDTH_CLASS : 'w-12'
        )}
      >
        <button
          onClick={toggleSidebar}
          aria-label={t('main.toggle_sidebar', '사이드바 토글')}
          className="shrink-0 rounded-full p-2 mx-2 hover:bg-gray-100 text-gray-700"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {sidebarOpen && (
          <div className="flex items-center gap-1">
            <img
              src="/logo-light.png"
              alt="To-do Calendar"
              className="h-8"
            />
            <span className="text-lg font-bold text-text-primary whitespace-nowrap">To-do Calendar</span>
          </div>
        )}
      </div>

      {/* 중앙 영역: 캘린더 좌측 끝과 정렬 */}
      <div className="flex flex-1 items-center gap-4 px-4">
        <div className="flex items-center gap-1">
          <button
            onClick={goToPrevMonth}
            aria-label="Previous month"
            className="rounded-full p-2 hover:bg-gray-100 text-gray-600"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-lg font-bold text-text-primary min-w-[9rem] text-center">
            {title}
          </span>
          <button
            onClick={goToNextMonth}
            aria-label="Next month"
            className="rounded-full p-2 hover:bg-gray-100 text-gray-600"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={goToToday}
          aria-label={t('main.today', '오늘')}
        >
          {t('main.today', '오늘')}
        </Button>

        <div className="flex-1" />

        {/* 우측: Archive + Settings */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate('/done')}
            aria-label="Archive"
            className="rounded-full p-2 hover:bg-gray-100 text-gray-500"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12" />
            </svg>
          </button>
          <button
            onClick={() => navigate('/settings')}
            aria-label={t('nav.settings', '설정')}
            className="rounded-full p-2 hover:bg-gray-100 text-gray-500"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
