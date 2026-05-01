import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useEventFormStore } from '../stores/eventFormStore'
import { cn } from '@/lib/utils'

export function CreateEventButton() {
  const { t } = useTranslation()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const openForm = useEventFormStore(s => s.openForm)
  const [showMenu, setShowMenu] = useState(false)

  function handleSelect(type: 'todo' | 'schedule') {
    setShowMenu(false)
    const rect = buttonRef.current?.getBoundingClientRect() ?? null
    openForm(rect, type)
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        data-testid="create-event-button"
        aria-label={t('main.create_event', 'Create')}
        aria-haspopup="menu"
        aria-expanded={showMenu}
        className="flex w-full items-center justify-between rounded-full bg-surface border border-line px-4 py-2.5 shadow-sm hover:shadow transition-shadow"
        onClick={() => setShowMenu(!showMenu)}
      >
        <span className="flex items-center gap-2 text-fg">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-sm font-medium">{t('main.create_event', 'Create')}</span>
        </span>
        <svg
          className={cn('h-3.5 w-3.5 text-fg-tertiary transition-transform', showMenu && 'rotate-180')}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div
            role="menu"
            className="absolute bottom-full left-0 mb-1.5 z-50 w-full overflow-hidden rounded-xl bg-surface-elevated border border-line shadow-lg"
          >
            <button
              role="menuitem"
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-fg hover:bg-surface-sunken transition-colors"
              onClick={() => handleSelect('todo')}
            >
              <svg className="h-4 w-4 text-fg-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Todo
            </button>
            <div className="border-t border-line" />
            <button
              role="menuitem"
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-fg hover:bg-surface-sunken transition-colors"
              onClick={() => handleSelect('schedule')}
            >
              <svg className="h-4 w-4 text-fg-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Schedule
            </button>
          </div>
        </>
      )}
    </div>
  )
}
