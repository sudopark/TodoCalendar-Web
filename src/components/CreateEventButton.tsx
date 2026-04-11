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
      <div className="flex justify-center px-4 pb-4">
        <button
          className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand dark:text-blue-400 shadow-lg hover:shadow-xl hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 transition-shadow"
          onClick={() => setShowPopup(true)}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          {t('main.create_event', 'Create')}
        </button>
      </div>
      {showPopup && (
        <TypeSelectorPopup
          onSelect={handleSelect}
          onClose={() => setShowPopup(false)}
        />
      )}
    </>
  )
}
