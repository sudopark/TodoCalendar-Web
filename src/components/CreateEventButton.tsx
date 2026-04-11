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
        className="mx-3 mb-3 rounded-lg bg-blue-600 py-3 text-center text-white font-medium hover:bg-blue-700 w-[calc(100%-1.5rem)]"
        onClick={() => setShowPopup(true)}
      >
        {t('main.create_event', '새 이벤트')}
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
