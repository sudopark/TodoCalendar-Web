import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

export interface DrawerProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Drawer({ open, onClose, children, className }: DrawerProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    // open 시 drawer 내부 첫 focusable로 초점 이동 — focus trap이 의미 있으려면 초점이 안에 있어야 함
    const initial = ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE)
    initial?.[0]?.focus()

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !ref.current) return
      const focusables = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE))
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
        data-testid="drawer-backdrop"
        className="fixed inset-0 z-40 bg-black/35 animate-in fade-in-0 duration-150"
        onClick={onClose}
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-surface-elevated shadow-2xl animate-in slide-in-from-left duration-200',
          className,
        )}
      >
        {children}
      </div>
    </>,
    document.body,
  )
}
