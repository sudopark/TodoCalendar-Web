import { useEffect, useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { useEventFormStore, canSave } from '../../stores/eventFormStore'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { ConfirmDialog } from '../ConfirmDialog'
import { EventFormTopSection } from './EventFormTopSection'
import { EventFormMiddleSection } from './EventFormMiddleSection'
import { EventFormBottomSection } from './EventFormBottomSection'

export function EventFormPopover() {
  const { t } = useTranslation()
  const isOpen = useEventFormStore(s => s.isOpen)
  const saving = useEventFormStore(s => s.saving)
  const error = useEventFormStore(s => s.error)
  const closeForm = useEventFormStore(s => s.closeForm)
  const save = useEventFormStore(s => s.save)

  const store = useEventFormStore()
  const isSavable = canSave(store)

  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  const cardRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [initialized, setInitialized] = useState(false)
  const dragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!isOpen) {
      setInitialized(false)
      setShowCloseConfirm(false)
      return
    }
    const cardWidth = 420
    const cardHeight = 560
    setPosition({
      x: Math.max(8, (window.innerWidth - cardWidth) / 2),
      y: Math.max(8, (window.innerHeight - cardHeight) / 2),
    })
    setInitialized(true)
  }, [isOpen])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const tag = (e.target as HTMLElement).tagName
    if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'LABEL'].includes(tag)) return
    if ((e.target as HTMLElement).closest('button, input, textarea, select, [role="checkbox"]')) return

    dragging.current = true
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    }
    e.preventDefault()
  }, [position])

  useEffect(() => {
    if (!isOpen) return
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return
      setPosition({
        x: Math.max(0, e.clientX - dragOffset.current.x),
        y: Math.max(0, e.clientY - dragOffset.current.y),
      })
    }
    const handleMouseUp = () => { dragging.current = false }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isOpen])

  const handleCloseRequest = useCallback(() => {
    if (canSave(store)) {
      setShowCloseConfirm(true)
    } else {
      closeForm()
    }
  }, [store, closeForm])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') handleCloseRequest()
  }, [handleCloseRequest])

  useEffect(() => {
    if (!isOpen || showCloseConfirm) return
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, showCloseConfirm, handleKeyDown])

  if (!isOpen || !initialized) return null

  const closeDisabled = saving || showCloseConfirm

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50 bg-black/20"
        data-testid="event-form-backdrop"
      />

      <div
        ref={cardRef}
        className="fixed z-50 select-none"
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
        onMouseDown={handleMouseDown}
      >
        <Card className="w-[420px] shadow-2xl cursor-move flex flex-col max-h-[80vh]">
          <div
            className="flex-1 overflow-y-auto min-h-0 overscroll-contain"
            onWheel={e => e.stopPropagation()}
          >
            <CardContent className="px-5 pt-3 pb-6 space-y-6">
              <div className="flex justify-end">
                <button
                  type="button"
                  aria-label={t('common.close')}
                  data-testid="event-form-close-btn"
                  disabled={closeDisabled}
                  className="p-1.5 rounded text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 disabled:opacity-40"
                  onClick={handleCloseRequest}
                >
                  <X size={18} />
                </button>
              </div>
              <EventFormTopSection />
              <EventFormMiddleSection />
              <EventFormBottomSection />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </CardContent>
          </div>
          <CardFooter className="px-5 py-3 border-t bg-card shrink-0">
            <button
              type="button"
              className="w-full py-2 text-sm font-medium text-brand hover:text-brand-dark disabled:opacity-40 disabled:hover:text-brand"
              disabled={!isSavable || saving}
              onClick={() => save()}
            >
              {t('common.save')}
            </button>
          </CardFooter>
        </Card>

        {showCloseConfirm && (
          <ConfirmDialog
            title={t('eventForm.close_confirm_title')}
            message={t('eventForm.close_confirm_message')}
            confirmLabel={t('common.leave')}
            danger={false}
            onConfirm={() => {
              setShowCloseConfirm(false)
              closeForm()
            }}
            onCancel={() => setShowCloseConfirm(false)}
          />
        )}
      </div>
    </>,
    document.body,
  )
}
