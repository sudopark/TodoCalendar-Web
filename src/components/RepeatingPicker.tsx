import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import type { Repeating, RepeatingOption } from '../models'

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone

type RepeatType =
  | 'none'
  | 'every_day'
  | 'every_week'
  | 'every_month'
  | 'every_year'
  | 'every_year_some_day'
  | 'lunar_calendar_every_year'

const SELECTABLE_TYPES: RepeatType[] = [
  'none',
  'every_day',
  'every_week',
  'every_month',
  'every_year',
  'every_year_some_day',
  'lunar_calendar_every_year',
]

const TYPE_LABEL_KEY: Record<Exclude<RepeatType, 'none'>, string> = {
  every_day: 'repeating.daily',
  every_week: 'repeating.weekly',
  every_month: 'repeating.monthly',
  every_year: 'repeating.yearly',
  every_year_some_day: 'repeating.yearly_some_day',
  lunar_calendar_every_year: 'repeating.lunar',
}

function defaultOption(type: Exclude<RepeatType, 'none'>, startTs: number): RepeatingOption {
  const d = new Date(startTs * 1000)
  switch (type) {
    case 'every_day':
      return { optionType: 'every_day', interval: 1 }
    case 'every_week':
      return { optionType: 'every_week', interval: 1, dayOfWeek: [d.getDay()], timeZone: TZ }
    case 'every_month':
      return { optionType: 'every_month', interval: 1, monthDaySelection: { days: [d.getDate()] }, timeZone: TZ }
    case 'every_year':
      return { optionType: 'every_year', interval: 1, months: [d.getMonth() + 1], weekOrdinals: [{ seq: 1, isLast: false }], dayOfWeek: [d.getDay()], timeZone: TZ }
    case 'every_year_some_day':
      return { optionType: 'every_year_some_day', interval: 1, month: d.getMonth() + 1, day: d.getDate(), timeZone: TZ }
    case 'lunar_calendar_every_year':
      return { optionType: 'lunar_calendar_every_year', month: d.getMonth() + 1, day: d.getDate(), timeZone: TZ }
  }
}

interface RepeatingPickerProps {
  value: Repeating | null
  onChange: (value: Repeating | null) => void
  startTimestamp: number
}

function formatDate(ts: number): string {
  const d = new Date(ts * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function RepeatingPicker({ value, onChange, startTimestamp }: RepeatingPickerProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

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

  const selectedType: RepeatType = value ? value.option.optionType : 'none'

  const shortLabel =
    selectedType === 'none' ? t('repeating.not_repeat') : t(TYPE_LABEL_KEY[selectedType])

  function handleSelect(type: RepeatType) {
    setOpen(false)
    if (type === 'none') {
      onChange(null)
      return
    }
    onChange({ start: startTimestamp, option: defaultOption(type, startTimestamp) })
  }

  function detailText(): string {
    if (!value) return ''
    const opt = value.option
    const parts: string[] = []

    // interval > 1인 경우만 주기 명시
    if ('interval' in opt && opt.interval > 1) {
      const intervalKeys: Record<Exclude<RepeatType, 'none'>, string> = {
        every_day: 'repeating.detail_every_n_days',
        every_week: 'repeating.detail_every_n_weeks',
        every_month: 'repeating.detail_every_n_months',
        every_year: 'repeating.detail_every_n_years',
        every_year_some_day: 'repeating.detail_every_n_years',
        lunar_calendar_every_year: 'repeating.detail_every_n_years',
      }
      parts.push(t(intervalKeys[opt.optionType], { n: opt.interval }))
    }

    if (value.end != null) {
      parts.push(t('repeating.detail_until_date', { date: formatDate(value.end) }))
    } else if (value.end_count != null) {
      parts.push(t('repeating.detail_n_times', { n: value.end_count }))
    }

    return parts.join(' · ')
  }

  const detail = detailText()

  return (
    <div className="inline-flex items-center gap-3">
      <div className="relative" ref={rootRef}>
        <button
          type="button"
          aria-label={t('repeating.enabled')}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          {shortLabel}
          <ChevronDown size={14} aria-hidden="true" />
        </button>

        {open && (
          <div
            role="menu"
            className="absolute left-0 z-10 mt-1 min-w-[180px] rounded-md border border-gray-200 bg-white py-1 shadow-md dark:bg-gray-800 dark:border-gray-700"
          >
            {SELECTABLE_TYPES.map(type => (
              <button
                key={type}
                type="button"
                role="menuitem"
                onClick={() => handleSelect(type)}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  type === selectedType ? 'font-medium text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'
                }`}
              >
                {type === 'none' ? t('repeating.not_repeat') : t(TYPE_LABEL_KEY[type])}
              </button>
            ))}
          </div>
        )}
      </div>

      {detail && (
        <span className="text-sm text-gray-500 dark:text-gray-400">{detail}</span>
      )}
    </div>
  )
}
