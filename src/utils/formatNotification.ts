import type { TFunction } from 'i18next'
import type { NotificationOption } from '../models'

const TIME_PRESET_KEYS: { key: string; seconds: number }[] = [
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

const ALLDAY_PRESET_KEYS: { key: string; dayOffset: number; hour: number; minute: number }[] = [
  { key: 'notif.allday_same_day_9am', dayOffset: 0, hour: 9, minute: 0 },
  { key: 'notif.allday_same_day_noon', dayOffset: 0, hour: 12, minute: 0 },
  { key: 'notif.allday_1day_before_9am', dayOffset: -1, hour: 9, minute: 0 },
  { key: 'notif.allday_2day_before_9am', dayOffset: -2, hour: 9, minute: 0 },
  { key: 'notif.allday_1week_before_9am', dayOffset: -7, hour: 9, minute: 0 },
]

export function formatNotification(option: NotificationOption, t: TFunction): string {
  if (option.type === 'time') {
    const preset = TIME_PRESET_KEYS.find(p => p.seconds === option.seconds)
    return preset ? t(preset.key) : `${Math.abs(option.seconds)}초 전`
  }
  const preset = ALLDAY_PRESET_KEYS.find(
    p => p.dayOffset === option.dayOffset && p.hour === option.hour && p.minute === option.minute,
  )
  return preset
    ? t(preset.key)
    : `${Math.abs(option.dayOffset)}일 전 ${option.hour}:${String(option.minute).padStart(2, '0')}`
}
