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
        className="flex items-center gap-2 rounded-[5px] bg-[#f3f4f7] px-2 w-full hover:brightness-95 transition-colors"
        style={{ height: 50 }}
        onClick={() => setShowPopup(true)}
      >
        {/* + 아이콘 */}
        <div className="shrink-0 flex items-center justify-center" style={{ width: 52 }}>
          <svg className="h-5 w-5 text-[#969696]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>

        <span className="text-sm text-[#969696]">
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
