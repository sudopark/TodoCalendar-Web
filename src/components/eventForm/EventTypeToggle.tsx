import { useTranslation } from 'react-i18next'
import { useEventFormStore } from '../../stores/eventFormStore'

export function EventTypeToggle() {
  const { t } = useTranslation()
  const eventType = useEventFormStore(s => s.eventType)
  const setEventType = useEventFormStore(s => s.setEventType)

  return (
    <div className="inline-flex rounded-lg bg-muted p-1 text-sm">
      <button
        type="button"
        className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
          eventType === 'todo'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        onClick={() => setEventType('todo')}
      >
        Todo
      </button>
      <button
        type="button"
        className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
          eventType === 'schedule'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        onClick={() => setEventType('schedule')}
      >
        {t('schedule.title', 'Schedule')}
      </button>
    </div>
  )
}
