import { useEventFormStore } from '../../stores/eventFormStore'
import { NotificationPickerCore } from './NotificationPickerCore'

export function NotificationPickerDropdown() {
  const eventTime = useEventFormStore(s => s.eventTime)
  const notifications = useEventFormStore(s => s.notifications)
  const setNotifications = useEventFormStore(s => s.setNotifications)

  return (
    <NotificationPickerCore
      value={notifications}
      onChange={setNotifications}
      isAllDay={eventTime?.time_type === 'allday'}
      disabled={eventTime === null}
    />
  )
}
