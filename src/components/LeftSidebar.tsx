import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUiStore } from '../stores/uiStore'
import MiniCalendar from '../calendar/MiniCalendar'
import CalendarList from './CalendarList'

export default function LeftSidebar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const sidebarOpen = useUiStore(s => s.sidebarOpen)

  return (
    <div
      className={`hidden md:flex flex-col transition-all duration-200 bg-sidebar-bg dark:bg-gray-900 overflow-hidden shrink-0 ${
        sidebarOpen ? 'w-64' : 'w-0'
      }`}
    >
      <div className="flex-1 overflow-y-auto py-3 px-3 flex flex-col gap-3">
        <MiniCalendar />
        <CalendarList />
      </div>
      <div className="shrink-0 border-t border-white/10 px-3 py-3 flex flex-col gap-1">
        <button
          onClick={() => navigate('/done-todos', { state: { background: location } })}
          className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-sidebar-text-dim hover:text-sidebar-text hover:bg-white/10 dark:hover:bg-white/5 text-left"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12" />
          </svg>
          {t('nav.archive', 'Archive')}
        </button>
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-sidebar-text-dim hover:text-sidebar-text hover:bg-white/10 dark:hover:bg-white/5 text-left"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {t('nav.settings', 'Settings')}
        </button>
      </div>
    </div>
  )
}
