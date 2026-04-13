import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { EventTypeToggle } from './EventTypeToggle'
import { EventTimePickerShadcn } from './EventTimePickerShadcn'
import { DDayBadge } from './DDayBadge'
import { RepeatingPickerShadcn } from './RepeatingPickerShadcn'
import { useEventFormStore } from '../../stores/eventFormStore'
import { useEventTagStore } from '../../stores/eventTagStore'

export function EventFormTopSection() {
  const { t } = useTranslation()
  const name = useEventFormStore(s => s.name)
  const setName = useEventFormStore(s => s.setName)
  const eventTagId = useEventFormStore(s => s.eventTagId)

  const tagColor = eventTagId
    ? (useEventTagStore.getState().getColorForTagId(eventTagId) ?? '#4A90D9')
    : '#4A90D9'

  return (
    <div className="space-y-3">
      {/* Name input with tag color bar */}
      <div className="flex items-center gap-2">
        <div
          className="w-1 self-stretch rounded-full shrink-0"
          style={{ backgroundColor: tagColor }}
        />
        <Input
          placeholder={t('event.name', '이름')}
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />
      </div>

      {/* Event type toggle */}
      <EventTypeToggle />

      {/* Time picker */}
      <EventTimePickerShadcn />

      {/* D-Day badge */}
      <DDayBadge />

      {/* Repeating picker */}
      <RepeatingPickerShadcn />
    </div>
  )
}
