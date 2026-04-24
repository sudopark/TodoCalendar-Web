import { EventTimePickerCore } from './EventTimePickerCore'
import { RepeatingSection } from './RepeatingSection'
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
  return (
    <section className="rounded-xl border border-border-light bg-background p-5 shadow-sm space-y-4">
      <EventTimePickerCore
        value={eventTime}
        onChange={onEventTimeChange}
        allowNone={!required}
      />
      <RepeatingSection
        eventTime={eventTime}
        repeating={repeating}
        onRepeatingChange={onRepeatingChange}
      />
    </section>
  )
}
