import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { SIDEBAR_WIDTH_CLASS } from '../constants/layout'
import TestDataSeederButton from './dev/TestDataSeederButton'

export interface TopToolbarProps {
  currentMonth: Date
  sidebarOpen: boolean
  loading: boolean
  onToggleSidebar: () => void
  onGoToToday: () => void
  onGoToPrevMonth: () => void
  onGoToNextMonth: () => void
  onRefresh: () => void
}

export default function TopToolbar({
  currentMonth,
  sidebarOpen,
  loading,
  onToggleSidebar,
  onGoToToday,
  onGoToPrevMonth,
  onGoToNextMonth,
  onRefresh,
}: TopToolbarProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const year = currentMonth.getFullYear()
  const dateLocale = i18n.language === 'en' ? 'en-US' : 'ko-KR'
  const monthLabel = currentMonth.toLocaleDateString(dateLocale, { month: 'long' })

  const iconBtn = 'rounded-full p-2 text-fg-quaternary hover:text-fg hover:bg-surface-elevated transition-colors'
  const navBtn = 'rounded-full p-2 text-fg-quaternary hover:text-fg hover:bg-surface-elevated transition-colors'

  return (
    <div className="relative flex h-16 items-center bg-surface border-b border-line shrink-0">
      {/* #110 이벤트 조회 인디케이터 — toolbar 하단 경계선 위에 얇은 progress bar.
          비차단 (pointer-events-none) 으로 다른 버튼/캘린더 인터랙션 보호. */}
      {loading && (
        <div
          role="progressbar"
          aria-busy="true"
          aria-label={t('main.events_loading', '이벤트 조회중')}
          className="pointer-events-none absolute left-0 right-0 bottom-0 h-0.5 overflow-hidden bg-brand/10"
        >
          <div className="h-full w-1/3 bg-brand animate-events-loading-bar" />
        </div>
      )}
      {/* 좌측: 햄버거 + 로고 (사이드바 너비와 동기화) */}
      <div
        className={cn(
          'shrink-0 flex items-center overflow-hidden transition-all duration-200',
          sidebarOpen ? SIDEBAR_WIDTH_CLASS : 'w-12'
        )}
      >
        <button
          onClick={onToggleSidebar}
          aria-label={t('main.toggle_sidebar', '사이드바 토글')}
          className="shrink-0 rounded-full p-2 mx-2 text-fg-tertiary hover:text-fg hover:bg-surface-elevated transition-colors"
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
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-fg whitespace-nowrap">
            To-do Calendar
          </span>
        </div>
      </div>

      {/* 중앙: 월 네비 + 오늘 + 우측 액션 */}
      <div className="flex flex-1 items-center gap-3 px-4">
        <div className="flex items-center gap-1">
          <button onClick={onGoToPrevMonth} aria-label="Previous month" className={navBtn}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* 월 타이틀 — 연도는 캡션, 월은 히어로 */}
          <div data-testid="toolbar-month-title" className="flex flex-col items-center leading-none min-w-[7rem] py-1">
            <span data-testid="toolbar-year" className="text-meta font-semibold uppercase tracking-[0.25em] text-fg-quaternary">
              {year}
            </span>
            <span data-testid="toolbar-month" className="mt-1 text-lg font-semibold text-fg tracking-tight">
              {monthLabel}
            </span>
          </div>

          <button onClick={onGoToNextMonth} aria-label="Next month" className={navBtn}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <button
          onClick={onGoToToday}
          aria-label={t('main.today', '오늘')}
          className="rounded-full px-3 py-1.5 text-section-label font-semibold uppercase tracking-[0.15em] text-fg hover:bg-surface-elevated transition-colors"
        >
          {t('main.today', '오늘')}
        </button>

        <div className="flex-1" />

        <div className="flex items-center gap-1">
          {import.meta.env.DEV && <TestDataSeederButton />}
          <button
            onClick={onRefresh}
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
