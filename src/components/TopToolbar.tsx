import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUiStore } from '../stores/uiStore'
import { buildCalendarGrid } from '../calendar/calendarUtils'
import { useCalendarEventsCache } from '../repositories/caches/calendarEventsCache'
import { useHolidayStore } from '../stores/holidayStore'
import { cn } from '@/lib/utils'
import { SIDEBAR_WIDTH_CLASS } from '../constants/layout'
import TestDataSeederButton from './dev/TestDataSeederButton'

export default function TopToolbar() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const toggleSidebar = useUiStore(s => s.toggleSidebar)
  const goToToday = useUiStore(s => s.goToToday)
  const goToPrevMonth = useUiStore(s => s.goToPrevMonth)
  const goToNextMonth = useUiStore(s => s.goToNextMonth)
  const currentMonth = useUiStore(s => s.currentMonth)
  const sidebarOpen = useUiStore(s => s.sidebarOpen)

  const refreshYears = useCalendarEventsCache(s => s.refreshYears)
  const refreshHolidays = useHolidayStore(s => s.refreshHolidays)
  const loading = useCalendarEventsCache(s => s.loading)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const dateLocale = i18n.language === 'en' ? 'en-US' : 'ko-KR'
  const monthLabel = currentMonth.toLocaleDateString(dateLocale, { month: 'long' })

  function handleRefresh() {
    const today = new Date()
    const days = buildCalendarGrid(year, month, today)
    const years = [...new Set(days.map(d => d.date.getFullYear()))]
    refreshYears(years)
    refreshHolidays(years)
  }

  const iconBtn = 'rounded-full p-2 text-gray-400 hover:text-[#1f1f1f] hover:bg-gray-50 transition-colors'
  const navBtn = 'rounded-full p-2 text-gray-300 hover:text-[#1f1f1f] hover:bg-gray-50 transition-colors'

  return (
    <div className="flex h-16 items-center bg-white border-b border-gray-100 shrink-0">
      {/* 좌측: 햄버거 + 로고 (사이드바 너비와 동기화) */}
      <div
        className={cn(
          'shrink-0 flex items-center overflow-hidden transition-all duration-200',
          sidebarOpen ? SIDEBAR_WIDTH_CLASS : 'w-12'
        )}
      >
        <button
          onClick={toggleSidebar}
          aria-label={t('main.toggle_sidebar', '사이드바 토글')}
          className="shrink-0 rounded-full p-2 mx-2 text-gray-500 hover:text-[#1f1f1f] hover:bg-gray-50 transition-colors"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div
          className={cn(
            'flex items-center gap-2 transition-all duration-200',
            sidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1 pointer-events-none'
          )}
        >
          <img src="/logo-light.png" alt="To-do Calendar" className="h-7 shrink-0" />
          <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#1f1f1f] whitespace-nowrap">
            To-do Calendar
          </span>
        </div>
      </div>

      {/* 중앙: 월 네비 + 오늘 + 우측 액션 */}
      <div className="flex flex-1 items-center gap-3 px-4">
        <div className="flex items-center gap-1">
          <button onClick={goToPrevMonth} aria-label="Previous month" className={navBtn}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* 월 타이틀 — 연도는 캡션, 월은 히어로 */}
          <div className="flex flex-col items-center leading-none min-w-[7rem] py-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#bbb]">
              {year}
            </span>
            <span className="mt-1 text-[18px] font-semibold text-[#1f1f1f] tracking-tight">
              {monthLabel}
            </span>
          </div>

          <button onClick={goToNextMonth} aria-label="Next month" className={navBtn}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <button
          onClick={goToToday}
          aria-label={t('main.today', '오늘')}
          className="rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#1f1f1f] hover:bg-gray-50 transition-colors"
        >
          {t('main.today', '오늘')}
        </button>

        <div className="flex-1" />

        <div className="flex items-center gap-1">
          {import.meta.env.DEV && <TestDataSeederButton />}
          <button
            onClick={handleRefresh}
            disabled={loading}
            aria-label={t('main.refresh', '새로고침')}
            className={cn(iconBtn, 'disabled:opacity-50')}
          >
            <svg className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button onClick={() => navigate('/settings')} aria-label={t('nav.settings', '설정')} className={iconBtn}>
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
