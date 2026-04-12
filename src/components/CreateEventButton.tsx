import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { TypeSelectorPopup } from './TypeSelectorPopup'

export function CreateEventButton() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPopup, setShowPopup] = useState(false)

  function handleSelect(type: 'todo' | 'schedule') {
    setShowPopup(false)
    const path = type === 'todo' ? '/todos/new' : '/schedules/new'
    navigate(path, { state: { background: location } })
  }

  return (
    <>
      <button
        className="flex items-center justify-center gap-2 rounded-[5px] bg-[#303646] px-3 py-2.5 w-full hover:brightness-110 transition-colors"
        onClick={() => setShowPopup(true)}
      >
        {/* + 아이콘 */}
        <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>

        <span className="text-sm text-white font-medium">
          {t('main.create_event', 'Create')}
        </span>
      </button>
      {showPopup && (
        <TypeSelectorPopup
          onSelect={handleSelect}
          onClose={() => setShowPopup(false)}
        />
      )}
    </>
  )
}
