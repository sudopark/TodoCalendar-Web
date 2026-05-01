import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, X } from 'lucide-react'
import type { NotificationOption } from '../models'

const TIME_PRESET_KEYS = [
  { key: 'notif.on_time', seconds: 0 },
  { key: 'notif.1min_before', seconds: -60 },
  { key: 'notif.5min_before', seconds: -300 },
  { key: 'notif.10min_before', seconds: -600 },
  { key: 'notif.15min_before', seconds: -900 },
  { key: 'notif.30min_before', seconds: -1800 },
  { key: 'notif.1hour_before', seconds: -3600 },
  { key: 'notif.2hour_before', seconds: -7200 },
  { key: 'notif.1day_before', seconds: -86400 },
  { key: 'notif.2day_before', seconds: -172800 },
  { key: 'notif.1week_before', seconds: -604800 },
] as const

const ALLDAY_PRESET_KEYS = [
  { key: 'notif.allday_same_day_9am', dayOffset: 0, hour: 9, minute: 0 },
  { key: 'notif.allday_same_day_noon', dayOffset: 0, hour: 12, minute: 0 },
  { key: 'notif.allday_1day_before_9am', dayOffset: -1, hour: 9, minute: 0 },
  { key: 'notif.allday_2day_before_9am', dayOffset: -2, hour: 9, minute: 0 },
  { key: 'notif.allday_1week_before_9am', dayOffset: -7, hour: 9, minute: 0 },
] as const

type TimePreset = (typeof TIME_PRESET_KEYS)[number]
type AllDayPreset = (typeof ALLDAY_PRESET_KEYS)[number]

interface NotificationPickerProps {
  value: NotificationOption[]
  onChange: (options: NotificationOption[]) => void
  isAllDay: boolean
}

function matchTimePreset(opt: NotificationOption, p: TimePreset): boolean {
  return opt.type === 'time' && opt.seconds === p.seconds
}

function matchAllDayPreset(opt: NotificationOption, p: AllDayPreset): boolean {
  return opt.type === 'allday' && opt.dayOffset === p.dayOffset && opt.hour === p.hour && opt.minute === p.minute
}

export function NotificationPicker({ value, onChange, isAllDay }: NotificationPickerProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
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

  function optionLabel(opt: NotificationOption): string {
    if (opt.type === 'time') {
      const p = TIME_PRESET_KEYS.find(x => matchTimePreset(opt, x))
      return p ? t(p.key) : `${opt.seconds}s`
    }
    const p = ALLDAY_PRESET_KEYS.find(x => matchAllDayPreset(opt, x))
    return p ? t(p.key) : 'custom'
  }

  function removeAt(idx: number) {
    onChange(value.filter((_, i) => i !== idx))
  }

  function addTimePreset(p: TimePreset) {
    onChange([...value, { type: 'time', seconds: p.seconds }])
    setOpen(false)
  }

  function addAllDayPreset(p: AllDayPreset) {
    onChange([...value, { type: 'allday', dayOffset: p.dayOffset, hour: p.hour, minute: p.minute }])
    setOpen(false)
  }

  const availableTime = TIME_PRESET_KEYS.filter(p => !value.some(v => matchTimePreset(v, p)))
  const availableAllDay = ALLDAY_PRESET_KEYS.filter(p => !value.some(v => matchAllDayPreset(v, p)))
  const hasAvailable = isAllDay ? availableAllDay.length > 0 : availableTime.length > 0

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((opt, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full bg-surface-sunken px-3 py-1 text-sm text-fg-secondary"
            >
              {optionLabel(opt)}
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label={t('notif.remove')}
                className="ml-1 rounded-full p-0.5 hover:bg-surface-sunken"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="inline-flex items-center gap-1 rounded-md border border-dashed border-line-strong bg-surface px-3 py-1.5 text-sm text-fg-secondary hover:bg-surface-elevated"
        >
          <Plus size={14} aria-hidden="true" />
          {t('notif.add_button')}
        </button>

        {open && (
          <div
            role="listbox"
            className="absolute left-0 z-10 mt-1 min-w-[220px] max-h-64 overflow-auto rounded-md border border-line bg-surface-elevated py-1 shadow-md"
          >
            {!hasAvailable && (
              <div className="px-3 py-2 text-sm text-fg-tertiary">{t('notif.no_more_options')}</div>
            )}
            {isAllDay
              ? availableAllDay.map(p => (
                  <button
                    key={p.key}
                    type="button"
                    role="option"
                    onClick={() => addAllDayPreset(p)}
                    className="block w-full px-3 py-2 text-left text-sm text-fg-secondary hover:bg-surface-sunken"
                  >
                    {t(p.key)}
                  </button>
                ))
              : availableTime.map(p => (
                  <button
                    key={p.key}
                    type="button"
                    role="option"
                    onClick={() => addTimePreset(p)}
                    className="block w-full px-3 py-2 text-left text-sm text-fg-secondary hover:bg-surface-sunken"
                  >
                    {t(p.key)}
                  </button>
                ))}
          </div>
        )}
      </div>
    </div>
  )
}
