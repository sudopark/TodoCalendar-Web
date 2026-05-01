import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MoreActionsMenu } from './MoreActionsMenu'

interface EventFormHeaderProps {
  name: string
  onNameChange: (v: string) => void
  onClose: () => void
  onSave: () => void
  onCopy: () => void
  onDelete?: () => void
  saveDisabled: boolean
  isDirty?: boolean
  idPrefix: 'schedule' | 'todo'
}

export function EventFormHeader({
  name,
  onNameChange,
  onClose,
  onSave,
  onCopy,
  onDelete,
  saveDisabled,
  isDirty = false,
  idPrefix,
}: EventFormHeaderProps) {
  const { t } = useTranslation()
  const nameInputId = `${idPrefix}-event-name`

  return (
    <div className="sticky top-0 z-10 flex items-center gap-4 border-b border-line bg-background px-4 py-4">
      <button
        type="button"
        aria-label={t('common.cancel')}
        onClick={onClose}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-fg-secondary hover:text-fg hover:bg-surface-sunken transition-colors"
      >
        <X size={20} />
      </button>

      <label htmlFor={nameInputId} className="sr-only">{t('event.name')}</label>
      <div className="relative flex-1 min-w-0">
        <input
          id={nameInputId}
          aria-label={t('event.name')}
          placeholder={t('event.namePlaceholder', '이벤트 이름 추가')}
          className="w-full border-b border-transparent bg-transparent pr-6 text-2xl font-normal tracking-tight text-fg outline-none focus:border-fg placeholder:text-fg-tertiary transition-colors"
          value={name}
          onChange={e => onNameChange(e.target.value)}
        />
        {isDirty && (
          <span
            aria-label={t('eventForm.unsaved_changes', '저장되지 않은 변경사항이 있어요')}
            title={t('eventForm.unsaved_changes', '저장되지 않은 변경사항이 있어요')}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-brand"
          />
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          onClick={onSave}
          disabled={saveDisabled}
          className="rounded-full px-6 h-9 font-semibold"
        >
          {t('common.save')}
        </Button>
        <MoreActionsMenu onCopy={onCopy} onDelete={onDelete} />
      </div>
    </div>
  )
}
