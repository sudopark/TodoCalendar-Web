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
        className="flex items-center justify-center gap-2 rounded-[5px] bg-[#303646] px-3 py-2.5 w-full hover:brightness-110 transition-colors"
        onClick={() => setShowMenu(!showMenu)}
      >
        <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className="text-sm text-white font-medium">
          {t('main.create_event', 'Create')}
        </span>
      </button>
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute top-full left-0 mt-1 z-50 w-full overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-xl">
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
