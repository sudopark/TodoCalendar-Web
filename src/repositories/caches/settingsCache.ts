/**
 * @internal repositories 모듈 내부에서만 사용. 외부 import 금지.
 * SettingsRepository 클래스를 통해서만 노출한다.
 */
import { create } from 'zustand'

// ── CalendarAppearance ─────────────────────────────────────────────────────

export type EventDisplayLevel = 'minimal' | 'medium' | 'full'
export type WeekStartDay = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface AccentDays {
  holiday: boolean
  saturday: boolean
  sunday: boolean
}

export interface CalendarAppearance {
  weekStartDay: WeekStartDay
  accentDays: AccentDays
  eventDisplayLevel: EventDisplayLevel
  rowHeight: number
  eventFontSizeWeight: number
  showEventNames: boolean
  eventListFontSizeWeight: number
  showHolidayInEventList: boolean
  showLunarCalendar: boolean
  showUncompletedTodos: boolean
}

// ── EventDefaults ──────────────────────────────────────────────────────────

export interface EventDefaults {
  defaultTagId: string | null
  defaultNotificationSeconds: number | null
  defaultAllDayNotificationSeconds: number | null
}

// ── TimezoneSetting ────────────────────────────────────────────────────────

export interface TimezoneSetting {
  timezone: string
  systemTimezone: string
  isCustom: boolean
}

// ── NotificationSetting ────────────────────────────────────────────────────

export interface NotificationSetting {
  permission: NotificationPermission
  fcmToken: string | null
}

// ── Storage keys ───────────────────────────────────────────────────────────

const APPEARANCE_KEY = 'calendar_appearance'
const EVENT_DEFAULTS_KEY = 'event_defaults'
const TIMEZONE_KEY = 'custom_timezone'

// ── Default values ─────────────────────────────────────────────────────────

const APPEARANCE_DEFAULTS: CalendarAppearance = {
  weekStartDay: 0,
  accentDays: { holiday: true, saturday: false, sunday: true },
  eventDisplayLevel: 'medium',
  rowHeight: 70,
  eventFontSizeWeight: 0,
  showEventNames: true,
  eventListFontSizeWeight: 0,
  showHolidayInEventList: true,
  showLunarCalendar: false,
  showUncompletedTodos: true,
}

const EVENT_DEFAULTS_DEFAULTS: EventDefaults = {
  defaultTagId: null,
  defaultNotificationSeconds: null,
  defaultAllDayNotificationSeconds: null,
}

// ── localStorage loaders ────────────────────────────────────────────────────

function loadAppearance(): CalendarAppearance {
  try {
    const stored = localStorage.getItem(APPEARANCE_KEY)
    if (!stored) return APPEARANCE_DEFAULTS
    return { ...APPEARANCE_DEFAULTS, ...JSON.parse(stored) }
  } catch {
    return APPEARANCE_DEFAULTS
  }
}

function loadEventDefaults(): EventDefaults {
  try {
    const stored = localStorage.getItem(EVENT_DEFAULTS_KEY)
    return stored ? { ...EVENT_DEFAULTS_DEFAULTS, ...JSON.parse(stored) } : EVENT_DEFAULTS_DEFAULTS
  } catch {
    return EVENT_DEFAULTS_DEFAULTS
  }
}

// Note: systemTz is computed at module load time. If the user changes their OS timezone
// while the app is open, this value will be stale until page refresh.
const systemTz = Intl.DateTimeFormat().resolvedOptions().timeZone

function loadTimezone(): TimezoneSetting {
  try {
    const stored = localStorage.getItem(TIMEZONE_KEY)
    return stored
      ? { timezone: stored, systemTimezone: systemTz, isCustom: true }
      : { timezone: systemTz, systemTimezone: systemTz, isCustom: false }
  } catch {
    return { timezone: systemTz, systemTimezone: systemTz, isCustom: false }
  }
}

function loadNotification(): NotificationSetting {
  return {
    permission: typeof Notification !== 'undefined' ? Notification.permission : 'default',
    fcmToken: null,
  }
}

// ── Unified settings state ─────────────────────────────────────────────────

export interface SettingsState {
  calendarAppearance: CalendarAppearance
  eventDefaults: EventDefaults
  timezone: TimezoneSetting
  notification: NotificationSetting

  // calendarAppearance mutations
  setAppearance: (updates: Partial<CalendarAppearance>) => void
  resetAppearanceToDefaults: () => void

  // eventDefaults mutations
  setEventDefaults: (updates: Partial<EventDefaults>) => void

  // timezone mutations
  setTimezone: (tz: string | null) => void

  // notification mutations
  setNotificationPermission: (permission: NotificationPermission) => void
  setFcmToken: (token: string) => void
  requestNotificationPermission: () => Promise<void>

  // lifecycle
  reset: () => void
}

export const useSettingsCache = create<SettingsState>((set, get) => ({
  calendarAppearance: loadAppearance(),
  eventDefaults: loadEventDefaults(),
  timezone: loadTimezone(),
  notification: loadNotification(),

  setAppearance: (updates) => {
    const next = { ...get().calendarAppearance, ...updates }
    const persistable: CalendarAppearance = {
      weekStartDay: next.weekStartDay,
      accentDays: next.accentDays,
      eventDisplayLevel: next.eventDisplayLevel,
      rowHeight: next.rowHeight,
      eventFontSizeWeight: next.eventFontSizeWeight,
      showEventNames: next.showEventNames,
      eventListFontSizeWeight: next.eventListFontSizeWeight,
      showHolidayInEventList: next.showHolidayInEventList,
      showLunarCalendar: next.showLunarCalendar,
      showUncompletedTodos: next.showUncompletedTodos,
    }
    try {
      localStorage.setItem(APPEARANCE_KEY, JSON.stringify(persistable))
    } catch {
      // quota / private mode
    }
    set({ calendarAppearance: next })
  },

  resetAppearanceToDefaults: () => {
    localStorage.removeItem(APPEARANCE_KEY)
    set({ calendarAppearance: APPEARANCE_DEFAULTS })
  },

  setEventDefaults: (updates) => {
    const next = { ...get().eventDefaults, ...updates }
    try {
      localStorage.setItem(EVENT_DEFAULTS_KEY, JSON.stringify({
        defaultTagId: next.defaultTagId,
        defaultNotificationSeconds: next.defaultNotificationSeconds,
        defaultAllDayNotificationSeconds: next.defaultAllDayNotificationSeconds,
      }))
    } catch {
      // quota / private mode
    }
    set({ eventDefaults: next })
  },

  setTimezone: (tz) => {
    if (tz) {
      localStorage.setItem(TIMEZONE_KEY, tz)
      set({ timezone: { timezone: tz, systemTimezone: systemTz, isCustom: true } })
    } else {
      localStorage.removeItem(TIMEZONE_KEY)
      set({ timezone: { timezone: systemTz, systemTimezone: systemTz, isCustom: false } })
    }
  },

  setNotificationPermission: (permission) => {
    set(s => ({ notification: { ...s.notification, permission } }))
  },

  setFcmToken: (token) => {
    set(s => ({ notification: { ...s.notification, fcmToken: token } }))
  },

  requestNotificationPermission: async () => {
    try {
      const permission = await Notification.requestPermission()
      set(s => ({ notification: { ...s.notification, permission } }))

      if (permission === 'granted') {
        const { getMessaging, getToken } = await import('firebase/messaging')
        const { app } = await import('../../firebase')
        const messaging = getMessaging(app)
        const token = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        })
        set(s => ({ notification: { ...s.notification, fcmToken: token } }))

        const { apiClient } = await import('../../api/apiClient')
        await apiClient.put('/v1/user/notification', { fcm_token: token }).catch(() => {})
      }
    } catch (e) {
      console.warn('알림 권한 요청 실패:', e)
    }
  },

  reset: () => {
    set({
      notification: loadNotification(),
    })
  },
}))
