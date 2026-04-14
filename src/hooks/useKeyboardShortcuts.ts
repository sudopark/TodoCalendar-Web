import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useEventFormStore } from '../stores/eventFormStore'

export function useKeyboardShortcuts() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Ignore when focus is in input fields
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return
      if (target.isContentEditable) return
      if (target.closest('[role="dialog"]') || target.closest('.fixed')) return

      switch (e.key) {
        case 'n': {
          // New event (Todo by default) — open popover instead of navigating
          const formStore = useEventFormStore.getState()
          if (formStore.isOpen) return  // 이미 폼 열림
          formStore.openForm(null, 'todo')
          break
        }
        case 'Escape':
          // Close overlay/modal
          if (location.state?.background) navigate(-1)
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate, location])
}
