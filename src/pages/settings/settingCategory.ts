export type SettingCategoryId =
  | 'appearance'
  | 'editEvent'
  | 'holiday'
  | 'timezone'
  | 'language'
  | 'notification'
  | 'googleCalendar'
  | 'account'

export interface SettingCategory {
  readonly id: SettingCategoryId
  readonly labelKey: string
}

export const SETTING_CATEGORIES: readonly SettingCategory[] = [
  { id: 'appearance', labelKey: 'settings.menu.appearance' },
  { id: 'editEvent', labelKey: 'settings.menu.edit_event' },
  { id: 'holiday', labelKey: 'settings.menu.holiday' },
  { id: 'timezone', labelKey: 'settings.menu.timezone' },
  { id: 'language', labelKey: 'settings.menu.language' },
  { id: 'notification', labelKey: 'settings.menu.notification' },
  { id: 'googleCalendar', labelKey: 'settings.menu.google_calendar' },
  { id: 'account', labelKey: 'settings.menu.account' },
]

export const DEFAULT_SETTING_CATEGORY: SettingCategoryId = SETTING_CATEGORIES[0].id

export function isSettingCategoryId(value: unknown): value is SettingCategoryId {
  return typeof value === 'string' && SETTING_CATEGORIES.some(c => c.id === value)
}

export function findSettingCategory(id: string | undefined): SettingCategory | undefined {
  return SETTING_CATEGORIES.find(c => c.id === id)
}
