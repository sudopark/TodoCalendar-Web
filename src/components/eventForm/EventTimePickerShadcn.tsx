import { useTranslation } from 'react-i18next'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useEventFormStore } from '../../stores/eventFormStore'
import type { EventTime } from '../../models'

// --- Conversion utils ---

function tsToDatetimeLocal(ts: number): string {
  const d = new Date(ts * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function datetimeLocalToTs(v: string): number | null {
  const ts = new Date(v).getTime()
  return isNaN(ts) ? null : Math.floor(ts / 1000)
}

function tsToDateInput(ts: number): string {
  const d = new Date(ts * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function dateInputToTs(v: string): number | null {
  if (!v) return null
  const ts = new Date(v + 'T00:00:00').getTime()
  return isNaN(ts) ? null : Math.floor(ts / 1000)
}

function localSecondsFromGmt(): number {
  return -(new Date().getTimezoneOffset() * 60)
}

// --- Component ---

type TimeType = 'none' | 'at' | 'period' | 'allday'

function timeTypeFrom(eventTime: EventTime | null): TimeType {
  if (!eventTime) return 'none'
  return eventTime.time_type
}

export function EventTimePickerShadcn() {
  const { t } = useTranslation()
  const eventTime = useEventFormStore(s => s.eventTime)
  const eventType = useEventFormStore(s => s.eventType)
  const setEventTime = useEventFormStore(s => s.setEventTime)

  const now = Math.floor(Date.now() / 1000)
  const selectedType = timeTypeFrom(eventTime)
  const isAllDay = selectedType === 'allday'

  function handleTypeChange(type: TimeType) {
    if (type === 'none') {
      setEventTime(null)
      return
    }
    let next: EventTime
    if (type === 'at') {
      next = { time_type: 'at', timestamp: now }
    } else if (type === 'period') {
      next = { time_type: 'period', period_start: now, period_end: now + 3600 }
    } else {
      next = { time_type: 'allday', period_start: now, period_end: now, seconds_from_gmt: localSecondsFromGmt() }
    }
    setEventTime(next)
  }

  function handleAllDayToggle(checked: boolean) {
    if (checked) {
      handleTypeChange('allday')
    } else {
      // Convert allday → at using period_start
      const ts = eventTime?.time_type === 'allday' ? eventTime.period_start : now
      setEventTime({ time_type: 'at', timestamp: ts })
    }
  }

  return (
    <div className="space-y-3">
      {/* Time type selector */}
      <div className="flex items-center gap-3">
        <select
          aria-label="시간 유형"
          className="rounded border border-input bg-transparent px-2 py-1 text-sm"
          value={selectedType}
          onChange={e => handleTypeChange(e.target.value as TimeType)}
        >
          {eventType === 'todo' && (
            <option value="none">{t('eventTime.none')}</option>
          )}
          <option value="at">{t('eventTime.at')}</option>
          <option value="period">{t('eventTime.period')}</option>
          <option value="allday">{t('eventTime.allday')}</option>
        </select>

        {/* 하루종일 checkbox — shown when a time is selected */}
        {selectedType !== 'none' && (
          <div className="flex items-center gap-2">
            <Checkbox
              id="allday-toggle"
              checked={isAllDay}
              onCheckedChange={handleAllDayToggle}
            />
            <Label htmlFor="allday-toggle" className="text-sm font-normal">
              {t('eventTime.allday')}
            </Label>
          </div>
        )}
      </div>

      {/* at: single datetime-local input */}
      {selectedType === 'at' && eventTime?.time_type === 'at' && (
        <div>
          <label className="block text-xs text-muted-foreground" htmlFor="at-input">
            {t('eventTime.time_label')}
          </label>
          <input
            id="at-input"
            aria-label={t('eventTime.time_label')}
            type="datetime-local"
            className="mt-1 rounded border border-input bg-transparent px-2 py-1 text-sm"
            value={tsToDatetimeLocal(eventTime.timestamp)}
            onChange={e => {
              const ts = datetimeLocalToTs(e.target.value)
              if (ts === null) return
              setEventTime({ time_type: 'at', timestamp: ts })
            }}
          />
        </div>
      )}

      {/* period: start + end datetime-local inputs */}
      {selectedType === 'period' && eventTime?.time_type === 'period' && (
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="block text-xs text-muted-foreground" htmlFor="period-start">
              {t('eventTime.start')}
            </label>
            <input
              id="period-start"
              aria-label={t('eventTime.start')}
              type="datetime-local"
              className="mt-1 rounded border border-input bg-transparent px-2 py-1 text-sm"
              value={tsToDatetimeLocal(eventTime.period_start)}
              onChange={e => {
                const newStart = datetimeLocalToTs(e.target.value)
                if (newStart === null || eventTime.time_type !== 'period') return
                const newEnd = newStart > eventTime.period_end ? newStart : eventTime.period_end
                setEventTime({ ...eventTime, period_start: newStart, period_end: newEnd })
              }}
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground" htmlFor="period-end">
              {t('eventTime.end')}
            </label>
            <input
              id="period-end"
              aria-label={t('eventTime.end')}
              type="datetime-local"
              className="mt-1 rounded border border-input bg-transparent px-2 py-1 text-sm"
              value={tsToDatetimeLocal(eventTime.period_end)}
              onChange={e => {
                const newEnd = datetimeLocalToTs(e.target.value)
                if (newEnd === null || eventTime.time_type !== 'period') return
                if (newEnd < eventTime.period_start) return
                setEventTime({ ...eventTime, period_end: newEnd })
              }}
            />
          </div>
        </div>
      )}

      {/* allday: start + end date inputs */}
      {selectedType === 'allday' && eventTime?.time_type === 'allday' && (
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="block text-xs text-muted-foreground" htmlFor="allday-start">
              {t('eventTime.start_date')}
            </label>
            <input
              id="allday-start"
              aria-label={t('eventTime.start_date')}
              type="date"
              className="mt-1 rounded border border-input bg-transparent px-2 py-1 text-sm"
              value={tsToDateInput(eventTime.period_start + eventTime.seconds_from_gmt)}
              onChange={e => {
                const ts = dateInputToTs(e.target.value)
                if (ts === null || eventTime.time_type !== 'allday') return
                setEventTime({ ...eventTime, period_start: ts - eventTime.seconds_from_gmt })
              }}
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground" htmlFor="allday-end">
              {t('eventTime.end_date')}
            </label>
            <input
              id="allday-end"
              aria-label={t('eventTime.end_date')}
              type="date"
              className="mt-1 rounded border border-input bg-transparent px-2 py-1 text-sm"
              value={tsToDateInput(eventTime.period_end + eventTime.seconds_from_gmt)}
              onChange={e => {
                const ts = dateInputToTs(e.target.value)
                if (ts === null || eventTime.time_type !== 'allday') return
                const newEnd = ts - eventTime.seconds_from_gmt
                if (newEnd < eventTime.period_start) return
                setEventTime({ ...eventTime, period_end: newEnd })
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
