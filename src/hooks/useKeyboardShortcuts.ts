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
          // 'n' 단축키는 데스크톱 power user용 — 모바일은 useOpenEventForm으로 라우트 분기되지만
          // 키보드 단축키 자체가 모바일 viewport에서 사실상 트리거되지 않으므로 분기 없이 store 직접 호출.
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
