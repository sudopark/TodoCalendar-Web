import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import type { Repeating, RepeatingOption } from '../models'

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone

interface RepeatingPickerProps {
  value: Repeating | null
  onChange: (value: Repeating | null) => void
  startTimestamp: number
}

interface RepeatPreset {
  id: string
  text: string
  option: RepeatingOption
}

type EndType = 'never' | 'date' | 'count'

// 0=Sun ~ 6=Sat
function dayName(weekday: number, isKo: boolean): string {
  const ko = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
  const en = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return (isKo ? ko : en)[weekday] ?? ''
}

function nthLabel(n: number, isKo: boolean): string {
  if (isKo) return `${n}`
  const suffix = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'
  return `${n}${suffix}`
}

function formatDateInput(ts: number): string {
  const d = new Date(ts * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function parseDateInputToTs(v: string): number | null {
  if (!v) return null
  const ts = new Date(v + 'T23:59:59').getTime()
  if (isNaN(ts)) return null
  return Math.floor(ts / 1000)
}

function optionsEqual(a: RepeatingOption, b: RepeatingOption): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

// iOS SelectEventRepeatOptionViewModel.SupportingOptions.supports() 포팅
function generateRepeatPresets(
  startTs: number,
  t: (k: string, p?: Record<string, unknown>) => string,
  isKo: boolean,
): RepeatPreset[] {
  const d = new Date(startTs * 1000)
  const weekday = d.getDay()
  const day = d.getDate()
  const month = d.getMonth() + 1
  const name = dayName(weekday, isKo)

  const presets: RepeatPreset[] = [
    {
      id: 'every_day',
      text: t('repeating.preset.every_day'),
      option: { optionType: 'every_day', interval: 1 },
    },
    {
      id: `every_week_${weekday}`,
      text: t('repeating.preset.every_week_day', { day: name }),
      option: { optionType: 'every_week', interval: 1, dayOfWeek: [weekday], timeZone: TZ },
    },
    {
      id: `every_2week_${weekday}`,
      text: t('repeating.preset.every_n_week_day', { n: 2, day: name }),
      option: { optionType: 'every_week', interval: 2, dayOfWeek: [weekday], timeZone: TZ },
    },
    {
      id: `every_3week_${weekday}`,
      text: t('repeating.preset.every_n_week_day', { n: 3, day: name }),
      option: { optionType: 'every_week', interval: 3, dayOfWeek: [weekday], timeZone: TZ },
    },
    {
      id: `every_4week_${weekday}`,
      text: t('repeating.preset.every_n_week_day', { n: 4, day: name }),
      option: { optionType: 'every_week', interval: 4, dayOfWeek: [weekday], timeZone: TZ },
    },
    {
      id: `every_month_${day}`,
      text: t('repeating.preset.every_month_day', { day }),
      option: {
        optionType: 'every_month',
        interval: 1,
        monthDaySelection: { days: [day] },
        timeZone: TZ,
      },
    },
    {
      id: `every_year_${month}_${day}`,
      text: t('repeating.preset.every_year_date', { month, day }),
      option: { optionType: 'every_year_some_day', interval: 1, month, day, timeZone: TZ },
    },
    {
      id: `lunar_year_${month}_${day}`,
      text: t('repeating.preset.lunar_year_date', { month, day }),
      option: { optionType: 'lunar_calendar_every_year', month, day, timeZone: TZ },
    },
  ]

  // 평일이면 "주중 (월-금)" 추가
  if (weekday >= 1 && weekday <= 5) {
    presets.push({
      id: 'every_weekdays',
      text: t('repeating.preset.every_weekdays'),
      option: {
        optionType: 'every_week',
        interval: 1,
        dayOfWeek: [1, 2, 3, 4, 5],
        timeZone: TZ,
      },
    })
  }

  // 매월 {N번째/마지막} {요일}
  const weekOfMonth = Math.ceil(day / 7) // 1~5
  if (weekOfMonth >= 1 && weekOfMonth <= 4) {
    presets.push({
      id: `every_month_${weekOfMonth}th_${weekday}`,
      text: t('repeating.preset.every_nth_weekday', { nth: nthLabel(weekOfMonth, isKo), day: name }),
      option: {
        optionType: 'every_month',
        interval: 1,
        monthDaySelection: {
          weekOrdinals: [{ isLast: false, seq: weekOfMonth }],
          weekDays: [weekday],
        },
        timeZone: TZ,
      },
    })
  }
  presets.push({
    id: `every_month_last_${weekday}`,
    text: t('repeating.preset.every_last_weekday', { day: name }),
    option: {
      optionType: 'every_month',
      interval: 1,
      monthDaySelection: {
        weekOrdinals: [{ isLast: true }],
        weekDays: [weekday],
      },
      timeZone: TZ,
    },
  })

  return presets
}

function initialEndType(value: Repeating | null): EndType {
  if (value?.end_count != null) return 'count'
  if (value?.end != null) return 'date'
  return 'never'
}

function initialEndDateInput(value: Repeating | null, startTs: number): string {
  if (value?.end != null) return formatDateInput(value.end)
  // 기본값: 시작일이 속한 달의 마지막 날
  const d = new Date(startTs * 1000)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${lastDay.getFullYear()}-${p(lastDay.getMonth() + 1)}-${p(lastDay.getDate())}`
}

export function RepeatingPicker({ value, onChange, startTimestamp }: RepeatingPickerProps) {
  const { t, i18n } = useTranslation()
  const isKo = i18n.language !== 'en'
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const presets = useMemo(
    () => generateRepeatPresets(startTimestamp, t, isKo),
    [startTimestamp, t, isKo],
  )

  const [endType, setEndType] = useState<EndType>(() => initialEndType(value))
  const [endDate, setEndDate] = useState<string>(() => initialEndDateInput(value, startTimestamp))
  const [endCount, setEndCount] = useState<number>(() => value?.end_count ?? 10)

  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const selectedPreset = value ? presets.find(p => optionsEqual(p.option, value.option)) : null

  const buttonLabel =
    !value
      ? t('repeating.not_repeat')
      : selectedPreset?.text ?? t('repeating.custom')

  function emit(option: RepeatingOption | null, type: EndType, dateStr: string, count: number) {
    if (!option) {
      onChange(null)
      return
    }
    const end = type === 'date' ? parseDateInputToTs(dateStr) ?? undefined : undefined
    const end_count = type === 'count' ? count : undefined
    onChange({ start: startTimestamp, option, end, end_count })
  }

  function handleSelectPreset(preset: RepeatPreset | null) {
    setOpen(false)
    if (!preset) {
      onChange(null)
      setEndType('never')
      return
    }
    emit(preset.option, endType, endDate, endCount)
  }

  function handleEndTypeChange(nextType: EndType) {
    setEndType(nextType)
    if (!value) return
    emit(value.option, nextType, endDate, endCount)
  }

  function handleEndDateChange(next: string) {
    setEndDate(next)
    if (!value || endType !== 'date') return
    emit(value.option, 'date', next, endCount)
  }

  function handleEndCountChange(next: number) {
    setEndCount(next)
    if (!value || endType !== 'count') return
    emit(value.option, 'count', endDate, next)
  }

  return (
    <div className="inline-flex flex-wrap items-center gap-2">
      {/* 반복 유형 드롭다운 */}
      <div className="relative" ref={rootRef}>
        <button
          type="button"
          aria-label={t('repeating.enabled')}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
          className="inline-flex items-center gap-1 rounded-md border border-line-strong bg-surface px-3 py-1.5 text-sm text-fg-secondary hover:bg-surface-elevated"
        >
          {buttonLabel}
          <ChevronDown size={14} aria-hidden="true" />
        </button>

        {open && (
          <div
            role="menu"
            className="absolute left-0 z-10 mt-1 max-h-80 min-w-[220px] overflow-auto rounded-md border border-line bg-surface-elevated py-1 shadow-md"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => handleSelectPreset(null)}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-surface-sunken ${
                !value ? 'font-medium text-blue-600' : 'text-fg-secondary'
              }`}
            >
              {t('repeating.not_repeat')}
            </button>
            <div className="my-1 border-t border-line" />
            {presets.map(p => {
              const isSelected = value && optionsEqual(p.option, value.option)
              return (
                <button
                  key={p.id}
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelectPreset(p)}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-surface-sunken ${
                    isSelected ? 'font-medium text-blue-600' : 'text-fg-secondary'
                  }`}
                >
                  {p.text}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* 종료 조건: 반복이 설정된 경우에만 노출 */}
      {value && (
        <div className="inline-flex items-center gap-2 text-sm text-fg-secondary">
          <select
            aria-label={t('repeating.end_condition')}
            className="rounded-md border border-line-strong bg-surface px-2 py-1.5 text-sm"
            value={endType}
            onChange={e => handleEndTypeChange(e.target.value as EndType)}
          >
            <option value="never">{t('repeating.end_type_never')}</option>
            <option value="date">{t('repeating.end_type_date')}</option>
            <option value="count">{t('repeating.end_type_count')}</option>
          </select>
          {endType === 'date' && (
            <input
              type="date"
              aria-label={t('repeating.end_on_date')}
              className="rounded-md border border-line-strong bg-surface px-2 py-1.5 text-sm"
              value={endDate}
              onChange={e => handleEndDateChange(e.target.value)}
            />
          )}
          {endType === 'count' && (
            <input
              type="number"
              min={1}
              aria-label={t('repeating.end_after_count', { n: endCount })}
              className="w-20 rounded-md border border-line-strong bg-surface px-2 py-1.5 text-sm"
              value={endCount}
              onChange={e => handleEndCountChange(Math.max(1, Number(e.target.value) || 1))}
            />
          )}
        </div>
      )}
    </div>
  )
}
