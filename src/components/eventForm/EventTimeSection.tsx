import { useTranslation } from 'react-i18next'
import { Clock, Repeat } from 'lucide-react'
import { EventTimePicker } from '../EventTimePicker'
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
  const { t } = useTranslation()

  const startTimestamp = eventTime
    ? eventTime.time_type === 'at'
      ? eventTime.timestamp
      : eventTime.period_start
    : 0

  return (
    <section className="py-2 space-y-4">
      {/* 시간 */}
      <div className="flex items-start gap-3">
        <Clock className="mt-1 h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" aria-hidden="true" />
        <div className="flex-1">
          <h2 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">{t('event.time')}</h2>
          <EventTimePicker value={eventTime} onChange={onEventTimeChange} required={required} />
        </div>
      </div>

      {/* 반복: 시간 아래 같은 컬럼에 배치 */}
      {eventTime && (
        <div className="flex items-start gap-3">
          <Repeat className="mt-1 h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" aria-hidden="true" />
          <div className="flex-1">
            <h2 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">{t('event.repeat')}</h2>
            <RepeatingPicker
              value={repeating}
              onChange={onRepeatingChange}
              startTimestamp={startTimestamp}
            />
          </div>
        </div>
      )}
    </section>
  )
}
