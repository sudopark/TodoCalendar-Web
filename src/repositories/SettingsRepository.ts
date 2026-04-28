import { useSettingsCache } from './caches/settingsCache'
import type {
  CalendarAppearance,
  EventDefaults,
  TimezoneSetting,
  NotificationSetting,
} from './caches/settingsCache'

export type { CalendarAppearance, EventDefaults, TimezoneSetting, NotificationSetting }

export class SettingsRepository {
  // ── CalendarAppearance ──────────────────────────────────────────────

  updateCalendarAppearance(patch: Partial<CalendarAppearance>): void {
    useSettingsCache.getState().setAppearance(patch)
  }

  resetCalendarAppearanceToDefaults(): void {
    useSettingsCache.getState().resetAppearanceToDefaults()
  }

  getCalendarAppearanceSnapshot(): CalendarAppearance {
    return useSettingsCache.getState().calendarAppearance
  }

  // ── EventDefaults ────────────────────────────────────────────────────

  updateEventDefaults(patch: Partial<EventDefaults>): void {
    useSettingsCache.getState().setEventDefaults(patch)
  }

  getEventDefaultsSnapshot(): EventDefaults {
    return useSettingsCache.getState().eventDefaults
  }

  // ── Timezone ─────────────────────────────────────────────────────────

  updateTimezone(tz: string | null): void {
    useSettingsCache.getState().setTimezone(tz)
  }

  getTimezoneSnapshot(): TimezoneSetting {
    return useSettingsCache.getState().timezone
  }

  // ── Notification ──────────────────────────────────────────────────────

  async requestNotificationPermission(): Promise<void> {
    await useSettingsCache.getState().requestNotificationPermission()
  }

  getNotificationSnapshot(): NotificationSetting {
    return useSettingsCache.getState().notification
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────

  reset(): void {
    useSettingsCache.getState().reset()
  }
}
