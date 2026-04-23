import { useTranslation } from 'react-i18next'
import { EventTypeToggle } from './EventTypeToggle'
import { EventTimePickerShadcn } from './EventTimePickerShadcn'
import { DDayBadge } from './DDayBadge'
import { RepeatingPickerShadcn } from './RepeatingPickerShadcn'
import { useEventFormStore } from '../../stores/eventFormStore'
import { useResolvedEventTag } from '../../hooks/useResolvedEventTag'

export function EventFormTopSection() {
  const { t } = useTranslation()
  const name = useEventFormStore(s => s.name)
  const setName = useEventFormStore(s => s.setName)
  const eventTagId = useEventFormStore(s => s.eventTagId)
  const resolved = useResolvedEventTag(eventTagId)
  const tagColor = resolved.color

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div
          className="w-4 h-4 rounded-md shrink-0"
          style={{ backgroundColor: tagColor }}
          data-testid="event-form-tag-swatch"
        />
        <input
          className="flex-1 text-base font-medium bg-transparent outline-none placeholder:text-muted-foreground"
          placeholder={t('event.namePlaceholder', '이벤트 이름 추가')}
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />
      </div>
      <EventTypeToggle />
      <EventTimePickerShadcn />
      <DDayBadge />
      <RepeatingPickerShadcn />
    </div>
  )
}
