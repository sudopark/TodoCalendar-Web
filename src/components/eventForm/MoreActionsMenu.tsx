import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { MoreHorizontal, Copy, Trash2 } from 'lucide-react'

interface MoreActionsMenuProps {
  onCopy: () => void
  onDelete?: () => void
}

export function MoreActionsMenu({ onCopy, onDelete }: MoreActionsMenuProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={t('eventForm.more_actions')}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full text-fg-secondary hover:text-fg hover:bg-surface-sunken transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 z-50 mt-1.5 min-w-[10rem] overflow-hidden rounded-xl border border-line bg-background shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-fg hover:bg-surface-sunken transition-colors"
              onClick={() => { setOpen(false); onCopy() }}
            >
              <Copy className="h-4 w-4 text-fg-secondary" />
              {t('eventForm.copy')}
            </button>
            {onDelete && (
              <>
                <div className="border-t border-line" />
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                  onClick={() => { setOpen(false); onDelete() }}
                >
                  <Trash2 className="h-4 w-4" />
                  {t('common.delete')}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
