import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

export interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function BottomSheet({ open, onClose, children, className }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !sheetRef.current) return
      const focusables = Array.from(sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey && active === first) { last.focus(); e.preventDefault() }
      else if (!e.shiftKey && active === last) { first.focus(); e.preventDefault() }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <>
      <div
        data-testid="bottom-sheet-backdrop"
        className="fixed inset-0 z-40 bg-black/40 animate-in fade-in-0 duration-150"
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-surface-elevated shadow-2xl pb-[env(safe-area-inset-bottom)] animate-in slide-in-from-bottom duration-200',
          className,
        )}
      >
        <div className="flex justify-center pt-2 pb-1">
          <div aria-hidden className="h-1 w-9 rounded-full bg-fg-quaternary/40" />
        </div>
        {children}
      </div>
    </>,
    document.body,
  )
}
