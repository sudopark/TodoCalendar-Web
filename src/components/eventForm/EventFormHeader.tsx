import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { MoreActionsMenu } from './MoreActionsMenu'

interface EventFormHeaderProps {
  name: string
  onNameChange: (v: string) => void
  onClose: () => void
  onSave: () => void
  onCopy: () => void
  saveDisabled: boolean
  title?: string
}

export function EventFormHeader({
  name,
  onNameChange,
  onClose,
  onSave,
  onCopy,
  saveDisabled,
  title,
}: EventFormHeaderProps) {
  const { t } = useTranslation()

  return (
    <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
      <button
        type="button"
        aria-label={t('common.cancel')}
        onClick={onClose}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        <X size={20} />
      </button>

      <label htmlFor="event-form-name" className="sr-only">{t('event.name')}</label>
      <input
        id="event-form-name"
        aria-label={t('event.name')}
        placeholder={title ?? t('event.namePlaceholder', '이벤트 이름 추가')}
        className="flex-1 min-w-0 border-b border-transparent bg-transparent text-lg text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500 placeholder:text-gray-400"
        value={name}
        onChange={e => onNameChange(e.target.value)}
      />

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saveDisabled}
          className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {t('common.save')}
        </button>
        <MoreActionsMenu onCopy={onCopy} />
      </div>
    </div>
  )
}
