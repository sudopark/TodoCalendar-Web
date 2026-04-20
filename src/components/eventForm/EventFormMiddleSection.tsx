import { useTranslation } from 'react-i18next'
import { NotificationPickerDropdown } from './NotificationPickerDropdown'
import { useEventFormStore } from '../../stores/eventFormStore'
import { useResolvedEventTag } from '../../hooks/useResolvedEventTag'
import { tagDisplayName } from '../../utils/tagDisplay'
import { Tag, Bell } from 'lucide-react'

export function EventFormMiddleSection() {
  const { t } = useTranslation()
  const eventTagId = useEventFormStore(s => s.eventTagId)
  const resolved = useResolvedEventTag(eventTagId)
  const tagColor = resolved.color
  const tagName = tagDisplayName(resolved, t)

  return (
    <div className="space-y-3">
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
      <div className="flex items-center gap-3">
        <Bell className="w-4 h-4 text-muted-foreground shrink-0" />
        <NotificationPickerDropdown />
      </div>
    </div>
  )
}
