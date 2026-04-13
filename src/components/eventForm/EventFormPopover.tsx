import { useEffect, useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useEventFormStore, canSave } from '../../stores/eventFormStore'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
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

  // 드래그 이동
  const cardRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [initialized, setInitialized] = useState(false)
  const dragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  // 화면 중앙 초기 위치
  useEffect(() => {
    if (!isOpen) {
      setInitialized(false)
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

  // 드래그 핸들러
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // 입력 필드 등에서는 드래그 시작 안 함
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

  // Escape 키
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') closeForm()
  }, [closeForm])

  useEffect(() => {
    if (!isOpen) return
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleKeyDown])

  if (!isOpen || !initialized) return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/20"
        onClick={closeForm}
        data-testid="event-form-backdrop"
      />

      {/* Draggable Card */}
      <div
        ref={cardRef}
        className="fixed z-50 select-none"
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
        onMouseDown={handleMouseDown}
      >
        <Card className="w-[420px] shadow-2xl cursor-move">
          <ScrollArea className="max-h-[70vh]">
            <CardContent className="px-5 pt-5 pb-2 space-y-6">
              <EventFormTopSection />
              <EventFormMiddleSection />
              <EventFormBottomSection />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </CardContent>
          </ScrollArea>
          <CardFooter className="px-5 pb-5 pt-2">
            <Button
              className="w-full"
              disabled={!isSavable || saving}
              onClick={() => save()}
            >
              {t('common.save', '저장')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>,
    document.body,
  )
}
