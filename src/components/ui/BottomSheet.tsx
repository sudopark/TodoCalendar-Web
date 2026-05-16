import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

export interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
  /** caller 헤더의 id — 스크린리더가 dialog 의미를 announce 할 때 사용 */
  'aria-labelledby'?: string
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function BottomSheet({ open, onClose, children, className, 'aria-labelledby': ariaLabelledBy }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    // open 시 sheet 내부 첫 focusable로 초점 이동 — focus trap이 의미 있으려면 초점이 sheet 안에 있어야 함
    const initial = sheetRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)
    initial?.[0]?.focus()

    // body scroll lock — 시트 뒤 본문 스크롤이 모달 인지를 깨뜨리는 걸 막음.
    // 기존 inline overflow 값을 보존했다 close 시 복원해서 다른 컴포넌트가 설정한 값을 덮지 않음.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

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
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
    }
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
        aria-labelledby={ariaLabelledBy}
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
