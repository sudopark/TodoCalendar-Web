import { useTranslation } from 'react-i18next'
import { Bell } from 'lucide-react'
import { NotificationPickerDropdown } from './NotificationPickerDropdown'
import { useEventFormStore } from '../../stores/eventFormStore'
import { TagDropdown } from '../TagDropdown'

export function EventFormMiddleSection() {
  useTranslation()
  const eventTagId = useEventFormStore(s => s.eventTagId)
  const setEventTagId = useEventFormStore(s => s.setEventTagId)

  return (
    <div className="space-y-3">
      <TagDropdown value={eventTagId} onChange={setEventTagId} />
      <div className="flex items-center gap-3">
        <Bell className="w-4 h-4 text-muted-foreground shrink-0" />
        <NotificationPickerDropdown />
      </div>
    </div>
  )
}
