import { useTranslation } from 'react-i18next'
import { useEventFormStore } from '../../stores/eventFormStore'
import { Flag } from 'lucide-react'

export function EventTypeToggle() {
  const { t } = useTranslation()
  const eventType = useEventFormStore(s => s.eventType)
  const setEventType = useEventFormStore(s => s.setEventType)

  const isTodo = eventType === 'todo'

  return (
    <div className="flex items-center gap-3">
      <Flag className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="text-sm">
        {t('eventType.is_todo', 'Todo')}
      </span>
      <button
        type="button"
        className="ml-1 rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors"
        onClick={() => setEventType(isTodo ? 'schedule' : 'todo')}
      >
        {isTodo ? t('common.yes', '예') : t('common.no', '아니오')}
      </button>
    </div>
  )
}
