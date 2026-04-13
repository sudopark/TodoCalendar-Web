import { useTranslation } from 'react-i18next'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useEventFormStore } from '../../stores/eventFormStore'

export function EventTypeToggle() {
  const { t } = useTranslation()
  const eventType = useEventFormStore(s => s.eventType)
  const setEventType = useEventFormStore(s => s.setEventType)

  return (
    <ToggleGroup
      value={[eventType]}
      onValueChange={(values) => {
        const next = values[values.length - 1] as 'todo' | 'schedule' | undefined
        if (next) setEventType(next)
      }}
      className="h-7 rounded-md border border-input bg-muted p-0.5 text-xs"
    >
      <ToggleGroupItem
        value="todo"
        size="sm"
        className="h-6 px-3 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm"
      >
        Todo
      </ToggleGroupItem>
      <ToggleGroupItem
        value="schedule"
        size="sm"
        className="h-6 px-3 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm"
      >
        {t('schedule.new', 'Schedule')}
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
