import { useTranslation } from 'react-i18next'
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
    <div className="space-y-4">
      {/* Name input with tag color bar */}
      <div className="flex items-center gap-3">
        <div
          className="w-1 rounded-full shrink-0"
          style={{ backgroundColor: tagColor, height: '28px' }}
        />
        <input
          className="flex-1 text-base font-medium bg-transparent outline-none placeholder:text-muted-foreground"
          placeholder={t('event.name', '이벤트 이름 추가')}
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />
      </div>

      {/* Event type toggle */}
      <div className="space-y-1.5">
        <span className="text-xs text-muted-foreground">이벤트 유형</span>
        <EventTypeToggle />
      </div>

      {/* Time picker */}
      <EventTimePickerShadcn />

      {/* D-Day badge */}
      <DDayBadge />

      {/* Repeating picker */}
      <RepeatingPickerShadcn />
    </div>
  )
}
