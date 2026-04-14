import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useEventFormStore } from '../stores/eventFormStore'

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
        aria-label="새 이벤트"
        className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white border border-gray-200 px-4 py-2.5 w-full shadow-sm hover:shadow transition-shadow"
        onClick={() => setShowMenu(!showMenu)}
      >
        <svg className="h-4 w-4 text-[#323232]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className="text-sm font-medium text-[#323232]">
          {t('main.create_event', 'Create')}
        </span>
        <svg className="h-3 w-3 text-[#969696] ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute bottom-full left-0 mb-1 z-50 w-full overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-xl">
            <button
              className="flex w-full px-4 py-3 text-left text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
              onClick={() => handleSelect('todo')}
            >
              Todo
            </button>
            <div className="border-t border-gray-100 dark:border-gray-700" />
            <button
              className="flex w-full px-4 py-3 text-left text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
              onClick={() => handleSelect('schedule')}
            >
              Schedule
            </button>
          </div>
        </>
      )}
    </div>
  )
}
