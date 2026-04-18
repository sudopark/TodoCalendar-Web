import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { MoreHorizontal } from 'lucide-react'

interface MoreActionsMenuProps {
  onCopy: () => void
}

export function MoreActionsMenu({ onCopy }: MoreActionsMenuProps) {
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

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={t('eventForm.more_actions')}
        className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400"
        onClick={() => setOpen(v => !v)}
      >
        <MoreHorizontal size={20} />
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
        </div>
      )}
    </div>
  )
}
