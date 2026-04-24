import { useEffect, useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { GripHorizontal, Loader2, X } from 'lucide-react'
import { useEventFormStore, canSave } from '../../stores/eventFormStore'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '../ConfirmDialog'
import { EventFormTopSection } from './EventFormTopSection'
import { EventFormMiddleSection } from './EventFormMiddleSection'
import { EventFormBottomSection } from './EventFormBottomSection'
import { cn } from '@/lib/utils'

const TITLE_ID = 'event-form-title'

function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter(el => !el.hasAttribute('data-focus-skip'))
}

export function EventFormPopover() {
  const { t } = useTranslation()
  const isOpen = useEventFormStore(s => s.isOpen)
  const saving = useEventFormStore(s => s.saving)
  const error = useEventFormStore(s => s.error)
  const closeForm = useEventFormStore(s => s.closeForm)
  const save = useEventFormStore(s => s.save)

  const isSavable = useEventFormStore(canSave)

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
    const cardWidth = Math.min(440, window.innerWidth - 32)
    const cardHeight = 560
    setPosition({
      x: Math.max(16, (window.innerWidth - cardWidth) / 2),
      y: Math.max(16, (window.innerHeight - cardHeight) / 2),
    })
    setInitialized(true)
  }, [isOpen])

  const handleDragMouseDown = useCallback((e: React.MouseEvent) => {
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
    if (isSavable) {
      setShowCloseConfirm(true)
    } else {
      closeForm()
    }
  }, [isSavable, closeForm])

  // Esc 닫기 + Focus trap (Tab / Shift+Tab 순환)
  useEffect(() => {
    if (!isOpen || showCloseConfirm) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseRequest()
        return
      }
      if (e.key !== 'Tab' || !cardRef.current) return
      const focusables = getFocusable(cardRef.current)
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey && active === first) {
        last.focus()
        e.preventDefault()
      } else if (!e.shiftKey && active === last) {
        first.focus()
        e.preventDefault()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, showCloseConfirm, handleCloseRequest])

  if (!isOpen || !initialized) return null

  const closeDisabled = saving || showCloseConfirm

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] animate-in fade-in-0 duration-150"
        data-testid="event-form-backdrop"
      />

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        className="fixed z-50 select-none animate-in fade-in-0 zoom-in-95 duration-200"
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
      >
        <Card className="w-[min(440px,calc(100vw-32px))] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
          {/* Header: drag handle + title + close */}
          <div
            onMouseDown={handleDragMouseDown}
            className="shrink-0 flex items-center gap-2 px-5 py-3 border-b border-border-light bg-surface-sunken/60 cursor-move"
          >
            <GripHorizontal
              className="h-4 w-4 text-text-tertiary shrink-0"
              aria-label={t('eventForm.drag_handle', '드래그하여 이동')}
              data-focus-skip
            />
            <h2 id={TITLE_ID} className="flex-1 text-sm font-semibold text-text-primary select-none">
              {t('eventForm.title_new', '새 이벤트 추가')}
            </h2>
            <button
              type="button"
              aria-label={t('common.close')}
              data-testid="event-form-close-btn"
              disabled={closeDisabled}
              className="shrink-0 p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-surface-sunken disabled:opacity-40 transition-colors"
              onClick={handleCloseRequest}
            >
              <X size={16} />
            </button>
          </div>

          <div
            className="flex-1 overflow-y-auto min-h-0 overscroll-contain"
            onWheel={e => e.stopPropagation()}
          >
            <CardContent className="px-5 py-5 space-y-6">
              <EventFormTopSection />
              <EventFormMiddleSection />
              <EventFormBottomSection />
            </CardContent>
          </div>

          <CardFooter className="px-5 py-3 border-t border-border-light bg-card shrink-0 flex-col items-stretch gap-2">
            {error && (
              <p className="text-xs text-destructive text-center" role="alert">
                {error}
              </p>
            )}
            <Button
              type="button"
              size="lg"
              className={cn('w-full h-10 rounded-full font-semibold')}
              disabled={!isSavable || saving}
              onClick={() => save()}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('eventForm.saving', '저장 중…')}
                </>
              ) : (
                t('common.save')
              )}
            </Button>
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
