import { EventTimePickerCore } from './EventTimePickerCore'
import { RepeatingPicker } from '../RepeatingPicker'
import type { EventTime, Repeating } from '../../models'

interface EventTimeSectionProps {
  eventTime: EventTime | null
  onEventTimeChange: (v: EventTime | null) => void
  repeating: Repeating | null
  onRepeatingChange: (v: Repeating | null) => void
  required: boolean
}

export function EventTimeSection({
  eventTime,
  onEventTimeChange,
  repeating,
  onRepeatingChange,
  required,
}: EventTimeSectionProps) {
  const startTimestamp = eventTime
    ? eventTime.time_type === 'at'
      ? eventTime.timestamp
      : eventTime.period_start
    : 0

  return (
    <section className="rounded-xl border border-border-light bg-background p-5 shadow-sm space-y-4">
      <EventTimePickerCore
        value={eventTime}
        onChange={onEventTimeChange}
        allowNone={!required}
      />
      {eventTime && (
        <div className="pl-7">
          <RepeatingPicker
            value={repeating}
            onChange={onRepeatingChange}
            startTimestamp={startTimestamp}
          />
        </div>
      )}
    </section>
  )
}
