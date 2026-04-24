import { useEventFormStore } from '../../stores/eventFormStore'
import { EventTimePickerCore } from './EventTimePickerCore'

export function EventTimePickerShadcn() {
  const eventTime = useEventFormStore(s => s.eventTime)
  const eventType = useEventFormStore(s => s.eventType)
  const setEventTime = useEventFormStore(s => s.setEventTime)

  return (
    <EventTimePickerCore
      value={eventTime}
      onChange={setEventTime}
      allowNone={eventType === 'todo'}
    />
  )
}
