import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIsMobile } from './useIsMobile'
import { useEventFormStore } from '../stores/eventFormStore'

export function useOpenEventForm() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const openForm = useEventFormStore(s => s.openForm)

  return useCallback((rect: DOMRect | null, type: 'todo' | 'schedule') => {
    if (isMobile) {
      navigate(type === 'todo' ? '/todos/new' : '/schedules/new')
      return
    }
    openForm(rect, type)
  }, [isMobile, navigate, openForm])
}
