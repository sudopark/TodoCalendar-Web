import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'

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
        className="flex items-center gap-1 rounded px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
        onClick={() => setOpen(v => !v)}
      >
        {t('eventForm.more_actions')}
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-1 min-w-[8rem] rounded-md border border-gray-200 bg-white shadow-md dark:bg-gray-800 dark:border-gray-700"
        >
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
            onClick={() => { setOpen(false); onCopy() }}
          >
            {t('eventForm.copy')}
          </button>
          {onDelete && (
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
              onClick={() => { setOpen(false); onDelete() }}
            >
              {t('common.delete')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
