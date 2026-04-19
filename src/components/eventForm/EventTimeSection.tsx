import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
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

function localSecondsFromGmt(): number {
  return -(new Date().getTimezoneOffset() * 60)
}

export function EventTimeSection({
  eventTime,
  onEventTimeChange,
  repeating,
  onRepeatingChange,
  required,
}: EventTimeSectionProps) {
  const { t } = useTranslation()

  // All day 해제 시 복원할 직전 시간 유형
  const [prevNonAllday, setPrevNonAllday] = useState<'at' | 'period'>(
    eventTime?.time_type === 'period' ? 'period' : 'at'
  )

  useEffect(() => {
    if (eventTime?.time_type === 'at' || eventTime?.time_type === 'period') {
      setPrevNonAllday(eventTime.time_type)
    }
  }, [eventTime?.time_type])

  const isAllDay = eventTime?.time_type === 'allday'

  const startTimestamp = eventTime
    ? eventTime.time_type === 'at'
      ? eventTime.timestamp
      : eventTime.period_start
    : 0

  function handleAllDayToggle(checked: boolean) {
    const now = Math.floor(Date.now() / 1000)
    if (checked) {
      // allday로 전환 — 현재 시간 기준 날짜 보존
      const base =
        eventTime?.time_type === 'period'
          ? eventTime.period_start
          : eventTime?.time_type === 'at'
            ? eventTime.timestamp
            : now
      const end = eventTime?.time_type === 'period' ? eventTime.period_end : base
      onEventTimeChange({
        time_type: 'allday',
        period_start: base,
        period_end: end,
        seconds_from_gmt: localSecondsFromGmt(),
      })
    } else {
      // 복원: 직전 유형으로
      const base = eventTime?.time_type === 'allday' ? eventTime.period_start : now
      if (prevNonAllday === 'period') {
        const end = eventTime?.time_type === 'allday' ? eventTime.period_end : base
        onEventTimeChange({
          time_type: 'period',
          period_start: base,
          period_end: end > base ? end : base + 3600,
        })
      } else {
        onEventTimeChange({ time_type: 'at', timestamp: base })
      }
    }
  }

  return (
    <section className="py-2 space-y-3">
      <EventTimePicker value={eventTime} onChange={onEventTimeChange} required={required} />
      {eventTime && (
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              aria-label={t('eventTime.allday')}
              checked={isAllDay}
              onChange={e => handleAllDayToggle(e.target.checked)}
            />
            {t('eventTime.allday')}
          </label>
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
