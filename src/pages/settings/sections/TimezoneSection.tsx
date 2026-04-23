import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useTimezoneStore } from '../../../stores/timezoneStore'

export function TimezoneSection() {
  const { t } = useTranslation()
  const { timezone, isCustom, setTimezone } = useTimezoneStore()

  const timezones = useMemo(() => [
    { label: t('settings.timezone_system'), value: '' },
    { label: 'Asia/Seoul (KST)', value: 'Asia/Seoul' },
    { label: 'Asia/Tokyo (JST)', value: 'Asia/Tokyo' },
    { label: 'America/New_York (EST)', value: 'America/New_York' },
    { label: 'America/Los_Angeles (PST)', value: 'America/Los_Angeles' },
    { label: 'Europe/London (GMT)', value: 'Europe/London' },
    { label: 'Europe/Berlin (CET)', value: 'Europe/Berlin' },
    { label: 'UTC', value: 'UTC' },
  ], [t])

  return (
    <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm space-y-3">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('settings.timezone')}</h2>
      <select
        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
        value={isCustom ? timezone : ''}
        onChange={e => setTimezone(e.target.value || null)}
      >
        {timezones.map(tz => (
          <option key={tz.value} value={tz.value}>{tz.label}</option>
        ))}
      </select>
      <p className="text-xs text-gray-400 dark:text-gray-500">
        {t('settings.current_tz', { tz: timezone })}
      </p>
    </section>
  )
}
