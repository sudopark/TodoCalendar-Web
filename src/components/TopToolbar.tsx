import { useTranslation } from 'react-i18next'
import { useUiStore } from '../stores/uiStore'
import { formatMonthTitle } from '../calendar/calendarUtils'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SIDEBAR_WIDTH_CLASS } from '../constants/layout'

export default function TopToolbar() {
  const { t } = useTranslation()

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
    <div className="flex h-16 items-center border-b border-border-light bg-white shrink-0">
      {/* 햄버거 버튼: 사이드바 열림 여부와 관계없이 항상 표시 */}
      <button
        onClick={toggleSidebar}
        aria-label={t('main.toggle_sidebar', '사이드바 토글')}
        className="shrink-0 rounded-full p-2 mx-2 hover:bg-gray-100 text-gray-700"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* 로고 영역: LeftSidebar 너비와 동기화 (햄버거 버튼 너비만큼 제외) */}
      <div
        className={cn(
          'shrink-0 overflow-hidden transition-all duration-200',
          sidebarOpen ? `${SIDEBAR_WIDTH_CLASS} px-2` : 'w-0'
        )}
      >
        <img
          src="/logo-light.png"
          alt="To-do Calendar"
          className="h-8"
        />
      </div>

      {/* 중앙+우측 영역: 캘린더 시작점에 맞춤 */}
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
      </div>
    </div>
  )
}
