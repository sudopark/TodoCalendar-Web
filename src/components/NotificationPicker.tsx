import { useTranslation } from 'react-i18next'
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

interface NotificationPickerProps {
  value: NotificationOption[]
  onChange: (options: NotificationOption[]) => void
  isAllDay: boolean
}

function matchesTimePreset(opt: NotificationOption, seconds: number): boolean {
  return opt.type === 'time' && opt.seconds === seconds
}

function matchesAllDayPreset(opt: NotificationOption, dayOffset: number, hour: number, minute: number): boolean {
  return opt.type === 'allday' && opt.dayOffset === dayOffset && opt.hour === hour && opt.minute === minute
}

export function NotificationPicker({ value, onChange, isAllDay }: NotificationPickerProps) {
  const { t } = useTranslation()

  if (isAllDay) {
    return (
      <div className="space-y-1">
        {ALLDAY_PRESET_KEYS.map((preset, i) => {
          const selected = value.some(v => matchesAllDayPreset(v, preset.dayOffset, preset.hour, preset.minute))
          return (
            <label key={i} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={selected}
                onChange={() => {
                  if (selected) {
                    onChange(value.filter(v => !matchesAllDayPreset(v, preset.dayOffset, preset.hour, preset.minute)))
                  } else {
                    onChange([...value, { type: 'allday', dayOffset: preset.dayOffset, hour: preset.hour, minute: preset.minute }])
                  }
                }}
                className="h-4 w-4 rounded border-gray-300"
              />
              {t(preset.key)}
            </label>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {TIME_PRESET_KEYS.map((preset, i) => {
        const selected = value.some(v => matchesTimePreset(v, preset.seconds))
        return (
          <label key={i} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => {
                if (selected) {
                  onChange(value.filter(v => !matchesTimePreset(v, preset.seconds)))
                } else {
                  onChange([...value, { type: 'time', seconds: preset.seconds }])
                }
              }}
              className="h-4 w-4 rounded border-gray-300"
            />
            {t(preset.key)}
          </label>
        )
      })}
    </div>
  )
}
