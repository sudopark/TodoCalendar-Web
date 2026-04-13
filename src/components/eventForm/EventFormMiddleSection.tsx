import { useTranslation } from 'react-i18next'
import { NotificationPickerDropdown } from './NotificationPickerDropdown'
import { useEventFormStore } from '../../stores/eventFormStore'
import { useEventTagStore, DEFAULT_TAG_ID } from '../../stores/eventTagStore'
import { Tag, Bell } from 'lucide-react'

export function EventFormMiddleSection() {
  const { t } = useTranslation()
  const eventTagId = useEventFormStore(s => s.eventTagId)

  const tagColor = eventTagId
    ? (useEventTagStore.getState().getColorForTagId(eventTagId) ?? '#4A90D9')
    : '#4A90D9'

  const isDefault = !eventTagId || eventTagId === DEFAULT_TAG_ID
  const tagName = isDefault
    ? t('tag.default_name', '기본')
    : (useEventTagStore.getState().tags.get(eventTagId)?.name ?? t('tag.default_name', '기본'))

  return (
    <div className="space-y-3">
      {/* Tag display (read-only) */}
      <div className="flex items-center gap-3">
        <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
        <div className="flex items-center gap-2 text-sm">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: tagColor }}
          />
          <span>{tagName}</span>
        </div>
      </div>

      {/* Notification picker - aligned with tag */}
      <div className="flex items-center gap-3">
        <Bell className="w-4 h-4 text-muted-foreground shrink-0" />
        <NotificationPickerDropdown />
      </div>
    </div>
  )
}
