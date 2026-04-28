import { useCallback } from 'react'
import { useRepositories } from '../../composition/RepositoriesProvider'
import { useAuthStore } from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'
import { useSettingsCache } from '../../repositories/caches/settingsCache'
import { useHolidayCache } from '../../repositories/caches/holidayCache'
import { useEventTagListCache } from '../../repositories/caches/eventTagListCache'
import type {
  CalendarAppearance,
  EventDefaults,
  TimezoneSetting,
  NotificationSetting,
} from '../../repositories/caches/settingsCache'
import type { HolidayCountry } from '../../repositories/caches/holidayCache'
import type { Account } from '../../stores/authStore'
import type { DefaultTagColors, EventTag } from '../../models'

// MARK: - Interface

export interface SettingsViewModel {
  // ── appearance ─────────────────────────────────────────────────────────────
  theme: 'system' | 'light' | 'dark'
  setTheme: (theme: 'system' | 'light' | 'dark') => void
  calendarAppearance: CalendarAppearance
  setAppearance: (updates: Partial<CalendarAppearance>) => void
  resetAppearanceToDefaults: () => void

  // ── tags (used by AppearanceSection + EditEventSection + DefaultTagPickerPanel) ──
  tags: Map<string, EventTag>
  defaultTagColors: DefaultTagColors | null

  // ── holiday ────────────────────────────────────────────────────────────────
  country: HolidayCountry
  availableCountries: HolidayCountry[]
  availableCountriesLoaded: boolean
  fetchAvailableCountries: () => Promise<void>
  setCountry: (country: HolidayCountry) => void

  // ── timezone ───────────────────────────────────────────────────────────────
  timezone: TimezoneSetting
  setTimezone: (tz: string | null) => void

  // ── editEvent ──────────────────────────────────────────────────────────────
  eventDefaults: EventDefaults
  setEventDefaults: (updates: Partial<EventDefaults>) => void

  // ── notification ───────────────────────────────────────────────────────────
  notification: NotificationSetting
  requestNotificationPermission: () => Promise<void>

  // ── account ────────────────────────────────────────────────────────────────
  account: Account | null
  signOut: () => Promise<void>
}

// MARK: - Hook

export function useSettingsViewModel(): SettingsViewModel {
  const { authRepo } = useRepositories()

  // ── theme ──────────────────────────────────────────────────────────────────
  const theme = useThemeStore(s => s.theme)
  const setTheme = useThemeStore(s => s.setTheme)

  // ── calendarAppearance ─────────────────────────────────────────────────────
  const calendarAppearance = useSettingsCache(s => s.calendarAppearance)
  const setAppearance = useSettingsCache(s => s.setAppearance)
  const resetAppearanceToDefaults = useSettingsCache(s => s.resetAppearanceToDefaults)

  // ── eventDefaults ──────────────────────────────────────────────────────────
  const eventDefaults = useSettingsCache(s => s.eventDefaults)
  const setEventDefaults = useSettingsCache(s => s.setEventDefaults)

  // ── timezone ───────────────────────────────────────────────────────────────
  const timezone = useSettingsCache(s => s.timezone)
  const setTimezone = useSettingsCache(s => s.setTimezone)

  // ── notification ───────────────────────────────────────────────────────────
  const notification = useSettingsCache(s => s.notification)
  const requestNotificationPermission = useSettingsCache(s => s.requestNotificationPermission)

  // ── holiday ────────────────────────────────────────────────────────────────
  const country = useHolidayCache(s => s.country)
  const availableCountries = useHolidayCache(s => s.availableCountries)
  const availableCountriesLoaded = useHolidayCache(s => s.availableCountriesLoaded)
  const fetchAvailableCountries = useHolidayCache(s => s.fetchAvailableCountries)
  const setCountry = useHolidayCache(s => s.setCountry)

  // ── tags ───────────────────────────────────────────────────────────────────
  const tags = useEventTagListCache(s => s.tags)
  const defaultTagColors = useEventTagListCache(s => s.defaultTagColors)

  // ── account ────────────────────────────────────────────────────────────────
  const account = useAuthStore(s => s.account)

  const signOut = useCallback(() => authRepo.signOut(), [authRepo])

  return {
    theme,
    setTheme,
    calendarAppearance,
    setAppearance,
    resetAppearanceToDefaults,
    tags,
    defaultTagColors,
    country,
    availableCountries,
    availableCountriesLoaded,
    fetchAvailableCountries,
    setCountry,
    timezone,
    setTimezone,
    eventDefaults,
    setEventDefaults,
    notification,
    requestNotificationPermission,
    account,
    signOut,
  }
}
