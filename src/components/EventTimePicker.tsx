import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { EventTime } from '../models'

type TimeType = 'none' | 'at' | 'period' | 'allday'

function tsToDateInput(ts: number): string {
  const d = new Date(ts * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function dateInputToTs(v: string): number | null {
  if (!v) return null
  const ts = new Date(v + 'T00:00:00').getTime()
  if (isNaN(ts)) return null
  return Math.floor(ts / 1000)
}

function tsToTimeInput(ts: number): string {
  const d = new Date(ts * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}`
}

function parseTimeString(v: string): { hh: number; mm: number } | null {
  const [h, m] = v.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return null
  return { hh: h, mm: m }
}

// 주어진 ts의 날짜 부분만 dateTs의 날짜로 교체하고 시/분은 유지
function replaceDateOf(ts: number, dateTs: number): number {
  const source = new Date(ts * 1000)
  const target = new Date(dateTs * 1000)
  target.setHours(source.getHours(), source.getMinutes(), 0, 0)
  return Math.floor(target.getTime() / 1000)
}

// 주어진 ts의 시/분만 (hh, mm)으로 교체하고 날짜는 유지
function replaceTimeOf(ts: number, hh: number, mm: number): number {
  const d = new Date(ts * 1000)
  d.setHours(hh, mm, 0, 0)
  return Math.floor(d.getTime() / 1000)
}

function localSecondsFromGmt(): number {
  return -(new Date().getTimezoneOffset() * 60)
}

// 시안: "(GMT+09:00) Korean Standard Time - Seoul" 형식으로 현재 타임존을 노출
function formatTimezoneLabel(): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const city = tz.split('/').pop()?.replace(/_/g, ' ') ?? tz
  const offsetMin = -new Date().getTimezoneOffset()
  const sign = offsetMin >= 0 ? '+' : '-'
  const absMin = Math.abs(offsetMin)
  const hh = String(Math.floor(absMin / 60)).padStart(2, '0')
  const mm = String(absMin % 60).padStart(2, '0')
  const longName =
    new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'long' })
      .formatToParts(new Date())
      .find(p => p.type === 'timeZoneName')?.value ?? ''
  return longName
    ? `(GMT${sign}${hh}:${mm}) ${longName} - ${city}`
    : `(GMT${sign}${hh}:${mm}) ${city}`
}

const pillInput =
  'rounded-md border border-transparent bg-surface-sunken hover:bg-surface-sunken focus:bg-surface focus:border-line-strong px-3 py-1.5 text-sm outline-none'

interface EventTimePickerProps {
  value: EventTime | null
  onChange: (value: EventTime | null) => void
  required?: boolean
}

export function EventTimePicker({ value, onChange, required = false }: EventTimePickerProps) {
  const { t } = useTranslation()
  const now = Math.floor(Date.now() / 1000)

  const initType = (): TimeType => {
    if (!value) return required ? 'at' : 'none'
    return value.time_type
  }

  const initInternal = (): EventTime | null => {
    if (value) return value
    if (required) return { time_type: 'at', timestamp: now }
    return null
  }

  const [type, setType] = useState<TimeType>(initType)
  const [internal, setInternal] = useState<EventTime | null>(initInternal)

  function handleTypeChange(nextType: TimeType) {
    setType(nextType)
    if (nextType === 'none') {
      setInternal(null)
      onChange(null)
      return
    }
    let next: EventTime
    if (nextType === 'at') next = { time_type: 'at', timestamp: now }
    else if (nextType === 'period') next = { time_type: 'period', period_start: now, period_end: now + 3600 }
    else next = { time_type: 'allday', period_start: now, period_end: now, seconds_from_gmt: localSecondsFromGmt() }
    setInternal(next)
    onChange(next)
  }

  function handleValueChange(next: EventTime) {
    setInternal(next)
    onChange(next)
  }

  return (
    <div className="space-y-3">
      {type !== 'allday' && (
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap gap-3">
            {!required && (
              <label className="flex items-center gap-1 text-sm">
                <input type="radio" name="time-type" checked={type === 'none'} onChange={() => handleTypeChange('none')} />
                {t('eventTime.none')}
              </label>
            )}
            <label className="flex items-center gap-1 text-sm">
              <input type="radio" name="time-type" checked={type === 'at'} onChange={() => handleTypeChange('at')} />
              {t('eventTime.at')}
            </label>
            <label className="flex items-center gap-1 text-sm">
              <input type="radio" name="time-type" checked={type === 'period'} onChange={() => handleTypeChange('period')} />
              {t('eventTime.period')}
            </label>
          </div>
        </div>
      )}

      {type === 'at' && internal?.time_type === 'at' && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            aria-label={t('eventTime.start_date')}
            type="date"
            className={pillInput}
            value={tsToDateInput(internal.timestamp)}
            onChange={e => {
              const dateTs = dateInputToTs(e.target.value)
              if (dateTs === null) return
              handleValueChange({ time_type: 'at', timestamp: replaceDateOf(internal.timestamp, dateTs) })
            }}
          />
          <input
            aria-label={t('eventTime.start_time')}
            type="time"
            className={pillInput}
            value={tsToTimeInput(internal.timestamp)}
            onChange={e => {
              const parsed = parseTimeString(e.target.value)
              if (!parsed) return
              handleValueChange({ time_type: 'at', timestamp: replaceTimeOf(internal.timestamp, parsed.hh, parsed.mm) })
            }}
          />
        </div>
      )}

      {type === 'period' && internal?.time_type === 'period' && (
        <div className="flex flex-wrap items-center gap-2">
          {/* 시작 그룹 */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              aria-label={t('eventTime.start_date')}
              type="date"
              className={pillInput}
              value={tsToDateInput(internal.period_start)}
              onChange={e => {
                const dateTs = dateInputToTs(e.target.value)
                if (dateTs === null) return
                // 시작 날짜 변경 → duration 유지하며 종료 동반 이동
                const newStart = replaceDateOf(internal.period_start, dateTs)
                const duration = Math.max(0, internal.period_end - internal.period_start)
                handleValueChange({ ...internal, period_start: newStart, period_end: newStart + duration })
              }}
            />
            <input
              aria-label={t('eventTime.start_time')}
              type="time"
              className={pillInput}
              value={tsToTimeInput(internal.period_start)}
              onChange={e => {
                const parsed = parseTimeString(e.target.value)
                if (!parsed) return
                // 시작 시간 변경 → duration 유지하며 종료 동반 이동
                const newStart = replaceTimeOf(internal.period_start, parsed.hh, parsed.mm)
                const duration = Math.max(0, internal.period_end - internal.period_start)
                handleValueChange({ ...internal, period_start: newStart, period_end: newStart + duration })
              }}
            />
          </div>

          <span className="px-3 text-sm font-medium text-fg-tertiary">{t('eventTime.to')}</span>

          {/* 종료 그룹 — 종료 시간을 시작 시간에 가까운 쪽으로, 종료 날짜는 맨 오른쪽 */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              aria-label={t('eventTime.end_time')}
              type="time"
              className={pillInput}
              value={tsToTimeInput(internal.period_end)}
              onChange={e => {
                const parsed = parseTimeString(e.target.value)
                if (!parsed) return
                // 종료 시간이 시작 이전이면 다음 날로 자동 이동 (사용자 입력 존중, silent fail 금지)
                let newEnd = replaceTimeOf(internal.period_end, parsed.hh, parsed.mm)
                if (newEnd < internal.period_start) newEnd += 86400
                handleValueChange({ ...internal, period_end: newEnd })
              }}
            />
            <input
              aria-label={t('eventTime.end_date')}
              type="date"
              className={pillInput}
              value={tsToDateInput(internal.period_end)}
              onChange={e => {
                const dateTs = dateInputToTs(e.target.value)
                if (dateTs === null) return
                // 종료 날짜는 명시적 입력이므로 시작 이전이면 거부
                const newEnd = replaceDateOf(internal.period_end, dateTs)
                if (newEnd < internal.period_start) return
                handleValueChange({ ...internal, period_end: newEnd })
              }}
            />
          </div>
        </div>
      )}

      {type === 'allday' && internal?.time_type === 'allday' && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            aria-label={t('eventTime.start_date')}
            type="date"
            className={pillInput}
            value={tsToDateInput(internal.period_start + internal.seconds_from_gmt)}
            onChange={e => {
              const ts = dateInputToTs(e.target.value)
              if (ts === null) return
              handleValueChange({ ...internal, period_start: ts - internal.seconds_from_gmt })
            }}
          />
          <span className="px-3 text-sm font-medium text-fg-tertiary">{t('eventTime.to')}</span>
          <input
            aria-label={t('eventTime.end_date')}
            type="date"
            className={pillInput}
            value={tsToDateInput(internal.period_end + internal.seconds_from_gmt)}
            onChange={e => {
              const ts = dateInputToTs(e.target.value)
              if (ts === null) return
              const newEnd = ts - internal.seconds_from_gmt
              if (newEnd < internal.period_start) return
              handleValueChange({ ...internal, period_end: newEnd })
            }}
          />
        </div>
      )}

      {type !== 'none' && (
        <div className="text-xs text-fg-tertiary">
          {formatTimezoneLabel()}
        </div>
      )}
    </div>
  )
}
