import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useEventFormStore } from '../stores/eventFormStore'

export function CreateEventButton() {
  const { t } = useTranslation()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const openForm = useEventFormStore(s => s.openForm)

  function handleClick() {
    const rect = buttonRef.current?.getBoundingClientRect() ?? null
    openForm(rect)
  }

  return (
    <button
      ref={buttonRef}
      data-testid="create-event-button"
      aria-label="새 이벤트"
      className="flex items-center justify-center gap-2 rounded-[5px] bg-[#303646] px-3 py-2.5 w-full hover:brightness-110 transition-colors"
      onClick={handleClick}
    >
      <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      <span className="text-sm text-white font-medium">
        {t('main.create_event', 'Create')}
      </span>
    </button>
  )
}
