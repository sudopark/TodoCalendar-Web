import { useTranslation } from 'react-i18next'

export type RepeatScope = 'this' | 'future' | 'all'

interface RepeatingScopeDialogProps {
  mode: 'edit' | 'delete' | 'complete'
  eventType?: 'todo' | 'schedule'
  onSelect: (scope: RepeatScope) => void
  onCancel: () => void
}

export function RepeatingScopeDialog({ mode, eventType = 'schedule', onSelect, onCancel }: RepeatingScopeDialogProps) {
  const { t } = useTranslation()

  function dialogTitle(): string {
    if (eventType === 'todo') {
      switch (mode) {
        case 'edit': return t('repeatingScope.todo_edit')
        case 'delete': return t('repeatingScope.todo_delete')
        case 'complete': return t('repeatingScope.todo_complete')
      }
    }
    return mode === 'delete' ? t('repeatingScope.schedule_delete') : t('repeatingScope.schedule_edit')
  }

  return (
    <div data-testid="repeating-scope-dialog" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-xl bg-surface-elevated p-6 shadow-xl">
        <h2 className="text-base font-semibold text-fg">
          {dialogTitle()}
        </h2>
        <div className="mt-4 flex flex-col divide-y divide-line">
          <button
            className="px-4 py-3 text-left text-sm text-fg hover:bg-surface-sunken"
            onClick={() => onSelect('this')}
          >
            {t('repeat.this_only')}
          </button>
          <button
            className="px-4 py-3 text-left text-sm text-fg hover:bg-surface-sunken"
            onClick={() => onSelect('future')}
          >
            {t('repeat.future')}
          </button>
          <button
            className="px-4 py-3 text-left text-sm text-fg hover:bg-surface-sunken"
            onClick={() => onSelect('all')}
          >
            {t('repeat.all')}
          </button>
        </div>
        <button
          className="mt-4 w-full rounded-lg px-4 py-2 text-sm text-fg-tertiary hover:bg-surface-sunken"
          onClick={onCancel}
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  )
}
