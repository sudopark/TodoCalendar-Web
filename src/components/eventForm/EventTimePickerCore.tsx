import { useTranslation } from 'react-i18next'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { EventTime } from '../../models'
import { Clock } from 'lucide-react'

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

function startOfTodayTs(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return Math.floor(d.getTime() / 1000)
}

// #106: iOS EventTime.allDay 와 동일한 포맷으로 emit 한다.
//   period_start = event tz 의 시작일 00:00 epoch
//   period_end   = event tz 의 종료일 23:59:59 epoch (Calendar.endOfDay 패턴, +86400-1)
// 이 포맷이어야 alldayLocalDate(#103) 의 (period + offset) UTC date 추출이 정확히 일자를 잡고
// 캘린더에 다일로 표시된다.

export function newAlldayEventTime(secondsFromGMT: number): EventTime {
  const start = startOfTodayTs()
  return { time_type: 'allday', period_start: start, period_end: start + 86400 - 1, seconds_from_gmt: secondsFromGMT }
}

export function alldayWithStart(prev: EventTime, newStartTs: number): EventTime {
  if (prev.time_type !== 'allday') return prev
  // 시작이 종료보다 뒤로 가면 종료를 시작 + 86400 - 1 (1일 종일) 로 정정
  const period_end = prev.period_end < newStartTs ? newStartTs + 86400 - 1 : prev.period_end
  return { ...prev, period_start: newStartTs, period_end }
}

// 입력은 종료 날짜의 자정 epoch (dateInputToTs 결과). +86400-1 로 그 날 23:59:59 로 변환.
// 시작보다 앞서면 null 반환 (변경 거부).
export function alldayWithEnd(prev: EventTime, newEndDateTs: number): EventTime | null {
  if (prev.time_type !== 'allday') return null
  const period_end = newEndDateTs + 86400 - 1
  if (period_end < prev.period_start) return null
  return { ...prev, period_end }
}

// allday date input 의 value (yyyy-mm-dd) 표시: event tz (secondsFromGMT) 기준 일자를 추출.
// (period + offset) timestamp 의 UTC wall-clock 시각이 곧 event tz 의 wall-clock — UTC 메소드로 yyyy-mm-dd 추출.
export function alldayDateInputValue(periodSeconds: number, secondsFromGMT: number): string {
  const wall = new Date((periodSeconds + secondsFromGMT) * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${wall.getUTCFullYear()}-${p(wall.getUTCMonth() + 1)}-${p(wall.getUTCDate())}`
}

// --- Component ---

type TimeType = 'none' | 'at' | 'period' | 'allday'

function timeTypeFrom(eventTime: EventTime | null): TimeType {
  if (!eventTime) return 'none'
  return eventTime.time_type
}

interface EventTimePickerCoreProps {
  value: EventTime | null
  onChange: (v: EventTime | null) => void
  /**
   * 'none' 옵션 허용 여부. Todo는 시간 없음 가능, Schedule은 시간 필수.
   */
  allowNone: boolean
}

export function EventTimePickerCore({ value, onChange, allowNone }: EventTimePickerCoreProps) {
  const { t } = useTranslation()

  const now = Math.floor(Date.now() / 1000)
  const selectedType = timeTypeFrom(value)
  const isAllDay = selectedType === 'allday'

  function handleTypeChange(type: TimeType) {
    if (type === 'none') {
      onChange(null)
      return
    }
    let next: EventTime
    if (type === 'at') {
      next = { time_type: 'at', timestamp: now }
    } else if (type === 'period') {
      next = { time_type: 'period', period_start: now, period_end: now + 3600 }
    } else {
      next = newAlldayEventTime(localSecondsFromGmt())
    }
    onChange(next)
  }

  function handleAllDayToggle(checked: boolean) {
    if (checked) {
      handleTypeChange('allday')
    } else {
      const ts = value?.time_type === 'allday' ? value.period_start : now
      onChange({ time_type: 'at', timestamp: ts })
    }
  }

  // dark:[color-scheme:dark] — 다크모드에서 native datetime-local / date 의 calendar picker indicator 가 어두운 배경에 안 보이는 이슈 해결
  const inputClass = 'rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring dark:[color-scheme:dark]'

  const TIME_TYPE_LABEL: Record<TimeType, string> = {
    none: t('eventTime.none'),
    at: t('eventTime.at'),
    period: t('eventTime.period'),
    allday: t('eventTime.allday'),
  }

  return (
    <div className="space-y-3">
      {/* Row 1: Time type + allday toggle */}
      <div className="flex items-center gap-3">
        <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
        <Select
          value={selectedType}
          onValueChange={(v) => { if (v) handleTypeChange(v as TimeType) }}
        >
          <SelectTrigger className="h-8 text-sm flex-1 min-w-0" aria-label={t('eventTime.time_label', '시각')}>
            <SelectValue>{(v: TimeType) => TIME_TYPE_LABEL[v] ?? ''}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {allowNone && (
              <SelectItem value="none">{t('eventTime.none')}</SelectItem>
            )}
            <SelectItem value="at">{t('eventTime.at')}</SelectItem>
            <SelectItem value="period">{t('eventTime.period')}</SelectItem>
            <SelectItem value="allday">{t('eventTime.allday')}</SelectItem>
          </SelectContent>
        </Select>

        {selectedType !== 'none' && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Checkbox
              id="allday-toggle"
              checked={isAllDay}
              onCheckedChange={handleAllDayToggle}
            />
            <Label htmlFor="allday-toggle" className="text-sm font-normal cursor-pointer">
              {t('eventTime.allday')}
            </Label>
          </div>
        )}
      </div>

      {/* Row 2: Date/time inputs */}
      {selectedType === 'at' && value?.time_type === 'at' && (
        <div className="pl-7">
          <input
            id="at-input"
            aria-label={t('eventTime.time_label')}
            type="datetime-local"
            className={inputClass}
            value={tsToDatetimeLocal(value.timestamp)}
            onChange={e => {
              const ts = datetimeLocalToTs(e.target.value)
              if (ts === null) return
              onChange({ time_type: 'at', timestamp: ts })
            }}
          />
        </div>
      )}

      {selectedType === 'period' && value?.time_type === 'period' && (
        <div className="space-y-2 pl-7">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-8 shrink-0">{t('eventTime.start')}</span>
            <input
              id="period-start"
              aria-label={t('eventTime.start')}
              type="datetime-local"
              className={inputClass}
              value={tsToDatetimeLocal(value.period_start)}
              onChange={e => {
                const newStart = datetimeLocalToTs(e.target.value)
                if (newStart === null || value.time_type !== 'period') return
                const newEnd = newStart > value.period_end ? newStart : value.period_end
                onChange({ ...value, period_start: newStart, period_end: newEnd })
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-8 shrink-0">{t('eventTime.end')}</span>
            <input
              id="period-end"
              aria-label={t('eventTime.end')}
              type="datetime-local"
              className={inputClass}
              value={tsToDatetimeLocal(value.period_end)}
              onChange={e => {
                const newEnd = datetimeLocalToTs(e.target.value)
                if (newEnd === null || value.time_type !== 'period') return
                if (newEnd < value.period_start) return
                onChange({ ...value, period_end: newEnd })
              }}
            />
          </div>
        </div>
      )}

      {selectedType === 'allday' && value?.time_type === 'allday' && (
        <div className="space-y-2 pl-7">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-8 shrink-0">{t('eventTime.start')}</span>
            <input
              id="allday-start"
              aria-label={t('eventTime.start_date')}
              type="date"
              className={inputClass}
              value={alldayDateInputValue(value.period_start, value.seconds_from_gmt)}
              onChange={e => {
                const ts = dateInputToTs(e.target.value)
                if (ts === null || value.time_type !== 'allday') return
                onChange(alldayWithStart(value, ts))
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-8 shrink-0">{t('eventTime.end')}</span>
            <input
              id="allday-end"
              aria-label={t('eventTime.end_date')}
              type="date"
              className={inputClass}
              value={alldayDateInputValue(value.period_end, value.seconds_from_gmt)}
              onChange={e => {
                const ts = dateInputToTs(e.target.value)
                if (ts === null || value.time_type !== 'allday') return
                const next = alldayWithEnd(value, ts)
                if (next === null) return
                onChange(next)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
