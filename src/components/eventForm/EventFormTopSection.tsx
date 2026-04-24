import { useTranslation } from 'react-i18next'
import { EventTypeToggle } from './EventTypeToggle'
import { EventTimePickerShadcn } from './EventTimePickerShadcn'
import { DDayBadge } from './DDayBadge'
import { RepeatingSection } from './RepeatingSection'
import { useEventFormStore } from '../../stores/eventFormStore'
import { useResolvedEventTag } from '../../hooks/useResolvedEventTag'

export function EventFormTopSection() {
  const { t } = useTranslation()
  const name = useEventFormStore(s => s.name)
  const setName = useEventFormStore(s => s.setName)
  const eventTagId = useEventFormStore(s => s.eventTagId)
  const eventTime = useEventFormStore(s => s.eventTime)
  const repeating = useEventFormStore(s => s.repeating)
  const setRepeating = useEventFormStore(s => s.setRepeating)
  const resolved = useResolvedEventTag(eventTagId)
  const tagColor = resolved.color

  return (
    <div className="space-y-4">
      {/* Name input + DDay inline chip */}
      <div className="flex items-center gap-3 pb-2 border-b border-border-light focus-within:border-text-primary transition-colors">
        <div
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: tagColor }}
          data-testid="event-form-tag-swatch"
        />
        <input
          className="flex-1 min-w-0 text-lg font-semibold bg-transparent outline-none placeholder:text-text-tertiary placeholder:font-normal"
          placeholder={t('event.namePlaceholder', '이벤트 이름')}
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />
        <DDayBadge />
      </div>
      <EventTypeToggle />
      <EventTimePickerShadcn />
      <RepeatingSection
        eventTime={eventTime}
        repeating={repeating}
        onRepeatingChange={setRepeating}
      />
    </div>
  )
}
