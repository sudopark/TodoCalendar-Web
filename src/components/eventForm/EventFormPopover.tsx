import { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useEventFormStore, canSave } from '../../stores/eventFormStore'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { EventFormTopSection } from './EventFormTopSection'
import { EventFormMiddleSection } from './EventFormMiddleSection'
import { EventFormBottomSection } from './EventFormBottomSection'

function calculatePosition(anchorRect: DOMRect | null): React.CSSProperties {
  if (!anchorRect) {
    return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  }

  const cardWidth = 420
  const cardHeight = 560

  let top = anchorRect.bottom + 8
  if (top + cardHeight > window.innerHeight) {
    top = Math.max(8, anchorRect.top - cardHeight - 8)
  }

  let left = anchorRect.left
  if (left + cardWidth > window.innerWidth) {
    left = window.innerWidth - cardWidth - 8
  }
  left = Math.max(8, left)

  return { top: `${top}px`, left: `${left}px` }
}

export function EventFormPopover() {
  const { t } = useTranslation()
  const isOpen = useEventFormStore(s => s.isOpen)
  const anchorRect = useEventFormStore(s => s.anchorRect)
  const saving = useEventFormStore(s => s.saving)
  const error = useEventFormStore(s => s.error)
  const closeForm = useEventFormStore(s => s.closeForm)
  const save = useEventFormStore(s => s.save)

  const store = useEventFormStore()
  const isSavable = canSave(store)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') closeForm()
  }, [closeForm])

  useEffect(() => {
    if (!isOpen) return
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  const positionStyle = calculatePosition(anchorRect)

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/20"
        onClick={closeForm}
        data-testid="event-form-backdrop"
      />

      {/* Positioned Card */}
      <div className="fixed z-50" style={positionStyle}>
        <Card className="w-[420px] shadow-xl">
          <ScrollArea className="max-h-[80vh]">
            <CardContent className="p-4 space-y-4">
              <EventFormTopSection />
              <Separator />
              <EventFormMiddleSection />
              <Separator />
              <EventFormBottomSection />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </CardContent>
          </ScrollArea>
          <CardFooter className="px-4 pb-4 pt-0">
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
