import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import type { NotificationOption } from '../../models'

// --- Presets ---

const TIME_PRESETS: Array<{ key: string; seconds: number }> = [
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
]

const ALLDAY_PRESETS: Array<{ key: string; dayOffset: number; hour: number; minute: number }> = [
  { key: 'notif.allday_same_day_9am', dayOffset: 0, hour: 9, minute: 0 },
  { key: 'notif.allday_same_day_noon', dayOffset: 0, hour: 12, minute: 0 },
  { key: 'notif.allday_1day_before_9am', dayOffset: -1, hour: 9, minute: 0 },
  { key: 'notif.allday_2day_before_9am', dayOffset: -2, hour: 9, minute: 0 },
  { key: 'notif.allday_1week_before_9am', dayOffset: -7, hour: 9, minute: 0 },
]

// --- Helpers ---

function matchesTimePreset(option: NotificationOption, seconds: number): boolean {
  return option.type === 'time' && option.seconds === seconds
}

function matchesAlldayPreset(
  option: NotificationOption,
  dayOffset: number,
  hour: number,
  minute: number,
): boolean {
  return (
    option.type === 'allday' &&
    option.dayOffset === dayOffset &&
    option.hour === hour &&
    option.minute === minute
  )
}

function isTimePresetSelected(notifications: NotificationOption[], seconds: number): boolean {
  return notifications.some(n => matchesTimePreset(n, seconds))
}

function isAlldayPresetSelected(
  notifications: NotificationOption[],
  dayOffset: number,
  hour: number,
  minute: number,
): boolean {
  return notifications.some(n => matchesAlldayPreset(n, dayOffset, hour, minute))
}

function toggleTimePreset(notifications: NotificationOption[], seconds: number): NotificationOption[] {
  if (isTimePresetSelected(notifications, seconds)) {
    return notifications.filter(n => !matchesTimePreset(n, seconds))
  }
  return [...notifications, { type: 'time', seconds }]
}

function toggleAlldayPreset(
  notifications: NotificationOption[],
  dayOffset: number,
  hour: number,
  minute: number,
): NotificationOption[] {
  if (isAlldayPresetSelected(notifications, dayOffset, hour, minute)) {
    return notifications.filter(n => !matchesAlldayPreset(n, dayOffset, hour, minute))
  }
  return [...notifications, { type: 'allday', dayOffset, hour, minute }]
}

// --- Component ---

interface NotificationPickerCoreProps {
  value: NotificationOption[]
  onChange: (v: NotificationOption[]) => void
  isAllDay: boolean
  /** 시간 설정이 아직 안 된 경우 비활성 */
  disabled?: boolean
}

export function NotificationPickerCore({ value, onChange, isAllDay, disabled = false }: NotificationPickerCoreProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const count = value.length
  const triggerLabel = count === 0
    ? t('event.notification', '알림') + ' 없음'
    : t('event.notification', '알림') + ` ${count}개`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            className="h-7 gap-1.5 px-2 text-xs"
            aria-label={triggerLabel}
          />
        }
      >
        {triggerLabel}
      </PopoverTrigger>

      <PopoverContent className="w-52 p-2" side="bottom" align="start">
        <div className="flex flex-col gap-1">
          {isAllDay
            ? ALLDAY_PRESETS.map(preset => {
                const checked = isAlldayPresetSelected(value, preset.dayOffset, preset.hour, preset.minute)
                const id = `notif-allday-${preset.key}`
                return (
                  <div key={preset.key} className="flex items-center gap-2 py-0.5">
                    <Checkbox
                      id={id}
                      checked={checked}
                      onCheckedChange={() =>
                        onChange(toggleAlldayPreset(value, preset.dayOffset, preset.hour, preset.minute))
                      }
                    />
                    <Label htmlFor={id} className="cursor-pointer text-xs font-normal">
                      {t(preset.key)}
                    </Label>
                  </div>
                )
              })
            : TIME_PRESETS.map(preset => {
                const checked = isTimePresetSelected(value, preset.seconds)
                const id = `notif-time-${preset.key}`
                return (
                  <div key={preset.key} className="flex items-center gap-2 py-0.5">
                    <Checkbox
                      id={id}
                      checked={checked}
                      onCheckedChange={() =>
                        onChange(toggleTimePreset(value, preset.seconds))
                      }
                    />
                    <Label htmlFor={id} className="cursor-pointer text-xs font-normal">
                      {t(preset.key)}
                    </Label>
                  </div>
                )
              })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
